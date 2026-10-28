
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("node:path");
const { PDFParse } = require("pdf-parse");
const WordExtractor = require("word-extractor");
const yauzl = require("yauzl");
const { createResumeAnalysisRouter } = require("./routes/resumeAnalysis");
const { createCareerMatchingRouter } = require("./routes/careerMatching");
const { createResumeQualityRouter } = require("./routes/resumeQuality");
const { validateResumeContent } = require("./services/resumeValidation");
require("dotenv").config({ quiet: true });

const app = express();
const PORT = process.env.PORT || 5001;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const PDF_SIGNATURE = Buffer.from("%PDF-");
const OLE_SIGNATURE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const ZIP_SIGNATURES = [
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.from([0x50, 0x4b, 0x05, 0x06]),
  Buffer.from([0x50, 0x4b, 0x07, 0x08]),
];
const WORD_DOCUMENT_STREAM = Buffer.from("WordDocument", "utf16le");
const INVALID_FILE_MESSAGE = "Please upload a valid resume file (PDF, DOC, or DOCX only).";
const MAX_DOCX_ENTRIES = 500;
const MAX_DOCX_UNCOMPRESSED_BYTES = 20 * 1024 * 1024;
const MAX_DOCX_ENTRY_BYTES = 10 * 1024 * 1024;
const MIME_TYPES_BY_EXTENSION = {
  ".pdf": new Set(["application/pdf", "application/x-pdf", "application/octet-stream"]),
  ".doc": new Set([
    "application/msword",
    "application/vnd.ms-word",
    "application/x-ole-storage",
    "application/cdfv2",
    "application/octet-stream",
  ]),
  ".docx": new Set([
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
    "application/x-zip-compressed",
    "application/octet-stream",
  ]),
};
const wordExtractor = new WordExtractor();

function invalidFileError() {
  const error = new Error(INVALID_FILE_MESSAGE);
  error.code = "INVALID_FILE_TYPE";
  return error;
}

function validateFileMetadata(originalname, mimetype) {
  const extension = path.extname(originalname || "").toLowerCase();
  const allowedMimes = MIME_TYPES_BY_EXTENSION[extension];
  const normalizedMime = String(mimetype || "").split(";", 1)[0].trim().toLowerCase();
  if (!allowedMimes || (normalizedMime && !allowedMimes.has(normalizedMime))) {
    throw invalidFileError();
  }
  return extension.slice(1);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    try {
      validateFileMetadata(file.originalname, file.mimetype);
    } catch (error) {
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

function detectFileType(buffer, originalname, mimetype) {
  const fileType = validateFileMetadata(originalname, mimetype);
  if (fileType === "pdf" && hasPdfSignature(buffer)) return fileType;
  if (
    fileType === "doc" &&
    buffer.subarray(0, OLE_SIGNATURE.length).equals(OLE_SIGNATURE) &&
    buffer.includes(WORD_DOCUMENT_STREAM)
  ) {
    return fileType;
  }
  if (
    fileType === "docx" &&
    ZIP_SIGNATURES.some((signature) => buffer.subarray(0, signature.length).equals(signature)) &&
    buffer.includes(Buffer.from("[Content_Types].xml")) &&
    buffer.includes(Buffer.from("word/document.xml"))
  ) {
    return fileType;
  }
  throw invalidFileError();
}

function validateDocxArchive(buffer) {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(
      buffer,
      { lazyEntries: true, autoClose: true, validateEntrySizes: true },
      (openError, archive) => {
        if (openError || !archive) return reject(invalidFileError());

        let entryCount = 0;
        let totalUncompressed = 0;
        const entryNames = new Set();
        const rejectArchive = () => {
          archive.close();
          reject(invalidFileError());
        };

        archive.on("entry", (entry) => {
          entryCount += 1;
          totalUncompressed += entry.uncompressedSize;
          const normalizedName = entry.fileName.replaceAll("\\", "/");
          const pathParts = normalizedName.split("/").filter(Boolean);
          if (
            entryCount > MAX_DOCX_ENTRIES ||
            entry.uncompressedSize > MAX_DOCX_ENTRY_BYTES ||
            totalUncompressed > MAX_DOCX_UNCOMPRESSED_BYTES ||
            normalizedName.startsWith("/") ||
            pathParts.includes("..") ||
            (entry.generalPurposeBitFlag & 0x1) !== 0
          ) {
            rejectArchive();
            return;
          }
          entryNames.add(normalizedName);
          archive.readEntry();
        });
        archive.once("error", () => reject(invalidFileError()));
        archive.once("end", () => {
          if (
            !entryNames.has("[Content_Types].xml") ||
            !entryNames.has("word/document.xml")
          ) {
            reject(invalidFileError());
            return;
          }
          resolve();
        });
        archive.readEntry();
      },
    );
  });
}

