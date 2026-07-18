from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, JSON, Text
from sqlalchemy.sql import func
from app.core.database import Base

class LearningPath(Base):
    __tablename__ = "learning_paths"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    status = Column(String, default="active") # active, completed, paused
    
    current_module_id = Column(Integer, ForeignKey("modules.id"))
    progress_pct = Column(Float, default=0.0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class SkillAssessment(Base):
    __tablename__ = "skill_assessments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    skill_name = Column(String, nullable=False, index=True) # e.g., "Python", "Recursion", "Time Complexity"
    level = Column(Integer, default=1)
    score = Column(Float, default=0.0)
    
    last_assessed = Column(DateTime(timezone=True), server_default=func.now())

class ProjectMetric(Base):
    __tablename__ = "project_metrics"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    metric_type = Column(String, nullable=False, index=True) # "vram", "ram", "cpu", "tokens_per_sec", "lines_of_code"
    value = Column(Float, nullable=False)
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
