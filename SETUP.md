# 🚀 CodeAps Installation & Setup Guide

Welcome to the **CodeAps** repository! This guide will help you set up and run the CodeAps AI-Powered IDE on your local system step-by-step.

---

## 📋 System Prerequisites

Before you start, ensure you have the following installed on your machine:

1. **[Node.js](https://nodejs.org/)** (v18.x or higher)
2. **[Python](https://www.python.org/downloads/)** (v3.10.x or higher)
3. **[Rust](https://www.rust-lang.org/tools/install)** (Required to compile and run the Tauri desktop bridge)
4. **[Ollama](https://ollama.com/)** (To run local AI models)

---

## 🛠️ Step-by-Step Installation

### Step 1: Clone the Repository
Clone the repository using Git and navigate to the project directory:
```bash
git clone https://github.com/<your-username>/CodeAps.git
cd CodeAps
```

### Step 2: Install Frontend Dependencies
From the root directory, install all Node.js package dependencies:
```bash
npm install
```

### Step 3: Setup the Python Backend (Sidecar)
Set up a clean virtual environment and install the required Python packages for the FastAPI server:

1. Navigate to the backend directory:
   ```bash
   cd backend-python
   ```
2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```
3. Activate the virtual environment:
   * **Windows (Command Prompt):**
     ```cmd
     venv\Scripts\activate
     ```
   * **Windows (PowerShell):**
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   * **macOS / Linux:**
     ```bash
     source venv/bin/activate
     ```
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Return to the root directory:
   ```bash
   cd ..
   ```

### Step 4: Configure Local AI (Ollama)
CodeAps leverages **Ollama** for private, local AI diagnostics and suggestions.

1. Launch Ollama on your computer.
2. Open a terminal and download the default coding models:
   ```bash
   # Primary coding assistant model
   ollama pull deepseek-coder:1.3b

   # Heavy/advanced analysis model (Optional)
   ollama pull deepseek-coder:6.7b
   ```

---

## ⚡ How to Run CodeAps

### 🖥️ Windows (Automatic Startup)
The easiest way to start all services on Windows is by using the pre-configured startup script:
1. Double-click the file named `start_services.bat` at the root of the project.
2. The script will automatically:
   * Terminate any conflicting processes on standard ports.
   * Start the local Ollama service.
   * Start the FastAPI sidecar server.
   * Start the Tauri desktop development server.

---

### 💻 Manual Startup (All Platforms)
If you prefer running services manually or are on macOS/Linux, follow these steps in separate terminal windows:

#### Terminal 1: Start Python FastAPI Backend
```bash
cd backend-python
# Activate virtual environment
venv\Scripts\activate   # (or source venv/bin/activate on Unix)
# Run backend
run_backend.bat          # (or uvicorn app.main:app --port 8000 --reload)
```

#### Terminal 2: Run Tauri Desktop App
```bash
# From the root directory
npm run tauri dev
```

---

## 🔍 Troubleshooting & FAQs

* **Port Conflicts:** The backend runs on port `8000` and Vite runs on port `5173`. Make sure these ports are free before starting.
* **Rust Compiling Errors:** Make sure `cargo` and `rustc` are added to your system's environment variables (PATH). You can verify this by running `cargo --version`.
* **Missing Models:** If CodeAps can't generate suggestions, verify that your local Ollama server is running (`ollama serve`) and the models have been successfully downloaded using `ollama list`.

---

Happy Coding with **CodeAps**! 💻✨
