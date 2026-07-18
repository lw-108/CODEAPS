import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.analytics import ProjectMetric, SkillAssessment
from app.models.submission import Submission
from app.models.ai_validation import AIValidationResult

logger = logging.getLogger(__name__)

class AnalyticsEngine:
    """
    Processes validation data into high-level analytics and skill benchmarks.
    """
    
    def __init__(self, db: Session):
        self.db = db

    def get_user_progression(self, user_id: int) -> Dict[str, Any]:
        """Calculates skill growth over time for a specific user"""
        skills = self.db.query(SkillAssessment).filter_by(user_id=user_id).all()
        
        return {
            "skills": [
                {"name": s.skill_name, "level": s.level, "score": s.score} 
                for s in skills
            ],
            "total_mastery": sum(s.score for s in skills) / (len(skills) or 1)
        }

    def track_system_metric(self, project_id: int, metric_type: str, value: float):
        """Records a new system performance metric"""
        metric = ProjectMetric(
            project_id=project_id,
            metric_type=metric_type,
            value=value
        )
        self.db.add(metric)
        self.db.commit()

    def perform_skill_gap_analysis(self, user_id: int) -> List[Dict[str, Any]]:
        """Identifies missing skills based on failed validation requirements"""
        # Get recent validation misses
        misses = self.db.query(AIValidationResult)\
            .join(Submission)\
            .filter(Submission.user_id == user_id)\
            .order_by(AIValidationResult.validated_at.desc())\
            .limit(10).all()
            
        # Aggregate missing requirements (simplified logic)
        gaps = []
        for m in misses:
            if m.missing_requirements:
                gaps.extend(m.missing_requirements)
        
        return [{"gap": g, "recommendation": f"Review module related to {g}"} for g in set(gaps)]
