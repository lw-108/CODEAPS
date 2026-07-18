use anyhow::Result;
use wasmtime::*;
use wasmtime_wasi::preview1::{self, WasiP1Ctx};
use wasmtime_wasi::WasiCtxBuilder;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

/// Data shared between the IDE (Host) and the Plugin (Guest).
pub struct HostState {
    pub wasi: WasiP1Ctx,
    pub active_content: String,
    pub plugin_name: String,
}

#[derive(Clone)]
pub struct PluginManager {
    engine: Engine,
    linker: Arc<Linker<HostState>>,
    pub plugins: Arc<Mutex<HashMap<String, Plugin>>>,
}

pub struct Plugin {
    pub _name: String,
    pub _module: Module,
    pub store: Arc<Mutex<Store<HostState>>>,
    pub instance: Instance,
}

impl PluginManager {
    pub fn new() -> Result<Self> {
        let mut config = Config::new();
        config.async_support(false); // Using sync for simplicity in first architectural draft

        let engine = Engine::new(&config)?;
        let mut linker = Linker::new(&engine);
        
        // ── WASI Integration (Modern Wasmtime v29 API) ──
        // This registers 'wasi_snapshot_preview1' exports to the linker
        preview1::add_to_linker_sync(&mut linker, |s: &mut HostState| &mut s.wasi)?;

        // ── CodeAps Host API (IDE Bridge) ──
        
        // host.log(msg: String)
        linker.func_wrap("codeaps", "log", |mut caller: Caller<'_, HostState>, ptr: u32, len: u32| {
            let mem = match caller.get_export("memory") {
                Some(Extern::Memory(m)) => m,
                _ => return Err(anyhow::anyhow!("Failed to find host memory")),
            };
            let data = mem.data(&caller)
                .get(ptr as usize..(ptr + len) as usize)
                .ok_or_else(|| anyhow::anyhow!("Invalid log pointer"))?;
            let msg = std::str::from_utf8(data).unwrap_or("Invalid UTF-8");
            println!("[Plugin:{}] {}", caller.data().plugin_name, msg);
            Ok(())
        })?;

        // host.get_content() -> buffer
        linker.func_wrap("codeaps", "get_content_len", |caller: Caller<'_, HostState>| {
            caller.data().active_content.len() as u32
        })?;

        linker.func_wrap("codeaps", "copy_content", |mut caller: Caller<'_, HostState>, ptr: u32| {
            let content = caller.data().active_content.clone();
            let mem = match caller.get_export("memory") {
                Some(Extern::Memory(m)) => m,
                _ => return Err(anyhow::anyhow!("Failed to find host memory")),
            };
            mem.write(&mut caller, ptr as usize, content.as_bytes())
                .map_err(|e| anyhow::anyhow!("Failed to write to guest memory: {}", e))
        })?;

        Ok(Self {
            engine,
            linker: Arc::new(linker),
            plugins: Arc::new(Mutex::new(HashMap::new())),
        })
    }

    pub fn load_plugin(&self, name: &str, wasm_bytes: &[u8], current_code: String) -> Result<()> {
        let mut store = Store::new(
            &self.engine, 
            HostState {
                wasi: WasiCtxBuilder::new()
                    .inherit_stdout()
                    .inherit_stderr()
                    .build_p1(),
                active_content: current_code,
                plugin_name: name.to_string(),
            }
        );

        let module = Module::from_binary(&self.engine, wasm_bytes)?;
        let instance = self.linker.instantiate(&mut store, &module)?;

        let plugin = Plugin {
            _name: name.to_string(),
            _module: module,
            store: Arc::new(Mutex::new(store)),
            instance,
        };

        self.plugins.lock().unwrap().insert(name.to_string(), plugin);
        Ok(())
    }

    pub fn call_hook(&self, name: &str, hook: &str) -> Result<String> {
        let mut plugins = self.plugins.lock().unwrap();
        let plugin = plugins.get_mut(name).ok_or_else(|| anyhow::anyhow!("Plugin not found"))?;
        let mut store = plugin.store.lock().unwrap();

        let func = plugin.instance.get_typed_func::<(), ()>(&mut *store, hook)?;
        func.call(&mut *store, ())?;

        Ok(format!("Hook '{}' executed successfully in plugin '{}'", hook, name))
    }
}
