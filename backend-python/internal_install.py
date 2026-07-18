import pip
import sys

def install(package):
    if hasattr(pip, 'main'):
        pip.main(['install', package])
    else:
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])

if __name__ == "__main__":
    print(f"Installing pypdf into {sys.executable}...")
    try:
        install("pypdf==4.0.1")
        print("Success!")
    except Exception as e:
        print(f"Failed: {e}")
