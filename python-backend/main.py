from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict

from pipeline import MAX_PDF_BYTES, PipelineError, analyze_drive_resume, analyze_pdf_bytes


app = FastAPI(title="AI Resume Analyzer - Python PDF Pipeline")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
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
    if resume.content_type != "application/pdf":
        raise HTTPException(
            status_code=415,
            detail={"success": False, "code": "file_not_pdf"},
        )

    pdf_bytes = await resume.read(MAX_PDF_BYTES + 1)
    await resume.close()
    try:
        return analyze_pdf_bytes(pdf_bytes, "upload")
    except PipelineError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"success": False, "code": exc.code},
        ) from None
