import React from "react";

export default function SvgOverlay({
  width = 800,
  height = 1000,
  mode = "markup",
  tool = "rect",
  objects = [],
  onChangeObjects,
}) {
  const svgRef = React.useRef(null);
  const drawingRef = React.useRef(null);
  const dragCalloutRef = React.useRef(null);

  const clientToSvg = (e) => {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };

  const append = (obj) => onChangeObjects((prev) => [...prev, obj]);
  const update = (id, patch) =>
    onChangeObjects((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...patch } : o))
    );

  const handleMouseDown = (e) => {
    if (mode !== "markup") return;
    const p = clientToSvg(e);
    if (tool === "eraser") {
      onChangeObjects((prev) =>
        prev.filter((o) => {
          if (o.type === "rect") {
            const x = Math.min(o.x, o.x + o.w);
            const y = Math.min(o.y, o.y + o.h);
            const w = Math.abs(o.w);
            const h = Math.abs(o.h);
            return !(p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h);
          }
          if (o.type === "callout") {
            const dx = p.x - o.point.x,
              dy = p.y - o.point.y;
            return Math.hypot(dx, dy) > 10;
          }
          return true;
        })
      );
      return;
    }
    if (tool === "callout") {
      const existing = objects.find(
        (o) =>
          o.type === "callout" &&
          ((p.x >= o.boxX &&
            p.x <= o.boxX + 180 &&
            p.y >= o.boxY &&
            p.y <= o.boxY + 60) ||
            Math.hypot(p.x - o.point.x, p.y - o.point.y) < 12)
      );
      if (existing) {
        dragCalloutRef.current = {
          id: existing.id,
          offsetX: p.x - (existing.boxX || existing.point.x),
          offsetY: p.y - (existing.boxY || existing.point.y),
        };
        return;
      }
      const id = crypto.randomUUID();
      append({
        id,
        type: "callout",
        point: { x: p.x, y: p.y },
        boxX: p.x + 40,
        boxY: p.y - 30,
        text: "",
      });
      return;
    }
    if (tool === "pen") {
      const id = crypto.randomUUID();
      const obj = { id, type: "pen", points: [{ x: p.x, y: p.y }] };
      drawingRef.current = obj;
      append(obj);
      return;
    }
    if (tool === "rect") {
      const id = crypto.randomUUID();
      const obj = { id, type: "rect", x: p.x, y: p.y, w: 0, h: 0 };
      drawingRef.current = obj;
      append(obj);
      return;
    }
    if (tool === "text") {
      const id = crypto.randomUUID();
      append({ id, type: "text", x: p.x, y: p.y, text: "" });
      return;
    }
  };

  const handleMouseMove = (e) => {
    if (mode !== "markup") return;
    const p = clientToSvg(e);
    if (dragCalloutRef.current) {
      const { id, offsetX, offsetY } = dragCalloutRef.current;
      update(id, { boxX: p.x - offsetX, boxY: p.y - offsetY });
      return;
    }
    const cur = drawingRef.current;
    if (!cur) return;
    if (cur.type === "pen") {
      const updated = { ...cur, points: [...cur.points, { x: p.x, y: p.y }] };
      drawingRef.current = updated;
      update(cur.id, { points: updated.points });
      return;
    }
    if (cur.type === "rect") {
      const updated = { ...cur, w: p.x - cur.x, h: p.y - cur.y };
      drawingRef.current = updated;
      update(cur.id, { w: updated.w, h: updated.h });
      return;
    }
  };

  const handleMouseUp = () => {
    drawingRef.current = null;
    dragCalloutRef.current = null;
  };

  const renderObj = (o) => {
    if (o.type === "pen")
      return (
        <polyline
          key={o.id}
          points={(o.points || []).map((p) => `${p.x},${p.y}`).join(" ")}
          stroke="red"
          strokeWidth={2}
          fill="none"
        />
      );
    if (o.type === "rect") {
      const x = Math.min(o.x, o.x + o.w),
        y = Math.min(o.y, o.y + o.h);
      return (
        <rect
          key={o.id}
          x={x}
          y={y}
          width={Math.abs(o.w)}
          height={Math.abs(o.h)}
          stroke="blue"
          strokeWidth={2}
          fill="rgba(0,0,255,0.08)"
        />
      );
    }
    if (o.type === "text")
      return (
        <foreignObject
          key={o.id}
          x={o.x}
          y={o.y}
          width={200}
          height={60}
          style={{ border: "1px solid blue" }}
        >
          <textarea
            value={o.text}
            onChange={(e) => update(o.id, { text: e.target.value })}
            style={{ width: 200, height: 60, fontSize: 14 }}
          />
        </foreignObject>
      );
    if (o.type === "callout")
      return (
        <g key={o.id}>
          <line
            x1={o.point.x}
            y1={o.point.y}
            x2={o.boxX}
            y2={o.boxY}
            stroke="red"
            strokeWidth={2}
          />
          <foreignObject x={o.boxX} y={o.boxY} width={180} height={80}>
            <div style={{ display: "flex", gap: 6 }}>
              <textarea
                value={o.text}
                onChange={(e) => update(o.id, { text: e.target.value })}
                style={{ width: 130, height: 60, fontSize: 14 }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {/* <button
                  onClick={(ev) => {
                    ev.stopPropagation();
                  }}
                >
                  🔎
                </button> */}
                <button
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onChangeObjects((prev) =>
                      prev.filter((p) => p.id !== o.id)
                    );
                  }}
                >
                  🗑
                </button>
              </div>
            </div>
          </foreignObject>
        </g>
      );
    return null;
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        position: "absolute",
        left: 0,
        top: 0,
        pointerEvents: mode === "markup" ? "auto" : "none",
        zIndex: 10,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {objects.map(renderObj)}
    </svg>
  );
}
