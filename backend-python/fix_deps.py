import subprocess
import sys
import os

venv_python = os.path.join(os.getcwd(), "venv", "Scripts", "python.exe")
requirements = os.path.join(os.getcwd(), "requirements.txt")

print(f"Using python: {venv_python}")

try:
    # Try to install pypdf and pillow directly
    result = subprocess.run(
        [venv_python, "-m", "pip", "install", "pypdf==4.0.1", "pillow==10.1.0"],
        capture_output=True,
        text=True,
        check=True
    )
    print("STDOUT:")
    print(result.stdout)
    print("STDERR:")
    print(result.stderr)
    print("Installation successful!")
except subprocess.CalledProcessError as e:
    print(f"Installation failed with exit code {e.returncode}")
    print("STDOUT:")
    print(e.stdout)
    print("STDERR:")
    print(e.stderr)
except Exception as e:
    print(f"An error occurred: {e}")
