# Image Controversy

## What this repository is

`Image-Controversy` is an AI-powered image editing prototype with a version-tree workflow.
It combines a FastAPI backend with a React + Vite frontend and stores image exploration sessions in MongoDB.

The app lets users:
- create an image "tree" session,
- upload a root image,
- apply AI-driven edits to generate child versions,
- and browse the edit history as a version tree.

The backend uses:
- FastAPI for HTTP routing,
- MongoDB for persistence,
- a Groq-based prompt classifier for instruction parsing,
- `rembg` for background removal,
- and a style-transfer pipeline (TensorFlow Hub's Magenta arbitrary style transfer model, with style reference images auto-fetched and cached via the Pexels API) for expressive image adjustments.

The frontend uses React, Vite, and UI libraries to interact with the API and render session state.

## Repository structure

- `/backend`
  - `app/main.py` — FastAPI app entrypoint
  - `app/api/endpoints/trees.py` — tree/session CRUD endpoints
  - `app/api/endpoints/images.py` — upload, parse, and edit image operations
  - `app/core/config.py` — environment config loading
  - `app/core/database.py` — MongoDB client and collection proxy
  - `app/services/` — image processing logic, Groq parsing, style-transfer, and background removal
  - `requirements.txt` — Python dependencies
  - `pyproject.toml` — project metadata
- `/frontend`
  - `package.json` — frontend dependencies and scripts
  - `vite.config.js` — Vite configuration
  - `src/` — React application source files

## Prerequisites

- Python 3.11+ for the backend
- Node.js 18+ (or compatible) for the frontend
- MongoDB (local install or Atlas cloud cluster — see setup below)
- Git (optional)

## Backend setup

1. Open a terminal in `backend/`

2. Create and activate a virtual environment (if not already present):

```bash
python -m venv .venv
source .venv/Scripts/activate   # Windows (Git Bash)
# or
source .venv/bin/activate       # Mac/Linux
```

You should see `(.venv)` appear at the start of your terminal prompt once activated. This needs to be done fresh in every new terminal tab/window you use for this project.

3. Install Python dependencies:

```bash
pip install -r requirements.txt
```

If this fails with a version-resolution error (e.g. `No matching distribution found for X==Y`), you're likely on a different Python version than whoever last generated this file. Either remove the `==version` pin for the specific failing package(s) and retry, or install that package's latest compatible version manually.

4. Set up MongoDB (choose ONE option):

   **Option A — MongoDB Atlas (cloud, recommended, no local install needed)**
   1. Sign up free at https://www.mongodb.com/cloud/atlas/register
   2. Create a free M0 cluster (no cost, no card required)
   3. Under **Database Access**, create a database user (username + password)
   4. Under **Network Access**, add `0.0.0.0/0` to allow connections from any IP (fine for development)
   5. Click **Connect** on your cluster → **Drivers** → copy the connection string
      (looks like `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/`)

   **Option B — Local MongoDB install**
   1. Download MongoDB Community Server: https://www.mongodb.com/try/download/community
   2. Run the installer, keeping **"Install MongoDB as a Service"** checked (default)
   3. This starts MongoDB automatically in the background — no manual `mongod` command needed
   4. Verify it's running:
```bash
      mongosh
```
      If this drops you into a `>` shell prompt, MongoDB is running. Type `exit` to leave.

5. Create a `.env` file in `backend/` (same folder as `requirements.txt` and `main.py`) with:

```env
GROQ_API_KEY=your_groq_api_key_here
MONGO_URI=mongodb://localhost:27017
DATABASE_NAME=your_database_name_here
PEXELS_API_KEY=your_pexels_api_key_here
```

   - `GROQ_API_KEY` — required for instruction parsing. Get one at https://console.groq.com/keys.
   - `MONGO_URI` — use `mongodb://localhost:27017` for a local install (Option B above), or your Atlas connection string for Option A.
   - `DATABASE_NAME` — any name you want MongoDB to use for this project's collections.
   - `PEXELS_API_KEY` —