import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.project import Project
from app.models.module import Module
from app.models.requirement import Requirement

logger = logging.getLogger(__name__)

class TemplateService:
    """
    Manages "Smart Starter" project templates with pedagogical scaffolding.
    """
    
    TEMPLATES = {
        "python_basics": {
            "name": "Python Fundamentals",
            "description": "Master core Python syntax and logic.",
            "modules": [
                {
                    "title": "Variable Sculpting",
                    "requirements": [
                        "Create a function `calculate_bmi(weight, height)`.",
                        "Round the result to 2 decimal places.",
                        "Handle ZeroDivisionError gracefully."
                    ]
                }
            ]
        },
        "advanced_analytics": {
            "name": "Data Engine Master",
            "description": "Build high-performance data processing pipelines.",
            "modules": [
                {
                    "title": "Stream Optimizer",
                    "requirements": [
                        "Implement a generator to process 1GB+ files chunk-by-chunk.",
                        "Use `multiprocessing` to parallelize aggregation.",
                        "Adhere to PEP 8 naming conventions."
                    ]
                }
            ]
        }
    }

    def __init__(self, db: Session):
        self.db = db

    def list_available_templates(self) -> Dict[str, Any]:
        return self.TEMPLATES

    def instantiate_template(self, template_key: str, user_id: int) -> Project:
        """Creates a full project structure from a template key"""
        tpl = self.TEMPLATES.get(template_key)
        if not tpl:
            raise ValueError(f"Template {template_key} not found")
            
        # 1. Create Project
        project = Project(
            name=str(tpl.get("name", "Untitled Project")),
            description=str(tpl.get("description", "")),
            owner_id=user_id
        )
        self.db.add(project)
        self.db.commit()
        self.db.refresh(project)
        
        # 2. Create Modules & Requirements
        modules_data = tpl.get("modules", [])
        if isinstance(modules_data, list):
            for m_item in modules_data:
                if isinstance(m_item, dict):
                    module = Module(
                        project_id=project.id,
                        title=str(m_item.get("title", "Untitled Module")),
                        order=0
                    )
                    self.db.add(module)
                    self.db.commit()
                    self.db.refresh(module)
                    
                    reqs = m_item.get("requirements", [])
                    if isinstance(reqs, list):
                        for req_desc in reqs:
                            requirement = Requirement(
                                module_id=module.id,
                                description=str(req_desc)
                            )
                            self.db.add(requirement)
        
        self.db.commit()
        return project
