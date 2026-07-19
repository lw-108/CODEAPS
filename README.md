# CODEAPS
### Centralized Operations & Development Engine – AI Powered System

**CODEAPS** (Centralized Operations & Development Engine – AI Powered System) is a high-performance, cross-platform integrated development environment engineered to bridge the gap between local development efficiency and advanced AI-driven diagnostics. Built on a robust tri-pillar architecture—leveraging the security of Rust through the Tauri framework, the dynamic responsiveness of a React-based frontend, and the computational power of a Python-FastAPI sidecar—CODEAPS offers a unified workspace where intelligent code analysis meets professional-grade editing. By integrating the Monaco editor, multi-tab terminal capabilities, and a custom-built AI analysis engine that interfaces with local large language models, the platform provides real-time semantic insights, automated refactoring, and collaborative state synchronization. It is designed not just as a text editor, but as a centralized engine that orchestrates the entire development lifecycle, from initial requirement analysis to final production build, all within a high-fidelity, low-latency desktop application.

![CODEAPS Logo]()

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


### Gallery

<img width="1805" height="998" alt="1" src="https://github.com/user-attachments/assets/86b75134-971c-4854-97a1-704fa800e81d" />

<img width="1840" height="1036" alt="2" src="https://github.com/user-attachments/assets/6ae4a8a2-aea6-4508-b235-eb6384a1836c" />

<img width="1880" height="1058" alt="3" src="https://github.com/user-attachments/assets/07968c48-7e3d-48e7-81d5-38bc5a7cb10a" />

<img width="1805" height="1014" alt="4" src="https://github.com/user-attachments/assets/b5305307-9598-4eee-93e2-9c3b588ddc10" />

<img width="1880" height="1058" alt="5" src="https://github.com/user-attachments/assets/96ac2520-0a99-408b-a54a-99155ec32aca" />

<img width="1880" height="1058" alt="6" src="https://github.com/user-attachments/assets/d54e6eb4-16cf-42b0-a36e-28a3a3fc7060" />

<img width="1805" height="1014" alt="7" src="https://github.com/user-attachments/assets/92706f3b-a525-4e61-acb9-d79189d5701b" />

<img width="1805" height="1015" alt="8" src="https://github.com/user-attachments/assets/5f72d947-9721-471e-8965-566c9cf4b0cb" />

<img width="1880" height="1058" alt="9" src="https://github.com/user-attachments/assets/b59cf36a-9a42-43d4-bec5-435562f06aff" />

<img width="1880" height="1058" alt="10" src="https://github.com/user-attachments/assets/dcb0a6c0-a237-44b3-a9d8-94d6d774b510" />

<img width="1880" height="1059" alt="11" src="https://github.com/user-attachments/assets/401426de-730e-4478-a6eb-f34e708e34f1" />

<img width="1880" height="1058" alt="12" src="https://github.com/user-attachments/assets/978f20de-5bf9-435e-afa1-1cbf820f1dd1" />

<img width="1880" height="1059" alt="13" src="https://github.com/user-attachments/assets/c9f7ed08-44ab-4289-b07e-651d35f3656d" />

<img width="1880" height="1018" alt="14" src="https://github.com/user-attachments/assets/d1022394-6661-485d-bd19-d2d0a97bfbf4" />

<img width="1880" height="1011" alt="15" src="https://github.com/user-attachments/assets/51e5a41f-e5c9-413c-905b-ce45f7d0621b" />

<img width="1880" height="1011" alt="16" src="https://github.com/user-attachments/assets/8311f9a4-bf51-4ae1-b15c-954bb3e35d38" />


