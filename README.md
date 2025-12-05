# PDF Annotator (Vite + React)

A minimal Vite + React starter project for PDF annotation with:
- pdfjs-dist rendering (canvas)
- SVG overlay for annotations (pen, rect, text, callout, eraser)
- Tesseract.js OCR (high-DPI scanning)
- pdf-lib export helpers

Install:
  npm install

Run:
  npm run dev

Place your demo PDF in `public/sample.pdf` before running.

Notes:
- This project uses pdfjs-dist v5 which no longer includes SVG rendering; the PDF is drawn on canvas and annotation overlay is SVG.
- For production OCR performance, consider switching to Tesseract `createWorker()` pattern.
