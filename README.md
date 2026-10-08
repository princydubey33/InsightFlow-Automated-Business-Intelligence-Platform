# InsightFlow

InsightFlow is an Automated Business Intelligence Platform that allows users to upload datasets (CSV/Excel), automatically analyze data quality, generate business analytics, discover insights, and query the data using an AI Assistant.

## Prerequisites

- Node.js (v18+)
- Python (v3.9+)

## Setup Instructions

### 1. Environment Configuration

1. Copy the example `.env` files and configure them:
   - Root directory (Frontend): `cp .env.example .env`
   - Backend directory: `cp backend/.env.example backend/.env`
2. Update the `.env` files with your actual configuration (API keys, ports, etc.). **Never commit real API keys.**

### 2. Backend Setup

```bash
cd backend
python -m venv venv
# On Windows
venv\Scripts\activate
# On Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```
The backend API will run at `http://127.0.0.1:8000`.

### 3. Frontend Setup

In a new terminal window:
```bash
# From the project root directory
npm install
npm run dev
```
The frontend will be available at `http://localhost:5173`.

## Building for Production

### Frontend
```bash
npm run build
```
This generates the production bundle in the `dist` directory.

### Backend
For production, use a production-ready ASGI server like Gunicorn with Uvicorn workers:
```bash
cd backend
pip install gunicorn
gunicorn -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000
```
Ensure CORS origins and other production variables are correctly set in the `backend/.env` file.