async function extractDocumentText(buffer, fileType) {
  if (fileType === "pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      if (!Number.isInteger(result.total) || result.total < 1) {
        const error = new Error("The PDF does not contain any readable pages.");
        error.code = "UNREADABLE_PAGES";
        throw error;
      }
      return {
        text: result.pages.map((page) => page.text.trim()).filter(Boolean).join("\n\n"),
        pageCount: result.total,
      };
    } finally {
      try {
        await parser.destroy();
      } catch {
        // Parsing has already completed or failed.
      }
    }
  }

  try {
    if (fileType === "docx") await validateDocxArchive(buffer);
    const document = await wordExtractor.extract(buffer);
    const text = [
      document.getHeaders?.(),
      document.getBody?.(),
      document.getFootnotes?.(),
      document.getEndnotes?.(),
    ]
      .filter(Boolean)
      .join("\n\n");
    return { text, pageCount: null };
  } catch (error) {
    const invalid = invalidFileError();
    invalid.cause = error;
    throw invalid;
  }
}

function handleUploadError(error, res) {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        message: "The resume file is too large. The maximum allowed size is 5 MB.",
      });
    }

    return res.status(400).json({
      success: false,
      message: "The resume upload could not be processed.",
    });
  }

  if (error?.code === "INVALID_FILE_TYPE") {
    return res.status(415).json({
      success: false,
      code: "invalid_resume_file",
      message: error.message,
    });
  }

  return res.status(400).json({
    success: false,
    message: "The resume upload could not be processed.",
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
        message: "Attach one PDF, DOC, or DOCX file using the form field named 'resume'.",
      });
    }

    const uploadedBuffer = req.file.buffer;

    try {
      const fileType = detectFileType(
        uploadedBuffer,
        req.file.originalname,
        req.file.mimetype,
      );
      const result = await extractDocumentText(uploadedBuffer, fileType);
      const text = result.text;

      const cleanText = text.trim();
      const nonSpaceLength = cleanText.replace(/\s+/g, "").length;

      if (!cleanText || nonSpaceLength < 30) {
        return res.status(422).json({
          success: false,
          code: "UNREADABLE_TEXT",
          message:
            "We couldn't extract readable text. Please upload a text-based resume file.",
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
          pageCount: result.pageCount,
          fileType: fileType.toUpperCase(),
          fileSizeBytes: req.file.size,
        },
      });
    } catch (parseError) {
      if (parseError?.code === "INVALID_FILE_TYPE") {
        return res.status(415).json({
          success: false,
          code: "invalid_resume_file",
          message: INVALID_FILE_MESSAGE,
        });
      }
      if (parseError?.code === "UNREADABLE_PAGES") {
        return res.status(422).json({
          success: false,
          code: parseError.code,
          message: parseError.message,
        });
      }
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
        code: "UNREADABLE_DOCUMENT",
        message:
          "The resume file could not be read. It may be malformed, password-protected, or unsupported.",
      });
    } finally {
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
