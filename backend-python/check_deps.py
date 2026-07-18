import sys
import os

# Add parent directory to path to simulate PYTHONPATH=.;..
sys.path.append(os.getcwd())
sys.path.append(os.path.dirname(os.getcwd()))

print("--- Dependency Check ---")
try:
    import aiohttp
    print(f"aiohttp: OK ({aiohttp.__version__})")
except ImportError:
    print("aiohttp: MISSING")

try:
    import GPUtil
    print("GPUtil: OK")
except ImportError:
    print("GPUtil: MISSING")

print("\n--- AI Engine Import Check ---")
try:
    from ai_engine.model_manager import ModelManager
    from ai_engine.cache import AICache
    from ai_engine.code_generator import LeetCodeGenerator, ProductionGenerator, EducationalGenerator
    from ai_engine.problem_solver import LeetCodeSolver
    from ai_engine.optimizer import CodeOptimizer
    from ai_engine.comparison import SolutionComparator
    print("AI Engine Modules: OK (All imported successfully)")
except ImportError as e:
    print(f"AI Engine Modules: FAILED ({e})")
except Exception as e:
    print(f"AI Engine Modules: ERROR ({e})")

print("\n--- Resource Check ---")
import psutil
print(f"RAM Available: {psutil.virtual_memory().available / (1024**3):.2f} GB")
if 'GPUtil' in sys.modules:
    try:
        gpus = GPUtil.getGPUs()
        print(f"GPUs detected: {len(gpus)}")
    except:
        print("GPU detection failed (might be no GPU driver)")
