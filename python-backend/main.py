import os

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict

from pipeline import (
    MAX_RESUME_BYTES,
    PipelineError,
    analyze_document_bytes,
    analyze_drive_resume,
    validate_document_metadata,
)


LOCAL_FRONTEND_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
CONFIGURED_FRONTEND_ORIGINS = [
    origin.strip().rstrip("/")
    for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
]


app = FastAPI(title="AI Resume Analyzer - Document Pipeline")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[*LOCAL_FRONTEND_ORIGINS, *CONFIGURED_FRONTEND_ORIGINS],
    allow_origin_regex=(
        r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
        r"|^https://[a-z0-9-]+\.vercel\.app$"
    ),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class DriveResumeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    url: str


@app.get("/api/health")
def health() -> dict:
    return {"success": True, "message": "Python resume pipeline is running."}


@app.post("/api/resumes/analyze-drive")
def analyze_drive(request: DriveResumeRequest) -> dict:
    try:
        return analyze_drive_resume(request.url)
    except PipelineError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"success": False, "code": exc.code},
        ) from None


@app.post("/api/resumes/analyze-upload")
async def analyze_upload(resume: UploadFile = File(...)) -> dict:
    try:
        validate_document_metadata(resume.filename, resume.content_type)
    except PipelineError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"success": False, "code": exc.code},
        ) from None

    document_bytes = await resume.read(MAX_RESUME_BYTES + 1)
    await resume.close()
    try:
        return analyze_document_bytes(
            document_bytes,
            "upload",
            resume.filename,
            resume.content_type,
        )
    except PipelineError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"success": False, "code": exc.code},
        ) from None
