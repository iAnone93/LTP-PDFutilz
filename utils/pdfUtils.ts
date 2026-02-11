
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib';
import { TableData, Placement, CellStyle, SignatureData } from '../types';

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

// Helper: Convert Data URL to Uint8Array for pdf-lib
const convertDataUrlToBytes = (dataUrl: string): Uint8Array => {
  try {
    const parts = dataUrl.split(',');
    const base64 = parts.length > 1 ? parts[1] : parts[0];
    // Clean base64 string (remove newlines/spaces)
    const cleanBase64 = base64.replace(/\s/g, '');
    const binaryString = window.atob(cleanBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.error("Error converting data URL to bytes", e);
    return new Uint8Array(0);
  }
};

export const insertTableIntoPDF = async (
  originalPdfBytes: ArrayBuffer,
  tableData: TableData,
  placement: Placement | null,
  signatures: SignatureData[] = []
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(originalPdfBytes);
  
  // --- 1. Draw Table (If placed) ---
  // Draw table first so signatures appear on top
  if (placement) {
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

        // Default Header Background
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
        
        let finalFont = font;
        if (r === 0 && !style.bold && !style.italic) finalFont = fontBold; 

        const textWidth = finalFont.widthOfTextAtSize(content, fontSize);
        const textHeight = finalFont.heightAtSize(fontSize);

        // Horizontal Align
        let textX = cellX + cellPadding;
        const align = style.align || (r === 0 ? 'center' : 'left'); 

        if (align === 'center') {
          textX = cellX + (cellWidth / 2) - (textWidth / 2);
        } else if (align === 'right') {
          textX = cellX + cellWidth - textWidth - cellPadding;
        }

        // Vertical Align
        let textY = cellTopY - rowHeights[r] + cellPadding + 2; 
        const vAlign = style.vAlign || 'middle'; 
        
        if (vAlign === 'top') {
           textY = cellTopY - fontSize - cellPadding + 2; 
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
    });
  }

  // --- 2. Draw Signatures (Second, to be on top) ---
  for (const sig of signatures) {
    const pages = pdfDoc.getPages();
    // Safety check for page index
    if (sig.pageIndex < 0 || sig.pageIndex >= pages.length) continue;
    
    const page = pages[sig.pageIndex];
    
    try {
      // Convert Data URL to bytes to ensure compatibility with embedPng
      const imageBytes = convertDataUrlToBytes(sig.dataUrl);
      if (imageBytes.length === 0) {
        console.warn("Skipping signature: converted bytes length is 0");
        continue;
      }

      const pngImage = await pdfDoc.embedPng(imageBytes);
      const { width: imgWidth, height: imgHeight } = pngImage;

      // Calculate 'object-contain' fit
      const imgRatio = imgWidth / imgHeight;
      const boxRatio = sig.width / sig.height;
      
      let drawWidth, drawHeight;
      
      if (imgRatio > boxRatio) {
        // Image is relatively wider than the box: Fit to Width
        drawWidth = sig.width;
        drawHeight = sig.width / imgRatio;
      } else {
        // Image is relatively taller than the box: Fit to Height
        drawHeight = sig.height;
        drawWidth = sig.height * imgRatio;
      }

      // Center the image in the box
      const xOffset = (sig.width - drawWidth) / 2;
      const yOffset = (sig.height - drawHeight) / 2;

      // Use integer coordinates to prevent potential rendering issues
      page.drawImage(pngImage, {
        x: Math.floor(sig.x + xOffset),
        y: Math.floor(sig.y + yOffset),
        width: Math.floor(drawWidth),
        height: Math.floor(drawHeight),
      });
    } catch (e) {
      console.error("Failed to embed signature image", e);
    }
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};
