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
        getTextContent: () => Promise<{ items: PdfTextItem[] }>;
      }>;
    }>;
  };
};

type PdfTextItem = {
  str?: string;
  transform?: number[];
  width?: number;
};

type PositionedText = {
  text: string;
  x: number;
  y: number;
  width: number;
};

const ensurePromiseWithResolvers = () => {
  const PromiseConstructor = Promise as PromiseConstructor & {
    withResolvers?: <T>() => {
      promise: Promise<T>;
      resolve: (value: T | PromiseLike<T>) => void;
      reject: (reason?: unknown) => void;
    };
  };

  if (!PromiseConstructor.withResolvers) {
    PromiseConstructor.withResolvers = <T>() => {
      let resolve!: (value: T | PromiseLike<T>) => void;
      let reject!: (reason?: unknown) => void;

      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });

      return {
        promise,
        resolve,
        reject,
      };
    };
  }
};

const loadPdfJs = async (): Promise<PdfJsModule> => {
  ensurePromiseWithResolvers();

  const module = await import("pdfjs-dist/legacy/build/pdf.mjs");

  return module as PdfJsModule;
};

const tableGapThreshold = 18;
const dateCellPattern = /\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/;

const toPositionedText = (item: PdfTextItem): PositionedText | undefined => {
  const text = item.str?.trim();
  if (!text) {
    return undefined;
  }

  return {
    text,
    x: item.transform?.[4] ?? 0,
    y: item.transform?.[5] ?? 0,
    width: item.width ?? 0,
  };
};

const findDateColumnStarts = (rows: PositionedText[][]) => {
  const headerRow = rows.find(
    (row) => row.filter((item) => dateCellPattern.test(item.text)).length >= 2,
  );
  return headerRow
    ?.filter((item) => dateCellPattern.test(item.text))
    .sort((left, right) => left.x - right.x)
    .map((item) => item.x);
};

const nearestDateColumnIndex = (x: number, dateColumnStarts: number[]) => {
  return dateColumnStarts.reduce((nearestIndex, columnStart, index) => {
    const nearestDistance = Math.abs(x - dateColumnStarts[nearestIndex]);
    const nextDistance = Math.abs(x - columnStart);
    return nextDistance < nearestDistance ? index : nearestIndex;
  }, 0);
};

const formatTableRow = (
  items: PositionedText[],
  dateColumnStarts: number[],
) => {
  const firstDateColumn = dateColumnStarts[0];
  const columns = Array.from(
    { length: dateColumnStarts.length + 1 },
    () => [] as PositionedText[],
  );

  items.forEach((item) => {
    const columnIndex =
      item.x < firstDateColumn - 40
        ? 0
        : nearestDateColumnIndex(item.x, dateColumnStarts) + 1;
    columns[columnIndex]?.push(item);
  });

  while (columns.length > 0 && columns[columns.length - 1].length === 0) {
    columns.pop();
  }

  return columns
    .map((column) =>
      column
        .sort((left, right) => left.x - right.x)
        .map((item) => item.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .join("\t")
    .trimEnd();
};

const formatTextRow = (items: PositionedText[]) => {
  return [...items]
    .sort((left, right) => left.x - right.x)
    .reduce<{ text: string; previousRight?: number }>(
      (state, item) => {
        if (!state.text) {
          return { text: item.text, previousRight: item.x + item.width };
        }

        const gap = item.x - (state.previousRight ?? item.x);
        const separator = gap > tableGapThreshold ? "\t" : " ";

        return {
          text: `${state.text}${separator}${item.text}`,
          previousRight: item.x + item.width,
        };
      },
      { text: "" },
    )
    .text.replace(/[ \t]+/g, (match) => (match.includes("\t") ? "\t" : " "))
    .trim();
};

const groupTextIntoLines = (
  items: PdfTextItem[],
  fallbackDateColumnStarts?: number[],
) => {
  const lines = new Map<number, PositionedText[]>();

  items.forEach((item) => {
    const positionedText = toPositionedText(item);
    if (!positionedText) {
      return;
    }

    const key = Math.round(positionedText.y);
    const bucket = lines.get(key) ?? [];
    bucket.push(positionedText);
    lines.set(key, bucket);
  });

  const sortedRows = Array.from(lines.entries())
    .sort((left, right) => right[0] - left[0])
    .map(([, bucket]) => bucket);
  const dateColumnStarts =
    findDateColumnStarts(sortedRows) ?? fallbackDateColumnStarts;

  return {
    dateColumnStarts,
    lines: sortedRows
      .map((bucket) =>
        dateColumnStarts && dateColumnStarts.length >= 2
          ? formatTableRow(bucket, dateColumnStarts)
          : formatTextRow(bucket),
      )
      .filter(Boolean),
  };
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
  let activeDateColumnStarts: number[] | undefined;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = groupTextIntoLines(content.items, activeDateColumnStarts);
    activeDateColumnStarts = pageText.dateColumnStarts;
    pages.push(pageText.lines.join("\n"));
  }

  return pages.join("\n");
};
