from app.core.database import engine, Base
import app.models # Ensure all models are loaded

def init_db():
    print("Initializing Database...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created.")

if __name__ == "__main__":
    init_db()
