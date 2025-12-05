import React from "react";

export default function HeaderBar({ tool, setTool }) {
  const btn = (name, label) => (
    <button
      key={name}
      onClick={() => setTool(name)}
      style={{
        background: tool === name ? "#4b8aff" : "#fff",
        color: tool === name ? "#fff" : "#000",
        border: "1px solid #ddd",
        padding: "8px 12px",
        borderRadius: 6,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div className="toolbar">
        {btn("scan", "Scan")}
        {btn("pen", "Pen")}
        {btn("rect", "Rect")}
        {btn("callout", "Callout")}
        {btn("text", "Text")}
        {btn("eraser", "Eraser")}
      </div>
    </div>
  );
}
