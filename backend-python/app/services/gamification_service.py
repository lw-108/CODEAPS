import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.analytics import SkillAssessment
from app.models.ai_validation import AIValidationResult
from app.models.submission import Submission

logger = logging.getLogger(__name__)

class GamificationService:
    """
    Handles XP calculation, leveling logic, and badge unlocking.
    """
    
    XP_PER_REQUIREMENT = 50
    XP_PER_LOGIC_POINT = 100 # Normalized scale
    
    def __init__(self, db: Session):
        self.db = db

    def process_submission_xp(self, submission_id: int) -> Dict[str, Any]:
        """Calculates and awards XP based on AI validation results"""
        validation = self.db.query(AIValidationResult).filter_by(submission_id=submission_id).first()
        if not validation:
            return {"xp_gained": 0}
            
        # 1. Base XP from requirements satisfied
        req_count = len(validation.satisfied_requirements or [])
        xp_gained = req_count * self.XP_PER_REQUIREMENT
        
        # 2. Bonus XP from logic/style scores
        xp_gained += int(validation.logic_score * self.XP_PER_LOGIC_POINT)
        
        # 3. Update Skill Assessments
        submission = self.db.query(Submission).get(submission_id)
        self._update_user_skills(submission.user_id, xp_gained)
        
        return {
            "xp_gained": xp_gained,
            "requirements_cleared": req_count,
            "logic_bonus": int(validation.logic_score * self.XP_PER_LOGIC_POINT)
        }

    def _update_user_skills(self, user_id: int, xp: int):
        """Distribute XP to relevant skill categories (Simplified)"""
        # In a real app, mapping task -> skill categories
        skill = self.db.query(SkillAssessment).filter_by(user_id=user_id, skill_name="General Logic").first()
        if not skill:
            skill = SkillAssessment(user_id=user_id, skill_name="General Logic", level=1, score=0.0)
            self.db.add(skill)
            
        skill.score += xp
        # Level up logic: Level = sqrt(score / 100)
        import math
        new_level = int(math.sqrt(skill.score / 100)) + 1
        if new_level > skill.level:
            skill.level = new_level
            logger.info(f"User {user_id} leveled up to {new_level} in {skill.skill_name}!")

    def check_badges(self, user_id: int) -> List[str]:
        """Evaluate badge criteria (Placeholder)"""
        badges = []
        # Example: 'logic_master', 'speed_demon', 'clean_coder'
        return badges
