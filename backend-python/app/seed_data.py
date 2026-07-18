"""
CodeAps — Seed Data Script
Creates demo user, sample project, modules, and requirements.
Idempotent: safe to run multiple times.

Usage:
    cd backend-python
    python -m app.seed_data
"""

from app.core.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.project import Project
from app.models.module import Module
from app.models.requirement import Requirement
from app.core.security import get_password_hash
import app.models  # noqa: F401 — ensure all models are registered


def seed():
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # --- Demo User ---
        existing_user = db.query(User).filter(User.username == "admin").first()
        if not existing_user:
            admin = User(
                username="admin",
                email="admin@codeaps.local",
                password_hash=get_password_hash("codeaps123"),
                full_name="CodeAps Admin",
                role="admin",
            )
            db.add(admin)
            db.flush()
            owner_id = admin.id
            print("[SEED] Created admin user (admin / codeaps123)")
        else:
            owner_id = existing_user.id
            print("[SEED] Admin user already exists, skipping")

        # --- Demo Project ---
        existing_project = db.query(Project).filter(
            Project.name == "CodeAps Demo Project"
        ).first()
        if not existing_project:
            project = Project(
                name="CodeAps Demo Project",
                description="A sample project to demonstrate CodeAps features: AI code generation, analytics, and ERP tracking.",
                owner_id=owner_id,
                status="active",
                project_path="D:/CodeAps/demo_project",
            )
            db.add(project)
            db.flush()
            project_id = project.id
            print("[SEED] Created demo project")
        else:
            project_id = existing_project.id
            print("[SEED] Demo project already exists, skipping")

        # --- Demo Modules ---
        module_data = [
            {
                "module_name": "Authentication Module",
                "milestone": "Phase 1",
                "description": "User login, registration, and JWT token management.",
                "order_index": 1,
            },
            {
                "module_name": "Dashboard Module",
                "milestone": "Phase 2",
                "description": "Project overview, analytics charts, and progress tracking.",
                "order_index": 2,
            },
            {
                "module_name": "AI Code Generator",
                "milestone": "Phase 3",
                "description": "Multi-POV code generation using local LLMs.",
                "order_index": 3,
            },
        ]

        created_modules = []
        for md in module_data:
            exists = db.query(Module).filter(
                Module.project_id == project_id,
                Module.module_name == md["module_name"],
            ).first()
            if not exists:
                module = Module(project_id=project_id, **md)
                db.add(module)
                db.flush()
                created_modules.append(module)
                print(f"[SEED] Created module: {md['module_name']}")
            else:
                created_modules.append(exists)

        # --- Demo Requirements ---
        requirement_data = {
            0: [  # Authentication Module
                ("Implement JWT token generation", "high"),
                ("Add password hashing with bcrypt", "high"),
                ("Create login/register API endpoints", "critical"),
            ],
            1: [  # Dashboard Module
                ("Create progress chart using Chart.js", "medium"),
                ("Implement project summary cards", "medium"),
                ("Add complexity trend line chart", "low"),
            ],
            2: [  # AI Code Generator
                ("Connect to Ollama API", "critical"),
                ("Implement multi-POV prompt routing", "high"),
                ("Add code syntax highlighting in response", "medium"),
            ],
        }

        for idx, reqs in requirement_data.items():
            module = created_modules[idx]
            for req_text, priority in reqs:
                exists = db.query(Requirement).filter(
                    Requirement.module_id == module.id,
                    Requirement.requirement_text == req_text,
                ).first()
                if not exists:
                    req = Requirement(
                        module_id=module.id,
                        requirement_text=req_text,
                        priority=priority,
                        status="pending",
                    )
                    db.add(req)

        db.commit()
        print("[SEED] Seed data complete!")

    except Exception as e:
        db.rollback()
        print(f"[SEED] Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
