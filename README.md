# CODEAPS
### Centralized Operations & Development Engine – AI Powered System

**CODEAPS** (Centralized Operations & Development Engine – AI Powered System) is a high-performance, cross-platform integrated development environment engineered to bridge the gap between local development efficiency and advanced AI-driven diagnostics. Built on a robust tri-pillar architecture—leveraging the security of Rust through the Tauri framework, the dynamic responsiveness of a React-based frontend, and the computational power of a Python-FastAPI sidecar—CODEAPS offers a unified workspace where intelligent code analysis meets professional-grade editing. By integrating the Monaco editor, multi-tab terminal capabilities, and a custom-built AI analysis engine that interfaces with local large language models, the platform provides real-time semantic insights, automated refactoring, and collaborative state synchronization. It is designed not just as a text editor, but as a centralized engine that orchestrates the entire development lifecycle, from initial requirement analysis to final production build, all within a high-fidelity, low-latency desktop application.

<img width="1024" height="1008" alt="pypGi" src="https://github.com/user-attachments/assets/b4ea7e90-9137-444e-abaa-c765977da438" />

**CODEAPS** is a next-generation, high-performance IDE designed for seamless AI integration and centralized development workflows. Built on top of the **Tauri** framework, it leverages the speed of[...]

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

### Gallery

**Main Dashboard & Editor Interface**

<img width="1805" height="998" alt="Main Dashboard & Editor Interface" src="https://github.com/user-attachments/assets/86b75134-971c-4854-97a1-704fa800e81d" />


**Code Editor with Syntax Highlighting**

<img width="1840" height="1036" alt="Code Editor with Syntax Highlighting" src="https://github.com/user-attachments/assets/6ae4a8a2-aea6-4508-b235-eb6384a1836c" />


**AI-Powered Code Analysis Panel**

<img width="1880" height="1058" alt="AI-Powered Code Analysis Panel" src="https://github.com/user-attachments/assets/07968c48-7e3d-48e7-81d5-38bc5a7cb10a" />


**Integrated Terminal with Multi-Tab Support**

<img width="1805" height="1014" alt="Integrated Terminal with Multi-Tab Support" src="https://github.com/user-attachments/assets/b5305307-9598-4eee-93e2-9c3b588ddc10" />


**File Explorer & Project Navigation**

<img width="1880" height="1058" alt="File Explorer & Project Navigation" src="https://github.com/user-attachments/assets/96ac2520-0a99-408b-a54a-99155ec32aca" />


**Real-time Code Suggestions**

<img width="1880" height="1058" alt="Real-time Code Suggestions" src="https://github.com/user-attachments/assets/d54e6eb4-16cf-42b0-a36e-28a3a3fc7060" />


**Search & Replace Functionality**

<img width="1805" height="1014" alt="Search & Replace Functionality" src="https://github.com/user-attachments/assets/92706f3b-a525-4e61-acb9-d79189d5701b" />


**Debugging Tools & Breakpoints**

<img width="1805" height="1015" alt="Debugging Tools & Breakpoints" src="https://github.com/user-attachments/assets/5f72d947-9721-471e-8965-566c9cf4b0cb" />


**Theme Customization & UI Settings**

<img width="1880" height="1058" alt="Theme Customization & UI Settings" src="https://github.com/user-attachments/assets/b59cf36a-9a42-43d4-bec5-435562f06aff" />


**Collaborative Workspace View**

<img width="1880" height="1058" alt="Collaborative Workspace View" src="https://github.com/user-attachments/assets/dcb0a6c0-a237-44b3-a9d8-94d6d774b510" />


**Performance Monitoring Dashboard**

<img width="1880" height="1059" alt="Performance Monitoring Dashboard" src="https://github.com/user-attachments/assets/401426de-730e-4478-a6eb-f34e708e34f1" />


**Code Refactoring Tools**

<img width="1880" height="1058" alt="Code Refactoring Tools" src="https://github.com/user-attachments/assets/978f20de-5bf9-435e-afa1-1cbf820f1dd1" />


**Version Control Integration**

<img width="1880" height="1059" alt="Version Control Integration" src="https://github.com/user-attachments/assets/c9f7ed08-44ab-4289-b07e-651d35f3656d" />


**Plugin Management & Extensions**

<img width="1880" height="1018" alt="Plugin Management & Extensions" src="https://github.com/user-attachments/assets/d1022394-6661-485d-bd19-d2d0a97bfbf4" />


**Keyboard Shortcuts & Command Palette**

<img width="1880" height="1011" alt="Keyboard Shortcuts & Command Palette" src="https://github.com/user-attachments/assets/51e5a41f-e5c9-413c-905b-ce45f7d0621b" />

**Advanced Configuration Panel**

<img width="1880" height="1011" alt="Advanced Configuration Panel" src="https://github.com/user-attachments/assets/8311f9a4-bf51-4ae1-b15c-954bb3e35d38" />

---

© 2026 CODEAPS . All rights reserved.

