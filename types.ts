export interface Merge {
  row: number; // 0-based index. 0 = Header, 1+ = Body Rows
  col: number; // 0-based index
  rowSpan: number;
  colSpan: number;
}

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right';
  vAlign?: 'top' | 'middle' | 'bottom';
}

export interface TableData {
  headers: string[];
  rows: string[][];
  columnWidths: number[]; // Width of each column in PDF points
  rowHeights: number[];   // Height of each row (Index 0 = Header, 1..n = Data Rows)
  merges: Merge[];
  styles?: Record<string, CellStyle>; // Key format: "row,col"
}

export interface Placement {
  pageIndex: number; // 0-based index
  x: number; // PDF coordinates (points)
  y: number; // PDF coordinates (points), usually from bottom-left
  pageWidth: number;
  pageHeight: number;
}

export interface PDFPageInfo {
  pageIndex: number;
  width: number;
  height: number;
  scale: number;
  viewport: any; // PDFJS Viewport
}

export type ProcessingStatus = 'idle' | 'loading' | 'rendering' | 'processing' | 'success' | 'error';