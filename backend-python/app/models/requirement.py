from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Float
from sqlalchemy.sql import func
from app.core.database import Base

class Requirement(Base):
    __tablename__ = "requirements"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False, index=True)
    requirement_text = Column(Text, nullable=False)
    acceptance_criteria = Column(Text)  # What must be true for satisfaction
    priority = Column(String)  # low, medium, high, critical
    status = Column(String, default="pending")  # pending | implemented | verified
    coverage_score = Column(Float, default=0.0)  # Latest AI-computed coverage (0.0 - 1.0)
    linked_submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
