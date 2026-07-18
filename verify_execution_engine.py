import asyncio
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_path = os.path.abspath("backend-python")
sys.path.append(backend_path)
os.chdir("backend-python")

from app.services.execution_service import ExecutionService

async def verify_engine():
    service = ExecutionService()
    print("--- 🔬 CodeAps Execution Engine Verification ---")
    
    # 1. Test Filename Sanitization
    unsafe_name = "../../../etc/passwd.py"
    safe_name = service._sanitize_filename(unsafe_name)
    print(f"1. Sanitization: '{unsafe_name}' -> '{safe_name}'")
    if safe_name == "passwd.py": print("✅ PASSED")
    else: print("❌ FAILED")

    # 2. Setup Test File
    test_dir = Path("storage/test_runs")
    test_dir.mkdir(parents=True, exist_ok=True)
    
    # A. Tiny Output Test
    script_a = test_dir / "hello.py"
    with open(script_a, 'w') as f:
        f.write("print('Hello from CodeAps!')")
    
    res_a = await service.execute(script_a, "python")
    print(f"2a. Tiny Output: {res_a.get('stdout', '').strip()}")
    if "Hello from CodeAps" in res_a.get('stdout', ''): print("✅ PASSED")
    else: print("❌ FAILED")

    # B. Huge Output Truncation Test
    script_b = test_dir / "flood.py"
    with open(script_b, 'w') as f:
        f.write("import sys; print('A' * 2000000)") # 2MB
    
    res_b = await service.execute(script_b, "python")
    print(f"2b. Truncation Test (Size: {len(res_b.get('stdout', ''))} bytes)")
    if len(res_b.get('stdout', '')) <= (1024 * 1024 + 100) and "[Output Truncated]" in res_b.get('stdout', ''): 
        print("✅ PASSED")
    else: 
        print("❌ FAILED")

    # C. Runtime Error + AI Debug Loop Test
    script_c = test_dir / "error.py"
    with open(script_c, 'w') as f:
        f.write("x = 1 / 0")
    
    print("2c. Runtime Error + AI Debug (This may take a few seconds)...")
    res_c = await service.execute(script_c, "python")
    print(f"    Exit Code: {res_c.get('exit_code')}")
    print(f"    Error Type: {res_c.get('error_type')}")
    print(f"    AI Explanation: {res_c.get('error_explanation', 'MISSING')[:100]}...")
    if res_c.get("error_type") == "runtime_error" and "error_explanation" in res_c:
        print("✅ PASSED")
    else:
        print("❌ FAILED")

if __name__ == "__main__":
    # Setup paths for local import
    import sys
    sys.path.append(os.getcwd())
    asyncio.run(verify_engine())
