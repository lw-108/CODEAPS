from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.sql import func
from app.core.database import Base

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False, index=True)
    file_ids = Column(Text)  # JSON array
    content = Column(Text)   # Full source code at submission
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, default="pending")
