import os
import sys

output_file = os.path.join(os.getcwd(), "verify_result.txt")

with open(output_file, "w") as f:
    f.write(f"Python executable: {sys.executable}\n")
    try:
        import pypdf
        f.write("pypdf: OK\n")
    except ImportError:
        f.write("pypdf: MISSING\n")
    
    try:
        import PIL
        f.write("PIL: OK\n")
    except ImportError:
        f.write("PIL: MISSING\n")
