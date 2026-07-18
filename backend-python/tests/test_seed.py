"""
Tests for the seed data script.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.user import User
from app.models.project import Project
from app.models.module import Module
from app.models.requirement import Requirement
import app.models  # noqa: F401


def test_seed_creates_data():
    """Seed script should create demo user, project, modules, and requirements."""
    # Use an in-memory database for testing
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(bind=engine)

    # Monkey-patch the seed script's session
    import app.seed_data as seed_module
    original_session = seed_module.SessionLocal
    seed_module.SessionLocal = TestSession

    try:
        seed_module.seed()

        db = TestSession()
        # Verify admin user
        admin = db.query(User).filter(User.username == "admin").first()
        assert admin is not None
        assert admin.email == "admin@codeaps.local"
        assert admin.role == "admin"

        # Verify project
        project = db.query(Project).filter(Project.name == "CodeAps Demo Project").first()
        assert project is not None
        assert project.owner_id == admin.id

        # Verify modules
        modules = db.query(Module).filter(Module.project_id == project.id).all()
        assert len(modules) == 3

        # Verify requirements
        total_reqs = db.query(Requirement).count()
        assert total_reqs == 9  # 3 per module

        # Verify idempotency — run again
        seed_module.seed()
        assert db.query(User).filter(User.username == "admin").count() == 1

        db.close()
    finally:
        seed_module.SessionLocal = original_session
