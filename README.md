# CODEAPS
### Centralized Operations & Development Engine – AI Powered System

**CODEAPS** (Centralized Operations & Development Engine – AI Powered System) is a high-performance, cross-platform integrated development environment engineered to bridge the gap between local development efficiency and advanced AI-driven diagnostics. Built on a robust tri-pillar architecture—leveraging the security of Rust through the Tauri framework, the dynamic responsiveness of a React-based frontend, and the computational power of a Python-FastAPI sidecar—CODEAPS offers a unified workspace where intelligent code analysis meets professional-grade editing. By integrating the Monaco editor, multi-tab terminal capabilities, and a custom-built AI analysis engine that interfaces with local large language models, the platform provides real-time semantic insights, automated refactoring, and collaborative state synchronization. It is designed not just as a text editor, but as a centralized engine that orchestrates the entire development lifecycle, from initial requirement analysis to final production build, all within a high-fidelity, low-latency desktop application.

![CODEAPS Logo](FaviconMani.ico)

**CODEAPS** is a next-generation, high-performance IDE designed for seamless AI integration and centralized development workflows. Built on top of the **Tauri** framework, it leverages the speed of Rust and the flexibility of React to provide a premium coding experience.

## 🚀 Key Features

- **AI-Powered Analysis**: Integrated engine for real-time code suggestions and diagnostics.
- **FastAPI Sidecar**: High-speed Python backend for heavy lifting and data processing.
- **Monaco Editor**: Professional-grade editing experience with full LSP support.
- **Integrated Terminal**: Custom Xterm implementation with multi-tab support.
- **Tauri Runtime**: Lightweight, secure, and cross-platform desktop integration.
- **Collaborative Sync**: Real-time state synchronization via Yjs.

## 🛠️ Tech Stack

- **Frontend**: [React](https://reactjs.org/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/)
- **Backend (Sidecar)**: [FastAPI](https://fastapi.tiangolo.com/), [SQLAlchemy](https://www.sqlalchemy.org/), [ChromaDB](https://www.trychroma.com/)
- **Desktop Bridge**: [Tauri](https://tauri.app/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Editor**: [Monaco Editor](https://microsoft.github.io/monaco-editor/)

## 🏁 Quick Start

For a detailed, step-by-step setup guide with full instructions and troubleshooting tips, see [SETUP.md](./SETUP.md).

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Rust (for Tauri builds)
- Ollama (for local AI)

### Development
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   cd backend-python && python -m venv venv && .\venv\Scripts\activate && pip install -r requirements.txt
   ```
3. Start the development environment:
   ```bash
   npm run tauri dev
   ```

## 📖 Documentation
- For detailed technical design and architecture, see [DOCUMENTATION.md](./DOCUMENTATION.md).
- For local configuration and setup guide, see [SETUP.md](./SETUP.md).

---

© 2026 CODEAPS Team. All rights reserved.
