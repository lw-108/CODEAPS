import asyncio
import sys
import os

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.submission import Submission
from app.models.requirement import Requirement
from app.services.validator_orchestrator import ValidationOrchestrator

# Mock DB Setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_phase5.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

async def test_validation():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    try:
        # 1. Setup Mock Requirement
        req = Requirement(id=1, module_id=1, description="The function must return the sum of two numbers.")
        db.add(req)
        db.commit()
        
        # 2. Setup Mock Submission
        sub = Submission(id=1, user_id=1, module_id=1, content="def add(a, b): return a + b", status="pending")
        db.add(sub)
        db.commit()
        
        # 3. Run Orchestrator
        print("[TEST] Running Validation Orchestrator...")
        orchestrator = ValidationOrchestrator(db)
        results = await orchestrator.run_full_validation(sub.id)
        
        print(f"[TEST] Results: {results}")
        
    finally:
        db.close()
        if os.path.exists("./test_phase5.db"):
            os.remove("./test_phase5.db")

if __name__ == "__main__":
    asyncio.run(test_validation())
