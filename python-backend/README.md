# Python resume pipeline

This service downloads a public Google Drive PDF into memory, extracts text with
`pypdf`, and sends only the extracted text to Groq for JSON resume analysis.
The returned object is validated against strict Pydantic models before it reaches
the client. It does not save the PDF or extracted text to disk.

The response includes the candidate profile, education, explicit skills and
skill groups, projects, experience and internships, certifications,
achievements, activities, evidence quality, uncertainties, and evidence-linked
improvement actions. `educationScore` is calculated locally from section
completeness; it never rates an institution or a student's ability.

The service first reads `python-backend/.env` when present. For local migration it
falls back to the existing `backend/.env`; secret values are never printed.

## Run

```powershell
.\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Endpoint: `POST /api/resumes/analyze-drive`

```json
{
  "url": "https://drive.google.com/file/d/FILE_ID/view"
}
```

Local uploads use `POST /api/resumes/analyze-upload` with multipart field
`resume`.

## Safe command-line test

```powershell
.\venv\Scripts\python.exe .\test_drive_pipeline.py "GOOGLE_DRIVE_LINK"
```

The test prints counts and provider metadata only, not resume content or contact
details.
