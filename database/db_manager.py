from sqlalchemy import create_all, Column, Integer, String, Text, ForeignKey, DateTime, Boolean, Float, CheckConstraint, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy import create_engine
import datetime
import json

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(String, nullable=False) # 'student', 'developer', 'instructor', 'admin'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_login = Column(DateTime)
    preferences = Column(Text) # JSON string

class Project(Base):
    __tablename__ = 'projects'
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    owner_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    deadline = Column(DateTime)
    status = Column(String, default='active')
    project_path = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ProjectMember(Base):
    __tablename__ = 'project_members'
    project_id = Column(Integer, ForeignKey('projects.id'), primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), primary_key=True)
    role = Column(String, default='member')
    joined_at = Column(DateTime, default=datetime.datetime.utcnow)

class Module(Base):
    __tablename__ = 'modules'
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)
    module_name = Column(String, nullable=False)
    milestone = Column(String)
    description = Column(Text)
    parent_module_id = Column(Integer, ForeignKey('modules.id'))
    order_index = Column(Integer)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Requirement(Base):
    __tablename__ = 'requirements'
    id = Column(Integer, primary_key=True, autoincrement=True)
    module_id = Column(Integer, ForeignKey('modules.id'), nullable=False)
    requirement_text = Column(Text, nullable=False)
    priority = Column(String) # 'low', 'medium', 'high', 'critical'
    status = Column(String, default='pending')
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class File(Base):
    __tablename__ = 'files'
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)
    file_path = Column(String, nullable=False)
    file_hash = Column(String)
    language = Column(String)
    last_modified = Column(DateTime)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Submission(Base):
    __tablename__ = 'submissions'
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    module_id = Column(Integer, ForeignKey('modules.id'), nullable=False)
    file_ids = Column(Text) # JSON array of IDs
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default='pending')

class CodeAnalysis(Base):
    __tablename__ = 'code_analysis'
    id = Column(Integer, primary_key=True, autoincrement=True)
    submission_id = Column(Integer, ForeignKey('submissions.id'), nullable=False)
    pylint_score = Column(Float)
    complexity_score = Column(Float)
    maintainability_index = Column(Float)
    code_smells = Column(Text) # JSON
    violations = Column(Text) # JSON
    analyzed_at = Column(DateTime, default=datetime.datetime.utcnow)

class LLMValidation(Base):
    __tablename__ = 'llm_validation'
    id = Column(Integer, primary_key=True, autoincrement=True)
    submission_id = Column(Integer, ForeignKey('submissions.id'), nullable=False)
    requirement_coverage = Column(Float)
    logic_score = Column(Float)
    architecture_score = Column(Float)
    suggestions = Column(Text) # JSON
    validated_at = Column(DateTime, default=datetime.datetime.utcnow)

class ExecutionResult(Base):
    __tablename__ = 'execution_results'
    id = Column(Integer, primary_key=True, autoincrement=True)
    file_id = Column(Integer, ForeignKey('files.id'), nullable=False)
    execution_time = Column(DateTime)
    success = Column(Boolean)
    output = Column(Text)
    error_output = Column(Text)
    exit_code = Column(Integer)

class ProgressReport(Base):
    __tablename__ = 'progress_reports'
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)
    module_completion = Column(Text) # JSON
    milestone_progress = Column(Text) # JSON
    risk_index = Column(Float)
    report_data = Column(Text) # JSON

class ChatMessage(Base):
    __tablename__ = 'chat_messages'
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=True)
    text = Column(Text, nullable=False)
    sender = Column(String, nullable=False) # 'user' or 'ai'
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

# Engine and Session setup
DATABASE_URL = "sqlite:///./codeaps.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)
