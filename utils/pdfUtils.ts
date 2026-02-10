import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib';
import { TableData, Placement, CellStyle } from '../types';

// Set worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;

export const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export const getPDFDocument = async (data: ArrayBuffer) => {
  // Critical: Slice the buffer to create a copy. 
  const loadingTask = pdfjsLib.getDocument({ data: data.slice(0) });
  return await loadingTask.promise;
};

export const renderPageToCanvas = async (
  pdfDoc: any,
  pageIndex: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.5
) => {
  const page = await pdfDoc.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale });

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  const renderContext = {
    canvasContext: canvas.getContext('2d')!,
    viewport: viewport,
  };

  await page.render(renderContext).promise;
  return viewport;
};

export const insertTableIntoPDF = async (
  originalPdfBytes: ArrayBuffer,
  tableData: TableData,
  placement: Placement
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(originalPdfBytes);
  
  // Embed all necessary fonts for styling
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fontBoldOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

  const pages = pdfDoc.getPages();
  const page = pages[placement.pageIndex];

  const fontSize = 10;
  const cellPadding = 5;
  
  // Data Normalization
  const colWidths = tableData.columnWidths || tableData.headers.map(() => 100);
  const rowHeights = tableData.rowHeights || new Array(tableData.rows.length + 1).fill(30);
  const merges = tableData.merges || [];
  const styles = tableData.styles || {};

  const tableWidth = colWidths.reduce((sum, w) => sum + w, 0);
  
  const startX = placement.x;
  // Track Y position
  
  // Helper: Get X position of a specific column index
  const getColX = (index: number) => {
    let x = startX;
    for (let i = 0; i < index; i++) {
      x += colWidths[i];
    }
    return x;
  };

  // Helper: Check if a specific cell (row, col) is hidden by a merge initiated elsewhere
  const isHiddenByMerge = (r: number, c: number) => {
    return merges.some(m => 
      r >= m.row && r < m.row + m.rowSpan &&
      c >= m.col && c < m.col + m.colSpan &&
      !(r === m.row && c === m.col) // It's hidden if it's inside, but not the top-left
    );
  };

  // Helper: Get merge info if this cell is the top-left of a merge
  const getMergeStart = (r: number, c: number) => {
    return merges.find(m => m.row === r && m.col === c);
  };

  // Helper: Get content for a given coordinate (0 = header, 1+ = rows)
  const getContent = (r: number, c: number) => {
    if (r === 0) return tableData.headers[c] || '';
    return tableData.rows[r - 1]?.[c] || '';
  };

  // Helper: Get style for a given coordinate
  const getStyle = (r: number, c: number): CellStyle => {
     return styles[`${r},${c}`] || {};
  };

  // Helper: Select Font based on style
  const getFont = (style: CellStyle): PDFFont => {
     if (style.bold && style.italic) return fontBoldOblique;
     if (style.bold) return fontBold;
     if (style.italic) return fontOblique;
     return fontRegular; // Default
  };

  const totalRows = tableData.rows.length + 1; // +1 for header
  const totalCols = tableData.headers.length;

  // We iterate from top to bottom.
  // We need to track the Y position of *each row start*.
  const rowYPos: number[] = [];
  let tempY = placement.y;
  for(let i=0; i<totalRows; i++) {
    rowYPos.push(tempY);
    tempY -= rowHeights[i];
  }

  // Iterate Grid
  for (let r = 0; r < totalRows; r++) {
    for (let c = 0; c < totalCols; c++) {
      
      // Skip if covered by another cell
      if (isHiddenByMerge(r, c)) continue;

      const merge = getMergeStart(r, c);
      const rowSpan = merge ? merge.rowSpan : 1;
      const colSpan = merge ? merge.colSpan : 1;

      // Calculate Dimensions
      let cellWidth = 0;
      for (let i = 0; i < colSpan; i++) {
        cellWidth += colWidths[c + i];
      }

      let cellHeight = 0;
      for (let i = 0; i < rowSpan; i++) {
        cellHeight += rowHeights[r + i];
      }

      const cellX = getColX(c);
      const cellTopY = rowYPos[r];

      // Default Header Background (can be overridden/removed if strictly using styles in future, keeping for legacy compatibility)
      if (r === 0 && !merge) {
         page.drawRectangle({
          x: cellX,
          y: cellTopY - cellHeight,
          width: cellWidth,
          height: cellHeight,
          color: rgb(0.95, 0.95, 0.95), // Light gray for header
        });
      }

      const content = getContent(r, c);
      const style = getStyle(r, c);
      
      // -- Alignment and Text Drawing --
      const font = getFont(style);
      
      // Header defaults to bold/center if not specified? 
      // Current behavior in UI was: Header is bold center via CSS. 
      // If no style set in state, we might want to default header to bold/center here to match UI?
      // For now, we strictly follow the 'style' object, assuming the UI init or user interaction sets it. 
      // However, to match previous visual hardcoding:
      let finalFont = font;
      if (r === 0 && !style.bold && !style.italic) finalFont = fontBold; // Legacy header bold default if untouched

      const textWidth = finalFont.widthOfTextAtSize(content, fontSize);
      const textHeight = finalFont.heightAtSize(fontSize);

      // Horizontal Align
      let textX = cellX + cellPadding;
      // Default header to center if no alignment specified, else default left
      const align = style.align || (r === 0 ? 'center' : 'left'); 

      if (align === 'center') {
        textX = cellX + (cellWidth / 2) - (textWidth / 2);
      } else if (align === 'right') {
        textX = cellX + cellWidth - textWidth - cellPadding;
      }

      // Vertical Align
      let textY = cellTopY - rowHeights[r] + cellPadding + 2; // Default (Top/Legacy)
      // Note: rowHeights[r] is height of current row. For merges, we might want center relative to total height?
      // Logic: cellTopY is top. cellTopY - cellHeight is bottom.
      // Top: cellTopY - fontSize - padding.
      // Middle: cellTopY - (cellHeight/2) - (fontSize/2 roughly)
      
      const vAlign = style.vAlign || 'middle'; // Default to middle usually looks better in PDF, or use 'top' to match simple render
      
      if (vAlign === 'top') {
         textY = cellTopY - fontSize - cellPadding + 2; // +2 for baseline adjustment
      } else if (vAlign === 'middle') {
         textY = cellTopY - (cellHeight / 2) - (fontSize / 3); 
      } else if (vAlign === 'bottom') {
         textY = cellTopY - cellHeight + cellPadding + 2;
      }

      // Draw Text
      page.drawText(content, {
        x: textX,
        y: textY,
        size: fontSize,
        font: finalFont,
        color: rgb(0, 0, 0),
      });

      // Draw Underline
      if (style.underline) {
        page.drawLine({
          start: { x: textX, y: textY - 2 },
          end: { x: textX + textWidth, y: textY - 2 },
          thickness: 0.75,
          color: rgb(0, 0, 0),
        });
      }

      // Draw Border
      page.drawRectangle({
        x: cellX,
        y: cellTopY - cellHeight,
        width: cellWidth,
        height: cellHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
        opacity: 0, 
      });
    }
  }

  // Outer border
  const totalHeight = rowHeights.reduce((sum, h) => sum + h, 0);
  page.drawRectangle({
    x: startX,
    y: placement.y - totalHeight,
    width: tableWidth,
    height: totalHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
    opacity: 0,
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};