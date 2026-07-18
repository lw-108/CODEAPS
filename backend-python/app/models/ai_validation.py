from sqlalchemy import Column, Integer, ForeignKey, DateTime, Float, Text, JSON
from sqlalchemy.sql import func
from app.core.database import Base

class AIValidationResult(Base):
    __tablename__ = "ai_validation_results"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=False, index=True)
    
    # Requirement Coverage
    coverage_score = Column(Float, default=0.0)
    satisfied_requirements = Column(JSON) # List of satisfied IDs
    missing_requirements = Column(JSON)   # List of missing IDs
    
    # Logic & Correctness
    logic_score = Column(Float, default=0.0)
    logic_feedback = Column(Text)
    
    # Architecture & Style
    style_score = Column(Float, default=0.0)
    architecture_feedback = Column(Text)
    
    validated_at = Column(DateTime(timezone=True), server_default=func.now())
