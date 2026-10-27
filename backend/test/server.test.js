const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../server");

let server;
let baseUrl;

function createPdf(text = "") {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const content = lines.length
    ? `BT\n/F1 12 Tf\n72 720 Td\n${lines
      .map((line, index) => {
        const escaped = line.replace(/([\\()])/g, "\\$1");
        return `${index ? "0 -18 Td\n" : ""}(${escaped}) Tj`;
      })
      .join("\n")}\nET`
    : "";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf);
}

const VALID_RESUME_TEXT = `
Sarah Jenkins
Email: sarah.jenkins@example.com | Phone: 15550192834
PROFESSIONAL SUMMARY
Senior Software Engineer with six years of experience building backend systems.
WORK EXPERIENCE
Senior Backend Engineer | CloudScale Tech | 2021 - Present
Developed and deployed REST API services using Python and PostgreSQL.
Reduced database query latency through query optimization.
EDUCATION
BS in Computer Science | University of California | 2018
TECHNICAL SKILLS
Python, Go, JavaScript, SQL, AWS, Docker, Kubernetes
PROJECTS
Built a portfolio application with React and Node.js.
`;

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZip(entries) {
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  for (const [name, value] of Object.entries(entries)) {
    const fileName = Buffer.from(name);
    const data = Buffer.from(value);
    const checksum = crc32(data);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(fileName.length, 26);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(fileName.length, 28);
    centralHeader.writeUInt32LE(localOffset, 42);

    localParts.push(localHeader, fileName, data);
    centralParts.push(centralHeader, fileName);
    localOffset += localHeader.length + fileName.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(Object.keys(entries).length, 8);
  endRecord.writeUInt16LE(Object.keys(entries).length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...localParts, centralDirectory, endRecord]);
}

function createDocx(text) {
  return createZip({
    "[Content_Types].xml": `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    "word/document.xml": `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`,
  });
}

async function upload(buffer, options = {}) {
  const form = new FormData();
  form.append(
    options.fieldName || "resume",
    new Blob([buffer], { type: options.type || "application/pdf" }),
    options.fileName || "resume.pdf",
  );

  return fetch(`${baseUrl}/api/resumes/upload`, {
    method: "POST",
    body: form,
  });
}

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("keeps the health endpoint available", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();

  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.success, true);
});

test("extracts text and page count from a valid PDF", async () => {
  const response = await upload(
    createPdf(VALID_RESUME_TEXT),
  );
  const body = await response.json();

  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.success, true);
  assert.match(body.text, /Sarah Jenkins/);
  assert.equal(body.metadata.pageCount, 1);
  assert.equal(typeof body.metadata.fileSizeBytes, "number");
});

test("extracts text from a valid DOCX resume", async () => {
  const text = VALID_RESUME_TEXT;
  const fixtures = [
    {
      buffer: createDocx(text),
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileName: "resume.docx",
      expectedType: "DOCX",
    },
  ];

  for (const fixture of fixtures) {
    const response = await upload(fixture.buffer, fixture);
    const body = await response.json();
    assert.equal(response.status, 200, JSON.stringify(body));
    assert.match(body.text, /Sarah Jenkins/);
    assert.equal(body.metadata.fileType, fixture.expectedType);
  }
});

test("rejects requests without a resume", async () => {
  const response = await fetch(`${baseUrl}/api/resumes/upload`, {
    method: "POST",
  });

  assert.equal(response.status, 400);
});

test("rejects unsupported file types", async () => {
  const response = await upload(Buffer.from("plain text"), {
    type: "text/plain",
    fileName: "resume.txt",
  });

  assert.equal(response.status, 415);
});

test("rejects image, CSV, spreadsheet, presentation, ZIP, and renamed files", async () => {
  const rejected = [
    ["resume.csv", "text/csv", Buffer.from("name,skills")],
    ["resume.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", Buffer.from("PK")],
    ["resume.ppt", "application/vnd.ms-powerpoint", Buffer.from("presentation")],
    ["resume.jpg", "image/jpeg", Buffer.from([0xff, 0xd8, 0xff])],
    ["resume.png", "image/png", Buffer.from("89504e47", "hex")],
    ["resume.zip", "application/zip", createZip({ "file.txt": "text" })],
    ["renamed.pdf", "application/pdf", Buffer.from("89504e47", "hex")],
    ["renamed.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", createZip({ "xl/workbook.xml": "sheet" })],
  ];

  for (const [fileName, type, buffer] of rejected) {
    const response = await upload(buffer, { fileName, type });
    assert.equal(response.status, 415, fileName);
  }
});

test("rejects a spoofed PDF without the PDF signature", async () => {
  const response = await upload(Buffer.from("not really a PDF"));

  assert.equal(response.status, 415);
});

test("rejects malformed PDFs safely", async () => {
  const response = await upload(Buffer.from("%PDF-1.4\nnot a real document"));

  assert.equal(response.status, 422);
});

test("rejects PDFs without extractable text", async () => {
  const response = await upload(createPdf());

  assert.equal(response.status, 422);
});

test("rejects PDFs larger than 5 MB", async () => {
  const oversizedPdf = Buffer.alloc(5 * 1024 * 1024 + 1);
  oversizedPdf.write("%PDF-");
  const response = await upload(oversizedPdf);

  assert.equal(response.status, 413);
});
