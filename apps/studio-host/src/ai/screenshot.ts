const MAX_DIM = 800;

export function computeScale(width: number, height: number, maxDim = MAX_DIM): number {
  return Math.min(1, maxDim / Math.max(width, height));
}

export function sortByPagePosition<T extends { style: { top: string; left: string } }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ay = Number.parseFloat(a.style.top || '0');
    const by = Number.parseFloat(b.style.top || '0');
    const ax = Number.parseFloat(a.style.left || '0');
    const bx = Number.parseFloat(b.style.left || '0');
    return ay - by || ax - bx;
  });
}

export function captureVisiblePages(): string[] {
  const canvases = Array.from(
    document.querySelectorAll<HTMLCanvasElement>('#scroll-content canvas'),
  );
  return sortByPagePosition(canvases).map((c) => toJpegDataUrl(c, MAX_DIM)).filter(Boolean);
}

export function toJpegDataUrl(canvas: HTMLCanvasElement, maxDim = MAX_DIM): string {
  const scale = computeScale(canvas.width, canvas.height, maxDim);
  if (scale === 1) return canvas.toDataURL('image/jpeg', 0.85);
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(canvas.width * scale));
  out.height = Math.max(1, Math.round(canvas.height * scale));
  const ctx = out.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  return out.toDataURL('image/jpeg', 0.85);
}