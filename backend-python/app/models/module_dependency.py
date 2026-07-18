from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class ModuleDependency(Base):
    __tablename__ = "module_dependencies"

    id = Column(Integer, primary_key=True, index=True)
    source_module_id = Column(Integer, ForeignKey("modules.id"), nullable=False, index=True)
    target_module_id = Column(Integer, ForeignKey("modules.id"), nullable=False, index=True)
    dependency_type = Column(String, default="requires")  # blocks | requires | optional
    created_at = Column(DateTime(timezone=True), server_default=func.now())
