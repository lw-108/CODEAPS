# Technical Documentation: CODEAPS

## 1. Overview

### 1.1 Project Essence
CODEAPS (Centralized Operations & Development Engine – AI Powered System) is a high-performance, cross-platform integrated development environment engineered to bridge the gap between local development efficiency and advanced AI-driven diagnostics. Built on a robust tri-pillar architecture—leveraging the security of Rust through the Tauri framework, the dynamic responsiveness of a React-based frontend, and the computational power of a Python-FastAPI sidecar—CODEAPS offers a unified workspace where intelligent code analysis meets professional-grade editing. By integrating the Monaco editor, multi-tab terminal capabilities, and a custom-built AI analysis engine that interfaces with local large language models, the platform provides real-time semantic insights, automated refactoring, and collaborative state synchronization.

### 1.2 Objectives
The primary objective of CODEAPS is to redefine the development lifecycle through a local-first AI integration strategy that prioritizes data privacy and low-latency performance using tools like Ollama. By consolidating professional code editing, terminal operations, and real-time diagnostics into a unified, "Bento-style" dashboard, the platform eliminates context-switching and maximizes developer flow. Built on the lightweight Tauri and Rust runtime, CODEAPS delivers a native-speed experience with an optimized memory footprint, complemented by a Python-based engine for deep semantic analysis. Ultimately, the project fosters seamless collaboration through integrated state synchronization, allowing distributed teams to engage in fluid, multi-user coding sessions with high efficiency.

## 2. System Architecture

CODEAPS follows a multi-process architecture to ensure stability and performance.

### 2.1 Process Overview
The system stability and high performance of CODEAPS are guaranteed by its multi-process architecture, which separates concerns across three distinct layers. At the core is the Main Process, built with Rust and the Tauri framework, which orchestrates the window lifecycle and manages native system integrations while supervising the Python Sidecar. The User Interface is driven by the Frontend Process, a React-based application that handles the editor state and user interactions with high responsiveness. Completing the stack is the Sidecar Process, powered by FastAPI and Python, which executes heavy computational tasks, manages the AI logic through the Ollama bridge, and handles all database operations to keep the frontend lightweight.

### 2.2 Communication Protocol
Communication between these processes is handled through a sophisticated set of protocols designed for low latency. The frontend interacts with the Rust main process via Tauri Commands for system-level operations, while more complex data-driven tasks are handled through an HTTP/REST interface connecting the frontend to the Python Sidecar at its local address. For features requiring real-time updates, such as collaborative editing and state synchronization, the system employs WebSockets integrated with Yjs to ensure that all parts of the application remain in perfect sync.

## 3. Frontend Architecture

### 3.1 State Management (`useLayoutStore`)
The application's UI state is managed through a centralized Zustand store, which utilizes persistence middleware to maintain the user's workspace configuration across sessions. This store, located in the frontend's dedicated store directory, tracks critical visibility states such as the sidebar and terminal panels, as well as the active modes for the utility panels. It also manages the specific navigation state of the terminal, ensuring that the user returns to their precise tab—whether it be tests, console, or problems—upon restarting the application.

### 3.2 Editor Integration
- **Monaco Editor**: The primary editor component.
- **Yjs Integration**: Monaco is bound to Yjs for collaborative editing and state sync.
- **Custom Themes**: CodeAps uses a custom dark theme optimized for long development sessions.

## 4. Backend (Sidecar) Implementation

### 4.1 AI Analysis Engine
The `analysis_engine` directory contains the logic for code diagnostics. It interacts with local models to provide:
- Real-time linting.
- Semantic code analysis.
- AI-driven refactoring suggestions.

### 4.2 Database
- **Type**: SQLite (managed via SQLAlchemy and Alembic).
- **Location**: `backend-python/codeaps.db`.
- **Vector Store**: ChromaDB is used for indexing codebases to provide context for the AI.

## 5. Development Workflow

### 5.1 Running Services
The project includes several batch files for service management:
- `start_all.bat`: Launches frontend, backend, and Tauri.
- `cleanup_processes.bat`: Force-kills orphaned sidecar processes.

### 5.2 Building for Production
Building CodeAps involves two steps:
1.  **Backend Compilation**: Python script is compiled into an executable using PyInstaller.
2.  **Tauri Bundle**: The frontend is built, and Tauri bundles it along with the sidecar executable.

## 6. Directory Structure
The CODEAPS codebase is organized into a modular structure that reflects its multi-process nature. The root directory contains the general project configuration and build scripts, while the primary application logic is divided into specialized subdirectories. The frontend directory houses the React application and UI components, and the backend-python folder contains the FastAPI sidecar and AI logic. Native configurations and Rust source code reside in the src-tauri directory, while the analysis_engine folder focuses exclusively on core AI diagnostics. Additionally, the plugins directory provides a space for the system's extension architecture, allowing for modular growth of the IDE's capabilities.
