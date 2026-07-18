"""
ReportGenerator: Automated analytical report generation for software projects.

Produces structured reports incorporating:
- Requirement Coverage Matrix
- Milestone Adherence
- Risk Indicators
- Deviation Patterns
- Quality Summary
"""

import logging
from typing import Dict, Any, List
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.project import Project
from app.models.module import Module
from app.models.milestone import Milestone
from app.models.requirement import Requirement
from app.models.submission import Submission
from app.models.ai_validation import AIValidationResult
from app.services.lifecycle_service import LifecycleService

logger = logging.getLogger(__name__)


class ReportGenerator:
    """
    Generates comprehensive analytical reports for project lifecycle tracking.
    All data is computed locally — no external API calls.
    """

    def __init__(self, db: Session):
        self.db = db
        self.lifecycle = LifecycleService(db)

    def generate_project_report(self, project_id: int) -> Dict[str, Any]:
        """Generate a full project-level analytical report."""
        project = self.db.query(Project).get(project_id)
        if not project:
            return {"error": "Project not found"}

        # Core progress data (reuses LifecycleService)
        progress = self.lifecycle.compute_project_progress(project_id)
        risks = self.lifecycle.detect_risks(project_id)

        # Build specialized report sections
        coverage_matrix = self._build_coverage_matrix(project_id)
        milestone_adherence = self._build_milestone_adherence(project_id)
        quality_summary = self._build_quality_summary(project_id)
        deviation_patterns = self._build_deviation_patterns(project_id)

        report = {
            "report_id": f"RPT-{project_id}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}",
            "project_name": project.name,
            "project_id": project_id,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "overall_progress": progress.get("overall_progress", 0.0),
            "total_modules": progress.get("total_modules", 0),
            "completed_modules": progress.get("completed_modules", 0),

            "sections": {
                "requirement_coverage": coverage_matrix,
                "milestone_adherence": milestone_adherence,
                "risk_indicators": {
                    "total_risks": len(risks),
                    "critical": sum(1 for r in risks if r["severity"] == "critical"),
                    "warnings": sum(1 for r in risks if r["severity"] == "warning"),
                    "items": risks,
                },
                "deviation_patterns": deviation_patterns,
                "quality_summary": quality_summary,
            }
        }

        logger.info(f"[ReportGenerator] Generated report {report['report_id']} for project '{project.name}'")
        return report

    def generate_module_report(self, module_id: int) -> Dict[str, Any]:
        """Generate a drill-down report for a single module."""
        module = self.db.query(Module).get(module_id)
        if not module:
            return {"error": "Module not found"}

        mod_progress = self.lifecycle.compute_module_progress(module_id)

        # Per-requirement breakdown
        requirements = self.db.query(Requirement).filter_by(module_id=module_id).all()
        req_details = []
        for req in requirements:
            req_details.append({
                "id": req.id,
                "text": req.requirement_text,
                "priority": req.priority,
                "status": req.status,
                "coverage_score": req.coverage_score or 0.0,
                "acceptance_criteria": req.acceptance_criteria,
            })

        # Latest validation results
        latest_validation = self.db.query(AIValidationResult).join(Submission).filter(
            Submission.module_id == module_id
        ).order_by(AIValidationResult.validated_at.desc()).first()

        validation_data = None
        if latest_validation:
            validation_data = {
                "coverage_score": latest_validation.coverage_score,
                "logic_score": latest_validation.logic_score,
                "style_score": latest_validation.style_score,
                "logic_feedback": latest_validation.logic_feedback,
                "architecture_feedback": latest_validation.architecture_feedback,
                "satisfied_requirements": latest_validation.satisfied_requirements or [],
                "missing_requirements": latest_validation.missing_requirements or [],
            }

        return {
            "module_id": module_id,
            "module_name": module.module_name,
            "status": module.status,
            "progress": mod_progress,
            "requirements": req_details,
            "latest_validation": validation_data,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    # ─── Coverage Matrix ─────────────────────────────────────────────

    def _build_coverage_matrix(self, project_id: int) -> Dict[str, Any]:
        """Build per-module requirement coverage percentages."""
        modules = self.db.query(Module).filter_by(project_id=project_id).all()
        matrix = []
        overall_total = 0
        overall_satisfied = 0

        for mod in modules:
            total = self.db.query(Requirement).filter_by(module_id=mod.id).count()
            satisfied = self.db.query(Requirement).filter(
                Requirement.module_id == mod.id,
                Requirement.status.in_(["implemented", "verified"])
            ).count()
            verified = self.db.query(Requirement).filter(
                Requirement.module_id == mod.id,
                Requirement.status == "verified"
            ).count()

            overall_total += total
            overall_satisfied += satisfied

            matrix.append({
                "module_id": mod.id,
                "module_name": mod.module_name,
                "total_requirements": total,
                "implemented": satisfied - verified,
                "verified": verified,
                "pending": total - satisfied,
                "coverage_pct": round((satisfied / total * 100) if total > 0 else 0, 1),
            })

        return {
            "modules": matrix,
            "overall_coverage": round((overall_satisfied / overall_total * 100) if overall_total > 0 else 0, 1),
            "total_requirements": overall_total,
            "total_satisfied": overall_satisfied,
        }

    # ─── Milestone Adherence ─────────────────────────────────────────

    def _build_milestone_adherence(self, project_id: int) -> Dict[str, Any]:
        """Evaluate milestone on-track / at-risk / overdue status."""
        milestones = self.db.query(Milestone).filter_by(project_id=project_id).order_by(Milestone.order_index).all()
        now = datetime.now(timezone.utc)
        
        items = []
        on_track = 0
        at_risk = 0
        overdue_count = 0
        completed_count = 0

        for ms in milestones:
            linked_count = self.db.query(Module).filter_by(milestone_id=ms.id).count()
            
            if ms.status == "completed":
                adherence = "on_track"
                completed_count += 1
                on_track += 1
            elif ms.target_date and ms.target_date < now:
                adherence = "overdue"
                overdue_count += 1
            elif ms.target_date:
                # Check if progress is proportional to time elapsed
                days_total = max((ms.target_date - (ms.created_at or now)).days, 1)
                days_elapsed = max((now - (ms.created_at or now)).days, 0)
                expected_progress = (days_elapsed / days_total) * 100
                actual_progress = ms.progress_pct or 0.0
                
                if actual_progress >= expected_progress * 0.7:
                    adherence = "on_track"
                    on_track += 1
                else:
                    adherence = "at_risk"
                    at_risk += 1
            else:
                adherence = "on_track"
                on_track += 1

            items.append({
                "id": ms.id,
                "title": ms.title,
                "target_date": ms.target_date.isoformat() if ms.target_date else None,
                "status": ms.status,
                "progress_pct": ms.progress_pct or 0.0,
                "adherence": adherence,
                "linked_modules": linked_count,
            })

        return {
            "items": items,
            "summary": {
                "total": len(milestones),
                "on_track": on_track,
                "at_risk": at_risk,
                "overdue": overdue_count,
                "completed": completed_count,
            }
        }

    # ─── Quality Summary ─────────────────────────────────────────────

    def _build_quality_summary(self, project_id: int) -> Dict[str, Any]:
        """Aggregate code quality scores across all modules."""
        modules = self.db.query(Module).filter_by(project_id=project_id).all()
        
        total_coverage = 0.0
        total_logic = 0.0
        total_style = 0.0
        count = 0

        for mod in modules:
            latest = self.db.query(AIValidationResult).join(Submission).filter(
                Submission.module_id == mod.id
            ).order_by(AIValidationResult.validated_at.desc()).first()
            
            if latest:
                total_coverage += (latest.coverage_score or 0.0)
                total_logic += (latest.logic_score or 0.0)
                total_style += (latest.style_score or 0.0)
                count += 1

        if count == 0:
            return {
                "avg_coverage": 0.0,
                "avg_logic": 0.0,
                "avg_style": 0.0,
                "overall_quality": 0.0,
                "modules_analyzed": 0,
            }

        avg_cov = total_coverage / count
        avg_logic = total_logic / count
        avg_style = total_style / count
        overall = (avg_cov * 0.4 + avg_logic * 0.3 + avg_style * 0.3) * 100

        return {
            "avg_coverage": round(avg_cov * 100, 1),
            "avg_logic": round(avg_logic * 100, 1),
            "avg_style": round(avg_style * 100, 1),
            "overall_quality": round(overall, 1),
            "modules_analyzed": count,
        }

    # ─── Deviation Patterns ──────────────────────────────────────────

    def _build_deviation_patterns(self, project_id: int) -> Dict[str, Any]:
        """Compare expected vs actual progress trajectories."""
        milestones = self.db.query(Milestone).filter_by(project_id=project_id).order_by(Milestone.order_index).all()
        now = datetime.now(timezone.utc)
        
        deviations = []
        for ms in milestones:
            if not ms.target_date or not ms.created_at:
                continue
                
            days_total = max((ms.target_date - ms.created_at).days, 1)
            days_elapsed = max((now - ms.created_at).days, 0)
            expected = min((days_elapsed / days_total) * 100, 100.0)
            actual = ms.progress_pct or 0.0
            gap = round(actual - expected, 1)

            deviations.append({
                "milestone": ms.title,
                "expected_progress": round(expected, 1),
                "actual_progress": round(actual, 1),
                "deviation": gap,
                "status": "ahead" if gap > 5 else ("behind" if gap < -10 else "on_track"),
            })

        return {
            "items": deviations,
            "avg_deviation": round(
                sum(d["deviation"] for d in deviations) / len(deviations), 1
            ) if deviations else 0.0,
        }
