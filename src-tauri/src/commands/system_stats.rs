use sysinfo::System;
use serde::Serialize;
use std::sync::Mutex;
use lazy_static::lazy_static;

lazy_static! {
    static ref SYSTEM: Mutex<System> = Mutex::new(System::new_all());
}

#[derive(Serialize)]
pub struct SystemStats {
    pub cpu_usage: f32,
    pub memory_used: u64,
    pub memory_total: u64,
    pub memory_percentage: f32,
}

#[tauri::command]
pub fn get_system_stats() -> SystemStats {
    let mut sys = SYSTEM.lock().unwrap();
    
    // Refresh only what we need for performance
    sys.refresh_cpu();
    sys.refresh_memory();

    let cpu_usage = sys.global_cpu_info().cpu_usage();
    let memory_used = sys.used_memory();
    let memory_total = sys.total_memory();
    let memory_percentage = (memory_used as f32 / memory_total as f32) * 100.0;

    SystemStats {
        cpu_usage,
        memory_used,
        memory_total,
        memory_percentage,
    }
}
