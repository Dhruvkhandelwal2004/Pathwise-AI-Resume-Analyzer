const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../server");

let server;
let baseUrl;

function createPdf(text = "") {
  const content = text
    ? `BT\n/F1 18 Tf\n72 720 Td\n(${text}) Tj\nET`
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

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
});

test("extracts text and page count from a valid PDF", async () => {
  const response = await upload(createPdf("Hello Resume"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.match(body.text, /Hello Resume/);
  assert.equal(body.metadata.pageCount, 1);
  assert.equal(typeof body.metadata.fileSizeBytes, "number");
});

test("rejects requests without a resume", async () => {
  const response = await fetch(`${baseUrl}/api/resumes/upload`, {
    method: "POST",
  });

  assert.equal(response.status, 400);
});

test("rejects non-PDF MIME types", async () => {
  const response = await upload(Buffer.from("plain text"), {
    type: "text/plain",
    fileName: "resume.txt",
  });

  assert.equal(response.status, 415);
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
