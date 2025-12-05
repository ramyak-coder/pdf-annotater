import React, { useState } from "react";

export default function PageSidebar({
  pages = [],
  current = 1,
  onSelect,
  onEditTitle,
}) {
  const [editingPage, setEditingPage] = useState(null);
  const [editText, setEditText] = useState("");

  const startEdit = (p) => {
    setEditingPage(p.pageNumber);
    setEditText(p.title || "");
  };

  const saveEdit = () => {
    onEditTitle(editingPage, editText.trim());
    setEditingPage(null);
    setEditText("");
  };

  return (
    <div>
      {pages.length === 0 && <div style={{ padding: 8 }}>No pages yet</div>}

      {pages.map((p) => {
        const active = p.pageNumber === current;
        return (
          <div
            key={p.pageNumber}
            className="thumb-wrapper"
            style={{
              border: active ? "2px solid #007bff" : "1px solid #ccc",
              borderRadius: 6,
              padding: 6,
              marginBottom: 8,
              background: "#fafafa",
              cursor: "pointer",
              position: "relative",
            }}
          >
            <div onClick={() => onSelect(p.pageNumber)}>
              <div
                className="thumb"
                dangerouslySetInnerHTML={{ __html: p.thumbnailHtml }}
              />
            </div>

            {/* Pencil icon */}
            <button
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 2,
              }}
              onClick={(e) => {
                e.stopPropagation();
                startEdit(p);
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
            </button>

            {/* Inline editor */}
            {editingPage === p.pageNumber && (
              <div style={{ marginTop: 6 }}>
                <input
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "4px 6px",
                    marginBottom: 4,
                    fontSize: 13,
                  }}
                />
                <button
                  style={{
                    padding: "3px 6px",
                    fontSize: 12,
                    marginRight: 6,
                  }}
                  onClick={saveEdit}
                >
                  Save
                </button>
                <button
                  style={{ padding: "3px 6px", fontSize: 12 }}
                  onClick={() => setEditingPage(null)}
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Display saved title */}
            {p.title && editingPage !== p.pageNumber && (
              <div style={{ marginTop: 6, fontSize: 14, color: "#555" }}>
                {p.title}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
