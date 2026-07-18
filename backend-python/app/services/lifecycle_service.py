"""
LifecycleService: Quality-aware progress computation and risk detection engine.

Computes module-level and project-level completion metrics using quality-weighted
scoring aligned to milestones and dependency constraints.
"""

import logging
from typing import Dict, Any, List
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.module import Module
from app.models.milestone import Milestone
from app.models.requirement import Requirement
from app.models.submission import Submission
from app.models.ai_validation import AIValidationResult
from app.models.module_dependency import ModuleDependency

logger = logging.getLogger(__name__)


class LifecycleService:
    """
    Central orchestration service for project lifecycle management.
    All progress computations are quality-weighted and milestone-aligned.
    """

    def __init__(self, db: Session):
        self.db = db

    # ─── Module-Level Progress ───────────────────────────────────────

    def compute_module_progress(self, module_id: int) -> Dict[str, Any]:
        """
        Compute quality-weighted progress for a single module.
        
        Formula: progress = (requirement_coverage * 0.6) + (quality_score * 0.4)
        - requirement_coverage: % of module requirements at 'implemented' or 'verified'
        - quality_score: average AI validation score from latest submissions
        """
        module = self.db.query(Module).get(module_id)
        if not module:
            return {"error": "Module not found"}

        # Requirement coverage
        total_reqs = self.db.query(Requirement).filter_by(module_id=module_id).count()
        satisfied_reqs = self.db.query(Requirement).filter(
            Requirement.module_id == module_id,
            Requirement.status.in_(["implemented", "verified"])
        ).count()
        
        req_coverage = (satisfied_reqs / total_reqs) if total_reqs > 0 else 0.0

        # Quality score from AI validation
        latest_validation = self.db.query(AIValidationResult).join(Submission).filter(
            Submission.module_id == module_id
        ).order_by(AIValidationResult.validated_at.desc()).first()

        quality_score = 0.0
        if latest_validation:
            quality_score = (
                (latest_validation.coverage_score or 0.0) * 0.4 +
                (latest_validation.logic_score or 0.0) * 0.3 +
                (latest_validation.style_score or 0.0) * 0.3
            )

        # Weighted progress
        progress = (req_coverage * 0.6) + (quality_score * 0.4)
        progress_pct = round(min(progress * 100, 100.0), 1)

        # Persist
        if module:
            module.completion_pct = progress_pct
            if progress_pct >= 100:
                module.status = "completed"
            elif progress_pct > 0:
                module.status = "in_progress"
            self.db.commit()

        return {
            "module_id": module_id,
            "module_name": module.module_name,
            "status": module.status,
            "progress_pct": progress_pct,
            "requirement_coverage": round(req_coverage * 100, 1),
            "quality_score": round(quality_score * 100, 1),
            "total_requirements": total_reqs,
            "satisfied_requirements": satisfied_reqs,
        }

    # ─── Project-Level Progress ──────────────────────────────────────

    def compute_project_progress(self, project_id: int) -> Dict[str, Any]:
        """
        Aggregate all modules into project-level progress.
        Factors in milestone alignment and dependency satisfaction.
        """
        modules = self.db.query(Module).filter_by(project_id=project_id).all()
        if not modules:
            return {
                "project_id": project_id,
                "overall_progress": 0.0,
                "modules": [],
                "milestones": [],
            }

        module_results = []
        total_progress = 0.0
        
        for mod in modules:
            mod_progress = self.compute_module_progress(mod.id)
            module_results.append(mod_progress)
            total_progress += mod_progress.get("progress_pct", 0.0)

        overall = round(total_progress / len(modules), 1) if modules else 0.0

        # Milestone status
        milestones = self.db.query(Milestone).filter_by(project_id=project_id).all()
        milestone_data = []
        for ms in milestones:
            ms_status = self._compute_milestone_status(ms)
            milestone_data.append(ms_status)

        # Dependency health
        dep_violations = self._check_dependency_violations(project_id)

        return {
            "project_id": project_id,
            "overall_progress": overall,
            "total_modules": len(modules),
            "completed_modules": sum(1 for m in module_results if m.get("progress_pct", 0) >= 100),
            "modules": module_results,
            "milestones": milestone_data,
            "dependency_violations": dep_violations,
        }

    # ─── Milestone Status ────────────────────────────────────────────

    def _compute_milestone_status(self, milestone: Milestone) -> Dict[str, Any]:
        """Auto-detect milestone status based on linked modules and target date."""
        linked_modules = self.db.query(Module).filter_by(milestone_id=milestone.id).all()
        
        if not linked_modules:
            avg_progress = 0.0
        else:
            avg_progress = sum(m.completion_pct or 0.0 for m in linked_modules) / len(linked_modules)

        # Auto-detect overdue
        now = datetime.now(timezone.utc)
        is_overdue = (
            milestone.target_date is not None and 
            milestone.target_date < now and 
            avg_progress < 100
        )

        if is_overdue:
            new_status = "overdue"
        elif avg_progress >= 100:
            new_status = "completed"
        elif avg_progress > 0:
            new_status = "in_progress"
        else:
            new_status = "planned"

        # Persist update
        milestone.status = new_status
        milestone.progress_pct = round(avg_progress, 1)
        self.db.commit()

        return {
            "id": milestone.id,
            "title": milestone.title,
            "description": milestone.description,
            "target_date": milestone.target_date.isoformat() if milestone.target_date else None,
            "status": new_status,
            "progress_pct": round(avg_progress, 1),
            "linked_modules": len(linked_modules),
            "is_overdue": is_overdue,
        }

    # ─── Risk Detection ──────────────────────────────────────────────

    def detect_risks(self, project_id: int) -> List[Dict[str, Any]]:
        """
        Identify project risks:
        - Overdue milestones
        - Stalled modules (0% progress with old requirements)
        - Low coverage modules
        - Dependency violations
        - High complexity areas
        """
        risks = []

        # 1. Overdue milestones
        now = datetime.now(timezone.utc)
        overdue = self.db.query(Milestone).filter(
            Milestone.project_id == project_id,
            Milestone.target_date < now,
            Milestone.status != "completed"
        ).all()
        for ms in overdue:
            risks.append({
                "type": "overdue_milestone",
                "severity": "critical",
                "title": f"Milestone Overdue: {ms.title}",
                "detail": f"Target date {ms.target_date.strftime('%Y-%m-%d') if ms.target_date else 'N/A'} has passed with {ms.progress_pct:.0f}% progress.",
                "entity_id": ms.id,
            })

        # 2. Stalled modules (in_progress but < 20% completion)
        stalled = self.db.query(Module).filter(
            Module.project_id == project_id,
            Module.status == "in_progress",
            Module.completion_pct < 20.0
        ).all()
        for mod in stalled:
            risks.append({
                "type": "stalled_module",
                "severity": "warning",
                "title": f"Module Stalled: {mod.module_name}",
                "detail": f"Module is marked in-progress but only at {mod.completion_pct:.0f}% completion.",
                "entity_id": mod.id,
            })

        # 3. Low requirement coverage (modules with requirements but < 30% satisfied)
        modules = self.db.query(Module).filter_by(project_id=project_id).all()
        for mod in modules:
            total = self.db.query(Requirement).filter_by(module_id=mod.id).count()
            if total == 0:
                continue
            satisfied = self.db.query(Requirement).filter(
                Requirement.module_id == mod.id,
                Requirement.status.in_(["implemented", "verified"])
            ).count()
            coverage = satisfied / total
            if coverage < 0.3 and total >= 2:
                risks.append({
                    "type": "low_coverage",
                    "severity": "warning",
                    "title": f"Low Coverage: {mod.module_name}",
                    "detail": f"Only {satisfied}/{total} requirements satisfied ({coverage*100:.0f}%).",
                    "entity_id": mod.id,
                })

        # 4. Dependency violations
        violations = self._check_dependency_violations(project_id)
        for v in violations:
            risks.append({
                "type": "dependency_violation",
                "severity": "critical",
                "title": f"Dependency Violation",
                "detail": v,
                "entity_id": None,
            })

        return risks

    # ─── Dependency Validation ───────────────────────────────────────

    def _check_dependency_violations(self, project_id: int) -> List[str]:
        """Check for modules that are progressing while their blockers are incomplete."""
        violations = []
        modules = self.db.query(Module).filter_by(project_id=project_id).all()
        module_map = {m.id: m for m in modules}

        for mod in modules:
            deps = self.db.query(ModuleDependency).filter_by(
                source_module_id=mod.id,
                dependency_type="blocks"
            ).all()
            for dep in deps:
                blocker = module_map.get(dep.target_module_id)
                if blocker and blocker.status != "completed" and (mod.completion_pct or 0) > 0:
                    violations.append(
                        f"'{mod.module_name}' is progressing but blocked by incomplete '{blocker.module_name}'"
                    )

        return violations
