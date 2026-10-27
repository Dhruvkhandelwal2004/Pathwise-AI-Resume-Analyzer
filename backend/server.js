
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("node:path");
const { PDFParse } = require("pdf-parse");
const { createResumeAnalysisRouter } = require("./routes/resumeAnalysis");
const { createCareerMatchingRouter } = require("./routes/careerMatching");
const { createResumeQualityRouter } = require("./routes/resumeQuality");
const { validateResumeContent } = require("./services/resumeValidation");
require("dotenv").config({ quiet: true });

const app = express();
const PORT = process.env.PORT || 5000;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const PDF_SIGNATURE = Buffer.from("%PDF-");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (file.mimetype !== "application/pdf" || (file.originalname && ext !== ".pdf")) {
      const error = new Error("Only PDF files are accepted.");
      error.code = "INVALID_FILE_TYPE";
      return callback(error);
    }

    callback(null, true);
  },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: "128kb" }));

// Health check route
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "AI Resume Analyzer backend is running!",
  });
});

function hasPdfSignature(buffer) {
  return (
    Buffer.isBuffer(buffer) &&
    buffer.length >= PDF_SIGNATURE.length &&
    buffer.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE)
  );
}

function handleUploadError(error, res) {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        message: "The PDF is too large. The maximum allowed size is 5 MB.",
      });
    }

    return res.status(400).json({
      success: false,
      message: "The PDF upload could not be processed.",
    });
  }

  if (error?.code === "INVALID_FILE_TYPE") {
    return res.status(415).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(400).json({
    success: false,
    message: "The PDF upload could not be processed.",
  });
}

app.post("/api/resumes/upload", (req, res) => {
  upload.single("resume")(req, res, async (uploadError) => {
    if (uploadError) {
      return handleUploadError(uploadError, res);
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Attach one PDF using the form field named 'resume'.",
      });
    }

    const uploadedBuffer = req.file.buffer;
    let parser;

    try {
      const ext = path.extname(req.file.originalname || "").toLowerCase();
      if (req.file.originalname && ext !== ".pdf") {
        return res.status(415).json({
          success: false,
          message: "Only PDF files are accepted.",
        });
      }

      if (!hasPdfSignature(uploadedBuffer)) {
        return res.status(415).json({
          success: false,
          message: "The uploaded file does not have a valid PDF signature.",
        });
      }

      parser = new PDFParse({ data: uploadedBuffer });
      const result = await parser.getText();
      const text = result.pages
        .map((page) => page.text.trim())
        .filter(Boolean)
        .join("\n\n");

      if (!Number.isInteger(result.total) || result.total < 1) {
        return res.status(422).json({
          success: false,
          code: "UNREADABLE_PAGES",
          message: "The PDF does not contain any readable pages.",
        });
      }

      const cleanText = text.trim();
      const nonSpaceLength = cleanText.replace(/\s+/g, "").length;

      if (!cleanText || nonSpaceLength < 30) {
        return res.status(422).json({
          success: false,
          code: "UNREADABLE_TEXT",
          message:
            "We couldn't extract readable text. Please upload a text-based PDF.",
        });
      }

      const validation = validateResumeContent(cleanText);
      if (!validation.isValid) {
        return res.status(422).json({
          success: false,
          code: validation.code,
          message: validation.message,
        });
      }

      return res.status(200).json({
        success: true,
        text: cleanText,
        metadata: {
          pageCount: result.total,
          fileSizeBytes: req.file.size,
        },
      });
    } catch (parseError) {
      const errMsg = String(parseError?.message || "").toLowerCase();
      if (errMsg.includes("password") || errMsg.includes("encrypt")) {
        return res.status(422).json({
          success: false,
          code: "PROTECTED_PDF",
          message: "Password-protected or encrypted PDFs are not supported.",
        });
      }
      return res.status(422).json({
        success: false,
        code: "UNREADABLE_PDF",
        message:
          "The PDF could not be read. It may be malformed, password-protected, or unsupported.",
      });
    } finally {
      if (parser) {
        try {
          await parser.destroy();
        } catch {
          // Parsing has already finished or failed; there is nothing else to release.
        }
      }

      uploadedBuffer.fill(0);
      req.file.buffer = null;
    }
  });
});

app.use("/api/resumes", createResumeAnalysisRouter());
app.use("/api/resumes", createResumeQualityRouter());
app.use("/api/careers", createCareerMatchingRouter());

app.use((error, req, res, next) => {
  if (error?.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "The request body is too large.",
    });
  }

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({
      success: false,
      message: "The request body must contain valid JSON.",
    });
  }

  next(error);
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
  });
}

module.exports = app;
