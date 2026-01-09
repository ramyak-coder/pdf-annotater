import React, { useEffect, useRef, useState } from "react";
import SvgOverlay from "./SvgOverlay";
import Tesseract from "tesseract.js";
import { exportAnnotatedPdf } from "../pdf-export.js";

// OCR upscale scale for higher accuracy
const OCR_SCALE = 2;

export default function PdfPageView({ pdf, pageNumber, tool, onSetPageTitle }) {
  const canvasRef = useRef(null);
  const [page, setPage] = useState(null);
  const [viewport, setViewport] = useState(null);
  const [objects, setObjects] = useState([]); // per-page annotations
  const dragRef = useRef(null);
  const [rect, setRect] = useState(null);
  const [info, setInfo] = useState("");
  const [scannedText, setScannedText] = useState([]);
  const containerRef = useRef(null);

  const clearScanArtifacts = () => {
    // remove callouts for THIS page only
    setObjects([]);

    // clear scan rect
    setRect(null);

    // clear OCR text
    setInfo("");
  };

  const cleanTextArray = (arr) => {
    return arr
      .map((s) => s.trim())
      .filter((str) => {
        if (!str) return false; // empty
        if (str.length < 3) return false; // min length
        if (/^\d/.test(str)) return false; // starts with number
        if (/^[A-Z]\d+/i.test(str)) return false; // A101, B202
        return true;
      });
  };

  // ---------- FAST TEXT EXTRACTION (PDF.js) ----------
  const extractPageText = async (page) => {
    const content = await page.getTextContent();
    const raw = content.items.map((i) => i.str);
    return cleanTextArray(raw);
  };

  // ---------- OCR FALLBACK ----------
  const ocrFullPage = async (page) => {
    const viewport = page.getViewport({ scale: 2 });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));

    const result = await Tesseract.recognize(blob, "eng");
    const raw = result.data.text.split("\n").map((l) => l.trim());

    return cleanTextArray(raw);
  };

  const scanEntirePdf = async () => {
    if (!pdf) return;

    setInfo("Scanning entire PDF...");

    const page = await pdf.getPage(pageNumber);

    // 1️⃣ Try PDF text
    let text = await extractPageText(page);

    // 2️⃣ Fallback to OCR
    if (!text) {
      text = await ocrFullPage(page);
    }

    if (text) {
      setScannedText(text);
      // update title ONLY
      // onSetPageTitle(i, text.split("\n")[0].slice(0, 120));
    }

    // scanning all the pages and get scanned text
    /*
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);

      // 1️⃣ Try PDF text
      let text = await extractPageText(page);

      // 2️⃣ Fallback to OCR
      if (!text) {
        text = await ocrFullPage(page);
      }

      if (text) {
        console.log("text....", text);
        // update title ONLY
        // onSetPageTitle(i, text.split("\n")[0].slice(0, 120));
      }
    }

    */

    setInfo("PDF scan completed");
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      const p = await pdf.getPage(pageNumber);
      if (!mounted) return;

      const unscaled = p.getViewport({ scale: 1 }); // natural size

      // Fit to container width
      const cw = containerRef.current.clientWidth;
      const scale = cw / unscaled.width;

      const vp = p.getViewport({ scale });

      setPage(p);
      setViewport(vp);
    })();

    return () => (mounted = false);
  }, [pdf, pageNumber]);

  useEffect(() => {
    if (!page || !viewport) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);

    canvas.style.width = viewport.width + "px";
    canvas.style.height = viewport.height + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const task = page.render({ canvasContext: ctx, viewport });

    return () => task.cancel?.();
  }, [page, viewport]);

  // OCR: crop region from canvas → upscale → blob → tesseract recognize with rotations
  const ocrRegion = async (r) => {
    const canvas = canvasRef.current;
    const crop = document.createElement("canvas");
    crop.width = Math.max(1, Math.round(r.w * OCR_SCALE));
    crop.height = Math.max(1, Math.round(r.h * OCR_SCALE));
    const cctx = crop.getContext("2d");
    cctx.imageSmoothingEnabled = true;
    cctx.drawImage(canvas, r.x, r.y, r.w, r.h, 0, 0, crop.width, crop.height);

    const rotateCanvas = (src, angle) => {
      const w = src.width,
        h = src.height;
      const tmp = document.createElement("canvas");
      if (angle === 90 || angle === 270) {
        tmp.width = h;
        tmp.height = w;
      } else {
        tmp.width = w;
        tmp.height = h;
      }
      const tctx = tmp.getContext("2d");
      tctx.translate(tmp.width / 2, tmp.height / 2);
      tctx.rotate((angle * Math.PI) / 180);
      tctx.drawImage(src, -w / 2, -h / 2);
      return tmp;
    };

    const angles = [0, 90, 180, 270];
    let best = { text: "", conf: -1 };
    for (const a of angles) {
      const cv = rotateCanvas(crop, a);
      const blob = await new Promise((r) => cv.toBlob(r, "image/png"));
      try {
        const res = await Tesseract.recognize(blob, "eng", {
          logger: (m) => {},
        });
        const conf = res?.data?.confidence || 0;
        const text = (res?.data?.text || "").trim();
        if (text && conf > best.conf) best = { text, conf };
      } catch (err) {
        console.warn("tesseract failed angle", a, err);
      }
    }
    return best.text;
  };

  const normalize = (r) => ({
    x: Math.round(Math.min(r.x, r.x + r.w)),
    y: Math.round(Math.min(r.y, r.y + r.h)),
    w: Math.round(Math.abs(r.w)),
    h: Math.round(Math.abs(r.h)),
  });

  const handleDown = (e) => {
    if (tool !== "scan") return;
    const b = canvasRef.current.getBoundingClientRect();
    const start = { x: e.clientX - b.left, y: e.clientY - b.top };
    dragRef.current = start;
    setRect({ x: start.x, y: start.y, w: 0, h: 0 });
  };

  const handleMove = (e) => {
    if (!dragRef.current || tool !== "scan") return;
    const b = canvasRef.current.getBoundingClientRect();
    const cur = { x: e.clientX - b.left, y: e.clientY - b.top };
    const s = dragRef.current;
    setRect({ x: s.x, y: s.y, w: cur.x - s.x, h: cur.y - s.y });
  };

  const handleUp = async () => {
    if (!dragRef.current || tool !== "scan") return;
    dragRef.current = null;
    if (!rect) return;
    const r = normalize(rect);
    setRect(null);
    setInfo("Scanning...");
    const text = await ocrRegion(r);
    setInfo(text || "(no text)");
    const callout = {
      id: crypto.randomUUID(),
      type: "callout",
      point: { x: r.x + Math.floor(r.w / 2), y: r.y + Math.floor(r.h / 2) },
      boxX: r.x + r.w + 10,
      boxY: r.y,
      text,
    };
    setObjects((prev) => [...prev, callout]);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        background: "#fff",
        padding: 12,
        width: "100%",
        overflowX: "hidden",
      }}
    >
      <div style={{ marginBottom: 8 }}>
        <strong>Page {pageNumber}</strong>
        <span style={{ marginLeft: 12 }}>
          Mode: <em>{tool}</em>
        </span>

        <button
          style={{
            background: "#4b8aff",
            color: "#fff",
            border: "1px solid #ddd",
            padding: "8px 12px",
            borderRadius: 6,
            marginLeft: "10px",
          }}
          onClick={scanEntirePdf}
        >
          Scan Entire PDF
        </button>
        {scannedText.length > 0 && (
          <button
            style={{
              background: "#f72630ff",
              color: "#fff",
              border: "1px solid #ddd",
              padding: "8px 12px",
              borderRadius: 6,
              marginLeft: "10px",
            }}
            onClick={() => setScannedText([])}
          >
            Clear Scan
          </button>
        )}

        {scannedText.length > 0 && (
          <div>
            <pre>{scannedText}</pre>
          </div>
        )}
      </div>

      <div style={{ position: "relative" }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleDown}
          onMouseMove={handleMove}
          onMouseUp={handleUp}
          style={{ display: "block" }}
        />
        {rect && tool === "scan" && (
          <div
            style={{
              position: "absolute",
              left: rect.x,
              top: rect.y,
              width: rect.w,
              height: rect.h,
              border: "2px dashed rgba(255,0,0,0.9)",
              background: "rgba(255,0,0,0.06)",
              pointerEvents: "none",
            }}
          />
        )}
        {tool !== "scan" && viewport?.width && viewport?.height && (
          <SvgOverlay
            width={viewport.width}
            height={viewport.height}
            mode={tool === "scan" ? "scan" : "markup"}
            tool={tool}
            objects={objects}
            onChangeObjects={setObjects}
          />
        )}
      </div>

      <div style={{ marginTop: 8 }}>
        <em>{info}</em>

        {info && (
          <button
            style={{
              marginLeft: 12,
              padding: "4px 8px",
              cursor: "pointer",
            }}
            onClick={() => {
              onSetPageTitle(pageNumber, info);
              clearScanArtifacts();
            }}
          >
            Set Page Title
          </button>
        )}
      </div>
    </div>
  );
}
