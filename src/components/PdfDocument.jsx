import React, { useEffect, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";
import PdfPageView from "./PdfPageView";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export default function PdfDocument({
  pdfUrl,
  tool,
  currentPage,
  onPageChange,
  pagesMeta,
  onPagesMeta,
  onSetPageTitle,
}) {
  const [pdf, setPdf] = useState(null);
  const [numPages, setNumPages] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const loading = pdfjs.getDocument(pdfUrl);
        const doc = await loading.promise;
        if (!mounted) return;

        setPdf(doc);
        setNumPages(doc.numPages);

        // Build metadata if first load
        const meta = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const existing = pagesMeta.find((x) => x.pageNumber === i);
          meta.push(
            existing || {
              pageNumber: i,
              title: "",
              thumbnailHtml: `<div style="font-size: 14px; width:100%;height:20px;display:flex;align-items:center;justify-content:flex-start;color:#666">Page ${i}</div>`,
            }
          );
        }

        onPagesMeta(meta);
      } catch (e) {
        console.error("load pdf failed", e);
      }
    })();

    return () => (mounted = false);
  }, [pdfUrl]);

  if (!pdf) return <div>Loading PDF...</div>;

  return (
    <div className="pdf-container">
      <PdfPageView
        key={currentPage}
        pdf={pdf}
        pageNumber={currentPage}
        tool={tool}
        onSetPageTitle={(pageNumber, text) => {
          onSetPageTitle(pageNumber, text);
        }}
      />
    </div>
  );
}
