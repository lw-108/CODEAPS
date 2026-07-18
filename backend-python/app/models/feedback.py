from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.sql import func
from app.core.database import Base

class AIFeedbackLoop(Base):
    __tablename__ = "ai_feedback_loop"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    suggestion_id = Column(String, nullable=False, index=True) # Reference to AI suggestion
    
    rating = Column(Integer) # 1 to 5
    user_comment = Column(Text)
    corrected_text = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
