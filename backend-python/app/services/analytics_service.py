from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.project import Project
from app.models.module import Module
from app.models.submission import Submission
from app.models.analysis import CodeAnalysis
from typing import Dict, Any, List

class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    def get_project_progress(self, project_id: int) -> Dict[str, Any]:
        """Calculate overall project progress based on completed modules"""
        total_modules = self.db.query(Module).filter(Module.project_id == project_id).count()
        # simplified: count modules that have a successful submission
        completed_modules = self.db.query(Module).join(Submission).filter(
            Module.project_id == project_id,
            Submission.status == "completed"
        ).distinct().count()
        
        progress = (completed_modules / total_modules * 100) if total_modules > 0 else 0
        
        return {
            "project_id": project_id,
            "total_modules": total_modules,
            "completed_modules": completed_modules,
            "progress_percentage": progress
        }

    def get_complexity_trend(self, project_id: int) -> List[Dict[str, Any]]:
        """Get history of complexity scores for trend analysis"""
        results = self.db.query(
            func.date(CodeAnalysis.analyzed_at).label("date"),
            func.avg(CodeAnalysis.complexity_score).label("avg_complexity")
        ).join(Submission).join(Module).filter(
            Module.project_id == project_id
        ).group_by("date").all()
        
        return [{"date": r.date, "complexity": r.avg_complexity} for r in results]

    def get_risk_detection(self, project_id: int) -> List[str]:
        """Identify potential project risks based on analytics"""
        risks = []
        
        # 1. High complexity risk
        avg_complexity = self.db.query(func.avg(CodeAnalysis.complexity_score)).join(Submission).join(Module).filter(
            Module.project_id == project_id
        ).scalar() or 0
        
        if avg_complexity > 10:
            risks.append("Critical: Overall project complexity is very high.")
        elif avg_complexity > 5:
            risks.append("Warning: Project complexity is Increasing.")
            
        # 2. Stalled progress risk
        # ... logic to check last submission date ...
        
        return risks
