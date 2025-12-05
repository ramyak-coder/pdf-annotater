import { PDFDocument, rgb } from 'pdf-lib';

export async function exportAnnotatedPdf(originalPdfBytes, annotationsPerPage, scale=1.5) {
  const pdfDoc = await PDFDocument.load(originalPdfBytes);
  for(const pStr of Object.keys(annotationsPerPage)) {
    const p = Number(pStr);
    const page = pdfDoc.getPage(p-1);
    const pageHeight = page.getHeight();
    const objs = annotationsPerPage[p] || [];
    for(const o of objs) {
      if(o.type === 'callout' || o.type === 'rect') {
        const drawX = (o.boxX ?? o.x ?? o.point?.x) / scale;
        const drawYTop = (o.boxY ?? o.y ?? o.point?.y) / scale;
        const drawW = (o.w ?? 180) / scale;
        const drawH = (o.h ?? 60) / scale;
        const y = pageHeight - drawYTop - drawH;
        page.drawRectangle({ x: drawX, y, width: drawW, height: drawH, borderColor: rgb(1,0,0), borderWidth:2 });
        if(o.text) page.drawText(o.text.slice(0,200), { x: drawX+4, y: y + drawH - 12, size:9, color: rgb(0,0,0) });
      } else if(o.type === 'text') {
        const x = (o.x||0)/scale; const yTop = (o.y||0)/scale; const y = pageHeight - yTop - 12;
        page.drawText(o.text||'', { x, y, size:10, color: rgb(0,0,0) });
      }
    }
  }
  const out = await pdfDoc.save();
  return out;
}
