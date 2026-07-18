from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Module(Base):
    __tablename__ = "modules"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    module_name = Column(String, nullable=False)
    milestone = Column(String)  # Legacy field (kept for backward compat)
    milestone_id = Column(Integer, ForeignKey("milestones.id"), nullable=True, index=True)
    description = Column(Text)
    parent_module_id = Column(Integer, ForeignKey("modules.id"), nullable=True, index=True)
    order_index = Column(Integer)
    status = Column(String, default="not_started")  # not_started | in_progress | completed | blocked
    completion_pct = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    linked_milestone = relationship("Milestone", backref="modules")
