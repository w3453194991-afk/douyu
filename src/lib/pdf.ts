import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { loadImageFile } from './pattern';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export async function openPdf(file: File): Promise<{ doc: any; pages: number }> {
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  return { doc, pages: doc.numPages };
}

export async function renderPdfPage(
  doc: any,
  pageNumber: number,
): Promise<{ img: HTMLImageElement; url: string }> {
  const page = await doc.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(2.6, 2200 / Math.max(1, base.width));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('浏览器不支持 PDF 渲染');
  // PDF 画布默认是透明的；先铺白底，避免导出的 PNG 透明区域被当成黑色。
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png'),
  );
  if (!blob) throw new Error('PDF 页面渲染失败');
  const file = new File([blob], `pdf-page-${pageNumber}.png`, { type: 'image/png' });
  return loadImageFile(file);
}
