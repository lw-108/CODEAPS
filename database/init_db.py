from db_manager import init_db
import os

if __name__ == "__main__":
    print("Initializing CodeAps Database...")
    init_db()
    if os.path.exists("./codeaps.db"):
        print("Database initialized successfully at ./codeaps.db")
    else:
        print("Failed to initialize database.")
