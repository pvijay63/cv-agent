# CareerLens — CV ATS Analyzer & Job Match Agent

A local full-stack Windows development app. The frontend and backend now start together with **one command: `npm run dev`**.

## What is included

- Resume upload and text extraction for PDF, DOCX, PPTX, and TXT (8 MB default limit).
- Explainable ATS-style checklist and keyword alignment.
- Optional Groq-powered resume feedback and a full AI-enhanced resume text preview.
- Role-specific ATS-style score for the enhanced draft, shown alongside the original score.
- Editable enhancement draft, live document preview, change summary, matched/missing keywords, and TXT download.
- Resume keyword suggestions and DOCX/PDF downloads.
- Job-search links for common job portals.
- A refined animated dark interface with live backend connection status.
- Better API error messages for empty or non-JSON responses.

## Prerequisites

Install:
- **Python 3.11 or newer**
- **Node.js 20.19+ or 22.12+** (includes npm; required by the Vite version in the lockfile)

Check in PowerShell:
```powershell
py --version
node --version
npm --version
```

## Step-by-step: run the whole app

### 1. Extract the ZIP

Extract `CV_Job_Agent_Windows_Fixed.zip` to a folder you can write to, for example:
`C:\Users\YourName\Downloads\CV_Job_Agent_Windows`

Open PowerShell in the extracted `cv_job_agent` folder.

### 2. Set up Python dependencies (one time)

Run:
```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r backend\requirements.txt
```

If PowerShell blocks virtual-environment activation, run:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

If `py` is not recognized, install Python and select **Add Python to PATH** during setup.

### 3. Optional: configure Groq AI feedback

The local ATS checklist, keyword matching, and job links work without a Groq key.

To enable AI feedback:
```powershell
Copy-Item backend\.env.example backend\.env
notepad backend\.env
```
Add your key to `GROQ_API_KEY=` and save the file. Keep this key in `backend\.env` only; never put it in frontend code or share it publicly.

### 4. Install frontend packages (one time)

Open a **second PowerShell window** in the `cv_job_agent\frontend` folder and run:
```powershell
npm install
```

### 5. Start both services with one command

From that same `frontend` folder:
```powershell
npm run dev
```

This command starts:
- FastAPI backend at `http://127.0.0.1:8001`
- Vite frontend at `http://127.0.0.1:5173`

**You no longer need to start Uvicorn in a separate terminal.** The frontend terminal will show backend and frontend logs. Keep it open while using the app.

Open:
`http://127.0.0.1:5173`

The top-right status indicator should change to **API CONNECTED**. If it shows **API OFFLINE**, look at the same terminal for the Python error.

### 6. Test the backend (optional)

- Health check: `http://127.0.0.1:8001/health`
- API docs: `http://127.0.0.1:8001/docs`

### 7. Use the CV agent

1. Upload a text-based PDF, DOCX, PPTX, or TXT resume.
2. Enter your target role, location, and skills/keywords.
3. Select **Analyze CV & find jobs**.
4. Review the checklist, gaps, suggestions, optional AI feedback, and job-search links.
5. Use the keyword and resume update tools as appropriate.
6. Click **AI-enhance CV + check role ATS score** to generate a complete suggested rewrite and score that exact draft for the selected role in one request.
7. Review the change summary, edit the draft if needed, use **Recheck edited preview**, and download the enhanced text as TXT. The AI preview does not overwrite the original upload.

The enhancement feature requires a valid `GROQ_API_KEY` in `backend/.env`. Without it, the standard ATS checklist still works, but the enhancement endpoint returns a clear setup message. The generated file is currently a text file, not a layout-preserving DOCX/PDF export.

## Troubleshooting

### `Unexpected end of JSON input`
The frontend now checks the HTTP status and response body before parsing JSON. It should show a more useful error instead of the raw JSON parser exception.

### `ECONNREFUSED 127.0.0.1:8001` or `API OFFLINE`
1. Confirm you ran `npm run dev` **from the frontend folder**.
2. Look above the Vite logs in that same terminal for a Python import/dependency error.
3. Check that port 8001 is not occupied by another process.
4. Open `http://127.0.0.1:8001/health` to verify the backend.
5. If dependencies are missing, activate `.venv` from the project root and run `pip install -r backend\requirements.txt`.

### `Could not import module "backend.main"`
Run the combined command from `frontend`. The startup script sets the backend working directory to the project root automatically. Do not run `uvicorn main:app` from inside `frontend`.

### `ModuleNotFoundError`
Make sure the virtual environment is active and run:
```powershell
pip install -r backend\requirements.txt
```

### Port 8001 already in use
Stop the old backend process or close its terminal before running `npm run dev` again.

## Important notes

- The ATS score is a heuristic checklist, not an actual employer ATS score or a guarantee of interviews.
- Job links open search pages and do not guarantee a specific vacancy is active.
- Resume files are processed in memory by this app; AI feedback sends resume text to Groq only if you configure its API key.
- Do not upload sensitive documents unless you are comfortable with the processing setup.
