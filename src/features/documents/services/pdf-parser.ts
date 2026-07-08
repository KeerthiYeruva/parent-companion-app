type PdfJsModule = {
  GlobalWorkerOptions?: {
    workerSrc?: string;
  };
  getDocument: (source: {
    data: Uint8Array;
    standardFontDataUrl?: string;
    isEvalSupported?: boolean;
  }) => {
    promise: Promise<{
      numPages: number;
      getPage: (pageNumber: number) => Promise<{
        getTextContent: () => Promise<{ items: Array<{ str?: string; transform?: number[] }> }>;
      }>;
    }>;
  };
};

const loadPdfJs = async (): Promise<PdfJsModule> => {
  const module = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return module as PdfJsModule;
};

const groupTextIntoLines = (items: Array<{ str?: string; transform?: number[] }>) => {
  const lines = new Map<number, string[]>();

  items.forEach((item) => {
    const text = item.str?.trim();
    if (!text) {
      return;
    }

    const y = item.transform?.[5];
    const key = typeof y === "number" ? Math.round(y) : 0;
    const bucket = lines.get(key) ?? [];
    bucket.push(text);
    lines.set(key, bucket);
  });

  return Array.from(lines.entries())
    .sort((left, right) => right[0] - left[0])
    .map(([, bucket]) => bucket.join(" ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
};

export const extractPdfText = async (file: File): Promise<string> => {
  const pdfjs = await loadPdfJs();
  const { getDocument } = pdfjs;
  const data = new Uint8Array(await file.arrayBuffer());
  const standardFontDataUrl = `${window.location.origin}/pdfjs/standard_fonts/`;

  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdfjs/pdf.worker.mjs`;
  }

  const pdf = await getDocument({
    data,
    standardFontDataUrl,
    isEvalSupported: false,
  }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageLines = groupTextIntoLines(content.items);
    pages.push(pageLines.join("\n"));
  }

  return pages.join("\n");
};
