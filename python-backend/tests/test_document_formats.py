import io
import struct
import unittest
import zipfile
from math import ceil

from pipeline import (
    PipelineError,
    detect_document_type,
    extract_document_text,
    validate_document_metadata,
)


END_OF_CHAIN = 0xFFFFFFFE
FREE_SECTOR = 0xFFFFFFFF
FAT_SECTOR = 0xFFFFFFFD
SECTOR_SIZE = 512


def make_pdf(text: str) -> bytes:
    content = f"BT\n/F1 18 Tf\n72 720 Td\n({text}) Tj\nET"
    objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        f"<< /Length {len(content.encode())} >>\nstream\n{content}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    pdf = "%PDF-1.4\n"
    offsets = [0]
    for index, value in enumerate(objects, start=1):
        offsets.append(len(pdf.encode()))
        pdf += f"{index} 0 obj\n{value}\nendobj\n"
    xref_offset = len(pdf.encode())
    pdf += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n"
    pdf += "".join(f"{offset:010d} 00000 n \n" for offset in offsets[1:])
    pdf += (
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
        f"startxref\n{xref_offset}\n%%EOF\n"
    )
    return pdf.encode()


def make_docx(text: str) -> bytes:
    target = io.BytesIO()
    content_types = """<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>"""
    document = f"""<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p><w:r><w:t>{text}</w:t></w:r></w:p></w:body>
</w:document>"""
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types)
        archive.writestr("word/document.xml", document)
    return target.getvalue()


def _directory_entry(name: str, object_type: int, start_sector: int, size: int) -> bytes:
    raw = bytearray(128)
    encoded_name = name.encode("utf-16le") + b"\x00\x00"
    raw[: len(encoded_name)] = encoded_name
    struct.pack_into("<H", raw, 64, len(encoded_name))
    raw[66] = object_type
    struct.pack_into("<III", raw, 68, FREE_SECTOR, FREE_SECTOR, FREE_SECTOR)
    struct.pack_into("<I", raw, 116, start_sector)
    struct.pack_into("<Q", raw, 120, size)
    return bytes(raw)


def _make_ole_file(streams: dict[str, bytes]) -> bytes:
    sector_payloads: list[bytes] = [b"", b""]
    stream_locations: dict[str, tuple[int, int]] = {}
    fat_entries = [END_OF_CHAIN, FAT_SECTOR]

    for name, payload in streams.items():
        start_sector = len(sector_payloads)
        sector_count = max(1, ceil(len(payload) / SECTOR_SIZE))
        stream_locations[name] = (start_sector, len(payload))
        padded = payload.ljust(sector_count * SECTOR_SIZE, b"\x00")
        for index in range(sector_count):
            sector_payloads.append(
                padded[index * SECTOR_SIZE : (index + 1) * SECTOR_SIZE]
            )
            current_sector = start_sector + index
            fat_entries.append(
                END_OF_CHAIN if index == sector_count - 1 else current_sector + 1
            )

    directory = bytearray()
    directory.extend(_directory_entry("Root Entry", 5, END_OF_CHAIN, 0))
    for name, (start_sector, size) in stream_locations.items():
        directory.extend(_directory_entry(name, 2, start_sector, size))
    sector_payloads[0] = bytes(directory).ljust(SECTOR_SIZE, b"\x00")
    sector_payloads[1] = struct.pack(
        "<128I",
        *fat_entries,
        *([FREE_SECTOR] * (128 - len(fat_entries))),
    )

    header = bytearray(SECTOR_SIZE)
    header[:8] = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"
    struct.pack_into("<H", header, 0x1A, 3)
    struct.pack_into("<H", header, 0x1C, 0xFFFE)
    struct.pack_into("<H", header, 0x1E, 9)
    struct.pack_into("<H", header, 0x20, 6)
    struct.pack_into("<I", header, 0x2C, 1)
    struct.pack_into("<I", header, 0x30, 0)
    struct.pack_into("<I", header, 0x38, 0)
    struct.pack_into("<I", header, 0x3C, END_OF_CHAIN)
    struct.pack_into("<I", header, 0x40, 0)
    struct.pack_into("<I", header, 0x44, END_OF_CHAIN)
    struct.pack_into("<I", header, 0x48, 0)
    struct.pack_into("<I", header, 0x4C, 1)
    for offset in range(0x50, 0x4C + 109 * 4, 4):
        struct.pack_into("<I", header, offset, FREE_SECTOR)
    return bytes(header) + b"".join(sector_payloads)


