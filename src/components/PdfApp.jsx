import React, { useEffect, useState } from "react";
import HeaderBar from "./HeaderBar";
import PageSidebar from "./PageSidebar";
import PdfDocument from "./PdfDocument";

export default function PdfApp({ pdfUrl }) {
  const [tool, setTool] = useState("scan");
  const [currentPage, setCurrentPage] = useState(1);

  // <-- single source of truth for sidebar + titles
  const [pagesMeta, setPagesMeta] = useState([]);

  const handleSetPageTitle = (pageNumber, text) => {
    // 1. Remove previous callouts
    const oldCallouts = document.querySelectorAll(
      `.callout-page-${pageNumber}`
    );
    oldCallouts.forEach((el) => el.remove());

    // 2. Remove previous scan divs
    const oldScans = document.querySelectorAll(`.scan-overlay-${pageNumber}`);
    oldScans.forEach((el) => el.remove());

    // 3. Set fresh page title
    setPagesMeta((prev) =>
      prev.map((p) =>
        p.pageNumber === pageNumber
          ? { ...p, title: text } // overwrite, not append
          : p
      )
    );
  };

  const handleEditTitle = (pageNumber, newTitle) => {
    setPagesMeta((prev) =>
      prev.map((p) =>
        p.pageNumber === pageNumber ? { ...p, title: newTitle } : p
      )
    );
  };

  return (
    <>
      <div className="header">
        <HeaderBar tool={tool} setTool={setTool} />
      </div>

      <div className="main">
        <div className="sidebar">
          <PageSidebar
            pages={pagesMeta}
            current={currentPage}
            onSelect={setCurrentPage}
            onEditTitle={handleEditTitle}
          />
        </div>

        <div className="viewer">
          <PdfDocument
            pdfUrl={pdfUrl}
            tool={tool}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pagesMeta={pagesMeta}
            onPagesMeta={setPagesMeta}
            onSetPageTitle={handleSetPageTitle}
          />
        </div>
      </div>
    </>
  );
}
