from sqlalchemy import Column, Integer, ForeignKey, DateTime, Float, Text, String, JSON
from sqlalchemy.sql import func
from app.core.database import Base

class CodeAnalysis(Base):
    __tablename__ = "code_analysis"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=False, index=True)
    pylint_score = Column(Float)
    complexity_score = Column(Float)
    maintainability_index = Column(Float)
    code_smells = Column(JSON) # Enhanced to JSON
    violations = Column(JSON)   # Enhanced to JSON
    analyzed_at = Column(DateTime(timezone=True), server_default=func.now())

class CodeAnalysisCache(Base):
    __tablename__ = "code_analysis_cache"

    id = Column(Integer, primary_key=True, index=True)
    file_hash = Column(String, nullable=False, index=True, unique=True)
    
    # Cached metrics
    pylint_data = Column(JSON)
    complexity_data = Column(JSON)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