def make_doc(text: str) -> bytes:
    text_bytes = text.encode("utf-16le")
    fc_min = 0x44
    fc_mac = fc_min + len(text_bytes)
    word_document = bytearray(fc_mac)
    struct.pack_into("<H", word_document, 0x0A, 0)
    struct.pack_into("<II", word_document, 0x18, fc_min, fc_mac)
    word_document[fc_min:fc_mac] = text_bytes

    piece_table = (
        struct.pack("<II", 0, len(text))
        + b"\x00\x00"
        + struct.pack("<I", fc_min)
        + b"\x00\x00"
    )
    table_stream = b"\x02" + struct.pack("<I", len(piece_table)) + piece_table
    return _make_ole_file(
        {"WordDocument": bytes(word_document), "0Table": table_stream}
    )


class SupportedDocumentTests(unittest.TestCase):
    def test_extracts_valid_pdf_doc_and_docx_files(self):
        resume_text = "Jane Doe Resume Experience Education Skills Projects"
        fixtures = [
            ("resume.pdf", "application/pdf", make_pdf(resume_text), "pdf"),
            ("resume.doc", "application/msword", make_doc(resume_text), "doc"),
            (
                "resume.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                make_docx(resume_text),
                "docx",
            ),
        ]

        for filename, mime_type, data, expected_type in fixtures:
            with self.subTest(filename=filename):
                detected = detect_document_type(data, filename, mime_type)
                text, _ = extract_document_text(data, detected)
                self.assertEqual(detected, expected_type)
                self.assertIn("Jane Doe", text)
                self.assertIn("Experience", text)


class RejectedDocumentTests(unittest.TestCase):
    def assert_invalid(self, callback):
        with self.assertRaises(PipelineError) as context:
            callback()
        self.assertEqual(context.exception.code, "invalid_resume_file")
        self.assertEqual(context.exception.status_code, 415)

    def test_rejects_unsupported_extensions(self):
        rejected = [
            ("resume.csv", "text/csv"),
            ("resume.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
            ("resume.ppt", "application/vnd.ms-powerpoint"),
            ("resume.jpg", "image/jpeg"),
            ("resume.jpeg", "image/jpeg"),
            ("resume.svg", "image/svg+xml"),
            ("resume.webp", "image/webp"),
            ("resume.png", "image/png"),
            ("resume.zip", "application/zip"),
        ]
        for filename, mime_type in rejected:
            with self.subTest(filename=filename):
                self.assert_invalid(
                    lambda filename=filename, mime_type=mime_type: validate_document_metadata(
                        filename, mime_type
                    )
                )

    def test_rejects_mime_mismatch(self):
        self.assert_invalid(
            lambda: detect_document_type(
                make_pdf("Resume Experience Skills"),
                "resume.pdf",
                "image/png",
            )
        )

    def test_rejects_renamed_non_resume_files(self):
        renamed_xlsx = io.BytesIO()
        with zipfile.ZipFile(renamed_xlsx, "w") as archive:
            archive.writestr("[Content_Types].xml", "spreadsheet")
            archive.writestr("xl/workbook.xml", "workbook")

        renamed_xls = (
            b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"
            + "Workbook".encode("utf-16le")
        )
        rejected = [
            (b"\x89PNG\r\n\x1a\n", "renamed.pdf", "application/pdf"),
            (
                renamed_xlsx.getvalue(),
                "renamed.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ),
            (renamed_xls, "renamed.doc", "application/msword"),
        ]

        for data, filename, mime_type in rejected:
            with self.subTest(filename=filename):
                self.assert_invalid(
                    lambda data=data, filename=filename, mime_type=mime_type: detect_document_type(
                        data, filename, mime_type
                    )
                )


if __name__ == "__main__":
    unittest.main()

