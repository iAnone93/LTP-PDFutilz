
import React, { useState, useEffect, useRef } from 'react';
import { TableData, CellStyle } from '../types';
import { 
  Plus, Merge as MergeIcon, Split, Trash2, Eraser, Columns, Rows,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, 
  ArrowUpToLine, ArrowDownToLine, AlignVerticalJustifyCenter, Move,
  ArrowDownRight, Copy, ClipboardPaste
} from 'lucide-react';

interface TableOverlayProps {
  data: TableData;
  onChange: (data: TableData) => void;
  onDelete: () => void;
  scale: number;
  onDragStart: (e: React.MouseEvent) => void;
}

interface Selection {
  start: { r: number; c: number };
  end: { r: number; c: number };
}

const TableOverlay: React.FC<TableOverlayProps> = ({ 
  data, 
  onChange, 
  onDelete,
  scale,
  onDragStart
}) => {
  const FONT_SIZE = 10;
  
  // Normalize Data
  const colWidths = data.columnWidths || data.headers.map(() => 100);
  const rowHeights = data.rowHeights || new Array(data.rows.length + 1).fill(30);
  const merges = data.merges || [];
  const styles = data.styles || {};

  const totalRows = data.rows.length + 1; // Header + Body
  const totalCols = data.headers.length;

  // Local State
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [editingCell, setEditingCell] = useState<{ r: number; c: number } | null>(null);
  const [isTableActive, setIsTableActive] = useState(true); // Default to true initially so user sees it on creation
  const [copiedStyle, setCopiedStyle] = useState<CellStyle | null>(null);
  const [copiedCell, setCopiedCell] = useState<{ text: string; style: CellStyle } | null>(null);
  
  // Local State for Dragging (Transient)
  const [draggingWidths, setDraggingWidths] = useState<number[] | null>(null);
  const [draggingHeights, setDraggingHeights] = useState<number[] | null>(null);

  const [resizingColIndex, setResizingColIndex] = useState<number | null>(null);
  const [resizingRowIndex, setResizingRowIndex] = useState<number | null>(null);
  const [startVal, setStartVal] = useState<number>(0); 
  const [startDim, setStartDim] = useState<number>(0); 

  // Table Resize State
  const [isResizingTable, setIsResizingTable] = useState(false);
  const [tableResizeState, setTableResizeState] = useState<{
    startX: number;
    startY: number;
    startColWidths: number[];
    startRowHeights: number[];
  } | null>(null);

  const scaledFontSize = FONT_SIZE * scale;

  const displayColWidths = draggingWidths || colWidths;
  const displayRowHeights = draggingHeights || rowHeights;

  const overlayRef = useRef<HTMLDivElement>(null);

  // --- Click Outside to Deactivate Table ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(event.target as Node)) {
        setIsTableActive(false);
        setSelection(null);
        setEditingCell(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // --- Dimension Sync Safety ---
  useEffect(() => {
    let needsUpdate = false;
    let newColWidths = colWidths;
    let newRowHeights = rowHeights;

    if (colWidths.length !== data.headers.length) {
       newColWidths = data.headers.map((_, i) => colWidths[i] || 100);
       needsUpdate = true;
    }

    if (rowHeights.length !== data.rows.length + 1) {
       newRowHeights = new Array(data.rows.length + 1).fill(0).map((_, i) => rowHeights[i] || 30);
       needsUpdate = true;
    }

    if (needsUpdate) {
        onChange({ ...data, columnWidths: newColWidths, rowHeights: newRowHeights });
    }
  }, [data.headers.length, data.rows.length]);


  // --- Helper Functions ---

  const getCellValue = (r: number, c: number) => {
    if (r === 0) return data.headers[c];
    return data.rows[r - 1]?.[c] || '';
  };

  const updateCellValue = (r: number, c: number, val: string) => {
    if (r === 0) {
      const newHeaders = [...data.headers];
      newHeaders[c] = val;
      onChange({ ...data, headers: newHeaders });
    } else {
      const newRows = [...data.rows];
      newRows[r - 1][c] = val;
      onChange({ ...data, rows: newRows });
    }
  };

  const getStyle = (r: number, c: number): CellStyle => {
    return styles[`${r},${c}`] || {};
  };

  const updateStyle = (r: number, c: number, newStyle: Partial<CellStyle>) => {
    const key = `${r},${c}`;
    const currentStyle = styles[key] || {};
    onChange({
      ...data,
      styles: {
        ...styles,
        [key]: { ...currentStyle, ...newStyle }
      }
    });
  };

  const isHiddenByMerge = (r: number, c: number) => {
    return merges.some(m => 
      r >= m.row && r < m.row + m.rowSpan &&
      c >= m.col && c < m.col + m.colSpan &&
      !(r === m.row && c === m.col)
    );
  };

  const getMergeStart = (r: number, c: number) => {
    return merges.find(m => m.row === r && m.col === c);
  };

  // --- Keyboard Shortcuts (Copy/Paste) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if editing text or no selection
      if (!selection || editingCell) return;

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Copy (Ctrl+C)
      if (isCtrlOrMeta && key === 'c') {
         e.preventDefault();
         // Normalize to top-left of selection
         const r = Math.min(selection.start.r, selection.end.r);
         const c = Math.min(selection.start.c, selection.end.c);
         
         const text = getCellValue(r, c);
         const style = getStyle(r, c);
         
         // Store full cell data
         setCopiedCell({ text, style: { ...style } });
         // Also store style for the toolbar button interaction
         setCopiedStyle({ ...style });
      }

      // Paste (Ctrl+V)
      if (isCtrlOrMeta && key === 'v') {
         e.preventDefault();
         if (copiedCell) {
             const r1 = Math.min(selection.start.r, selection.end.r);
             const r2 = Math.max(selection.start.r, selection.end.r);
             const c1 = Math.min(selection.start.c, selection.end.c);
             const c2 = Math.max(selection.start.c, selection.end.c);

             const newHeaders = [...data.headers];
             const newRows = data.rows.map(r => [...r]);
             const newStyles = { ...styles };

             for(let r = r1; r <= r2; r++) {
                 for(let c = c1; c <= c2; c++) {
                     // Paste Text
                     if (r === 0) newHeaders[c] = copiedCell.text;
                     else newRows[r-1][c] = copiedCell.text;
                     
                     // Paste Style
                     newStyles[`${r},${c}`] = { ...copiedCell.style };
                 }
             }

             onChange({ ...data, headers: newHeaders, rows: newRows, styles: newStyles });
         }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, editingCell, copiedCell, data, styles, onChange]);


  // --- Selection Logic ---

  const handleMouseDownCell = (r: number, c: number, e: React.MouseEvent) => {
    if (resizingColIndex !== null || resizingRowIndex !== null || isResizingTable) return;
    
    setIsSelecting(true);
    setSelection({ start: { r, c }, end: { r, c } });
    setIsTableActive(true); // Activate table on cell click too
  };

  const handleMouseEnterCell = (r: number, c: number) => {
    if (isSelecting && selection) {
      setSelection({ ...selection, end: { r, c } });
    }
  };

  const handleMouseUpSelection = () => {
    setIsSelecting(false);
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUpSelection);
    return () => window.removeEventListener('mouseup', handleMouseUpSelection);
  }, []);

  // --- Style Clipboard Logic ---
  const handleCopyStyle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selection) return;
    // Copy from the top-left cell of the selection
    const r = Math.min(selection.start.r, selection.end.r);
    const c = Math.min(selection.start.c, selection.end.c);
    
    const style = getStyle(r, c);
    setCopiedStyle({ ...style });
  };

  const handlePasteStyle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selection || !copiedStyle) return;
    
    const r1 = Math.min(selection.start.r, selection.end.r);
    const r2 = Math.max(selection.start.r, selection.end.r);
    const c1 = Math.min(selection.start.c, selection.end.c);
    const c2 = Math.max(selection.start.c, selection.end.c);

    const newStyles = { ...styles };

    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        // Overwrite existing style with copied style
        newStyles[`${r},${c}`] = { ...copiedStyle };
      }
    }

    onChange({ ...data, styles: newStyles });
  };

  // --- Structure Mutation ---

  const addColumn = () => {
    const newHeaders = [...data.headers, ''];
    const newRows = data.rows.map(row => [...row, '']);
    const newWidths = [...colWidths, 100];
    onChange({ ...data, headers: newHeaders, rows: newRows, columnWidths: newWidths });
  };

  const addRow = () => {
    const newRow = new Array(data.headers.length).fill('');
    const newHeights = [...rowHeights, 30];
    onChange({ ...data, rows: [...data.rows, newRow], rowHeights: newHeights });
  };

  const mergeCells = () => {
    if (!selection) return;
    const r1 = Math.min(selection.start.r, selection.end.r);
    const r2 = Math.max(selection.start.r, selection.end.r);
    const c1 = Math.min(selection.start.c, selection.end.c);
    const c2 = Math.max(selection.start.c, selection.end.c);

    const newMerges = merges.filter(m => 
      !(m.row >= r1 && m.row <= r2 && m.col >= c1 && m.col <= c2)
    );

    newMerges.push({
      row: r1,
      col: c1,
      rowSpan: (r2 - r1) + 1,
      colSpan: (c2 - c1) + 1
    });

    onChange({ ...data, merges: newMerges });
    setSelection(null);
  };

  const unmergeCells = () => {
    if (!selection) return;
    const r = selection.start.r;
    const c = selection.start.c;
    const newMerges = merges.filter(m => !(m.row === r && m.col === c));
    onChange({ ...data, merges: newMerges });
    setSelection(null);
  };

  const clearSelection = () => {
    if (!selection) return;
    const r1 = Math.min(selection.start.r, selection.end.r);
    const r2 = Math.max(selection.start.r, selection.end.r);
    const c1 = Math.min(selection.start.c, selection.end.c);
    const c2 = Math.max(selection.start.c, selection.end.c);
    
    let newHeaders = [...data.headers];
    let newRows = [...data.rows].map(r => [...r]);

    for(let r = r1; r <= r2; r++) {
      for(let c = c1; c <= c2; c++) {
         if (r === 0) newHeaders[c] = '';
         else newRows[r-1][c] = '';
      }
    }
    onChange({ ...data, headers: newHeaders, rows: newRows });
  };

  const deleteRows = () => {
    if (!selection) return;
    const r1 = Math.min(selection.start.r, selection.end.r);
    const r2 = Math.max(selection.start.r, selection.end.r);
    
    const count = r2 - r1 + 1;
    
    if (count >= totalRows) return; 
    
    let newHeaders = [...data.headers];
    let newRows = [...data.rows];
    let newHeights = [...rowHeights];

    // Case 1: Deleting from the top (includes header)
    if (r1 === 0) {
        const nextHeaderRowIndex = count - 1; 
        
        if (data.rows[nextHeaderRowIndex]) {
             newHeaders = [...data.rows[nextHeaderRowIndex]];
        } else {
             newHeaders = data.headers.map(() => "");
        }
        
        newRows = data.rows.slice(nextHeaderRowIndex + 1);
        newHeights.splice(0, count);
    } 
    // Case 2: Deleting body rows only
    else {
        newRows.splice(r1 - 1, count);
        newHeights.splice(r1, count);
    }
    
    // Fix Merges
    const newMerges = merges.reduce((acc, m) => {
        const mStart = m.row;
        const mEnd = m.row + m.rowSpan - 1;
        if (mEnd < r1) {
            acc.push(m);
        } else if (mStart > r2) {
            acc.push({ ...m, row: m.row - count });
        } else if (mStart < r1 && mEnd > r2) {
            acc.push({ ...m, rowSpan: m.rowSpan - count });
        }
        return acc;
    }, [] as typeof merges);

    onChange({ ...data, headers: newHeaders, rows: newRows, rowHeights: newHeights, merges: newMerges });
    setSelection(null);
  };

  const deleteCols = () => {
    if (!selection) return;
    const c1 = Math.min(selection.start.c, selection.end.c);
    const c2 = Math.max(selection.start.c, selection.end.c);
    const count = c2 - c1 + 1;

    if (totalCols - count <= 0) return;

    const newHeaders = [...data.headers];
    newHeaders.splice(c1, count);

    const newRows = data.rows.map(r => {
        const nr = [...r];
        nr.splice(c1, count);
        return nr;
    });

    const newWidths = [...colWidths];
    newWidths.splice(c1, count);

    const newMerges = merges.reduce((acc, m) => {
        const mEnd = m.col + m.colSpan - 1;
        if (mEnd < c1) {
            acc.push(m);
        } else if (m.col > c2) {
            acc.push({ ...m, col: m.col - count });
        }
        return acc;
    }, [] as typeof merges);

    onChange({ ...data, headers: newHeaders, rows: newRows, columnWidths: newWidths, merges: newMerges });
    setSelection(null);
  };

  // --- Resize Logic (Atomic) ---

  const handleMouseDownCol = (e: React.MouseEvent, index: number) => {
    e.stopPropagation(); e.preventDefault();
    setResizingColIndex(index); 
    setStartVal(e.clientX); 
    setStartDim(colWidths[index]);
  };

  const handleMouseDownRow = (e: React.MouseEvent, index: number) => {
    e.stopPropagation(); e.preventDefault();
    setResizingRowIndex(index); 
    setStartVal(e.clientY); 
    setStartDim(rowHeights[index]);
  };

  // --- Table Resize Logic ---
  const handleMouseDownTableResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizingTable(true);
    setTableResizeState({
      startX: e.clientX,
      startY: e.clientY,
      startColWidths: [...colWidths],
      startRowHeights: [...rowHeights]
    });
    setIsTableActive(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 1. Column Resizing
      if (resizingColIndex !== null) {
        const diff = (e.clientX - startVal) / scale;
        const newWidth = Math.max(30, startDim + diff);
        const newWidths = [...colWidths];
        
        // Multi-column resize if selected
        let appliedToSelection = false;
        if (selection) {
             let c1 = Math.min(selection.start.c, selection.end.c);
             let c2 = Math.max(selection.start.c, selection.end.c);
             const r1 = Math.min(selection.start.r, selection.end.r);
             const r2 = Math.max(selection.start.r, selection.end.r);

             // Expand selection bounds to include full merged cells
             // This ensures if you select the start of a merged cell, the logic knows it spans further
             merges.forEach(m => {
                 if (m.row >= r1 && m.row <= r2 && m.col >= c1 && m.col <= c2) {
                     c2 = Math.max(c2, m.col + m.colSpan - 1);
                 }
             });
             
             // Check if the resized column is part of the selection
             if (resizingColIndex >= c1 && resizingColIndex <= c2) {
                 appliedToSelection = true;
                 for (let i = c1; i <= c2; i++) {
                     newWidths[i] = newWidth;
                 }
             }
        }

        if (!appliedToSelection) {
            newWidths[resizingColIndex] = newWidth;
        }

        setDraggingWidths(newWidths);
      }
      
      // 2. Row Resizing
      if (resizingRowIndex !== null) {
        const diff = (e.clientY - startVal) / scale;
        const newHeight = Math.max(20, startDim + diff);
        const newHeights = [...rowHeights];

        // Multi-row resize if selected
        let appliedToSelection = false;
        if (selection) {
             let r1 = Math.min(selection.start.r, selection.end.r);
             let r2 = Math.max(selection.start.r, selection.end.r);
             const c1 = Math.min(selection.start.c, selection.end.c);
             const c2 = Math.max(selection.start.c, selection.end.c);

             // Expand selection bounds to include full merged cells
             merges.forEach(m => {
                if (m.row >= r1 && m.row <= r2 && m.col >= c1 && m.col <= c2) {
                     r2 = Math.max(r2, m.row + m.rowSpan - 1);
                }
             });
             
             // Check if the resized row is part of the selection
             if (resizingRowIndex >= r1 && resizingRowIndex <= r2) {
                 appliedToSelection = true;
                 for (let i = r1; i <= r2; i++) {
                     newHeights[i] = newHeight;
                 }
             }
        }

        if (!appliedToSelection) {
            newHeights[resizingRowIndex] = newHeight;
        }
        
        setDraggingHeights(newHeights);
      }
      // 3. Whole Table Resizing
      if (isResizingTable && tableResizeState) {
        const deltaX = (e.clientX - tableResizeState.startX) / scale;
        const deltaY = (e.clientY - tableResizeState.startY) / scale;

        const totalStartWidth = tableResizeState.startColWidths.reduce((a, b) => a + b, 0);
        const totalStartHeight = tableResizeState.startRowHeights.reduce((a, b) => a + b, 0);

        if (totalStartWidth <= 0 || totalStartHeight <= 0) return;

        // Ensure minimum size for the table
        const minTableWidth = tableResizeState.startColWidths.length * 20;
        const minTableHeight = tableResizeState.startRowHeights.length * 15;

        const newTotalWidth = Math.max(minTableWidth, totalStartWidth + deltaX);
        const newTotalHeight = Math.max(minTableHeight, totalStartHeight + deltaY);

        const scaleX = newTotalWidth / totalStartWidth;
        const scaleY = newTotalHeight / totalStartHeight;

        const newWidths = tableResizeState.startColWidths.map(w => w * scaleX);
        const newHeights = tableResizeState.startRowHeights.map(h => h * scaleY);

        setDraggingWidths(newWidths);
        setDraggingHeights(newHeights);
      }
    };
    
    const handleMouseUp = () => {
      // Commit Col Resize
      if (resizingColIndex !== null && draggingWidths) {
          onChange({ ...data, columnWidths: draggingWidths });
      }
      // Commit Row Resize
      if (resizingRowIndex !== null && draggingHeights) {
          onChange({ ...data, rowHeights: draggingHeights });
      }
      // Commit Table Resize
      if (isResizingTable && draggingWidths && draggingHeights) {
          onChange({ ...data, columnWidths: draggingWidths, rowHeights: draggingHeights });
      }

      setResizingColIndex(null);
      setResizingRowIndex(null);
      setIsResizingTable(false);
      setTableResizeState(null);
      setDraggingWidths(null);
      setDraggingHeights(null);
    };

    if (resizingColIndex !== null || resizingRowIndex !== null || isResizingTable) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    resizingColIndex, resizingRowIndex, isResizingTable, 
    startVal, startDim, tableResizeState,
    colWidths, rowHeights, draggingWidths, draggingHeights, selection, scale, data, onChange
  ]);

  // --- Render Helpers ---

  const isSelected = (r: number, c: number) => {
    if (!selection) return false;
    const r1 = Math.min(selection.start.r, selection.end.r);
    const r2 = Math.max(selection.start.r, selection.end.r);
    const c1 = Math.min(selection.start.c, selection.end.c);
    const c2 = Math.max(selection.start.c, selection.end.c);
    return r >= r1 && r <= r2 && c >= c1 && c <= c2;
  };

  const getToolbarStyle = () => {
    if (!selection) return { display: 'none' };
    return { top: -45, left: 0 };
  };

  const getEditingToolbarStyle = (r: number, c: number) => {
    return { bottom: '100%', left: 0, marginBottom: '8px' };
  };
  
  const canMerge = selection && (selection.start.r !== selection.end.r || selection.start.c !== selection.end.c);
  const existingMerge = selection && getMergeStart(selection.start.r, selection.start.c);
  
  // -- Validity Logic for Buttons --
  let canDeleteRows = false;
  let canDeleteCols = false;

  if (selection) {
    const r1 = Math.min(selection.start.r, selection.end.r);
    const r2 = Math.max(selection.start.r, selection.end.r);
    const c1 = Math.min(selection.start.c, selection.end.c);
    const c2 = Math.max(selection.start.c, selection.end.c);
    
    const selectedRows = r2 - r1 + 1;
    const selectedCols = c2 - c1 + 1;

    canDeleteRows = (totalRows - selectedRows) >= 1;
    canDeleteCols = (totalCols - selectedCols) >= 1;
  }

  // --- CSS Generation for Cells ---
  const getCellStyle = (r: number, c: number) => {
    const style = getStyle(r, c);
    return {
      fontWeight: style.bold ? 'bold' : 'normal',
      fontStyle: style.italic ? 'italic' : 'normal',
      textDecoration: style.underline ? 'underline' : 'none',
      textAlign: style.align || 'left',
      // Flexbox alignment for vertical center
      alignItems: style.vAlign === 'top' ? 'flex-start' : style.vAlign === 'bottom' ? 'flex-end' : 'center',
    } as React.CSSProperties;
  };

  // Always show borders (matching PDF output) instead of hiding them when inactive
  const borderClass = 'border-gray-800';

  // --- Prepare Rendering Lists ---
  const cellElements: React.ReactNode[] = [];
  const handleElements: React.ReactNode[] = [];

  Array.from({ length: displayRowHeights.length }).forEach((_, r) => {
    Array.from({ length: displayColWidths.length }).forEach((_, c) => {
        
        if (isHiddenByMerge(r, c)) return;

        const merge = getMergeStart(r, c);
        const rowSpan = merge ? merge.rowSpan : 1;
        const colSpan = merge ? merge.colSpan : 1;
        const selected = isSelected(r, c);
        const isEditing = editingCell?.r === r && editingCell?.c === c;
        
        const currentStyle = getStyle(r, c);
        const cssStyle = getCellStyle(r, c);

        // Push Cell
        cellElements.push(
            <div
            key={`cell-${r}-${c}`}
            className={`
                relative border-r border-b ${borderClass} flex
                ${selected && !isEditing ? 'bg-blue-100 ring-2 ring-blue-500 ring-inset z-10' : r === 0 ? 'bg-gray-50' : 'bg-white'}
            `}
            style={{
                gridColumn: `${c + 1} / span ${colSpan}`,
                gridRow: `${r + 1} / span ${rowSpan}`,
                ...cssStyle // Apply Alignment Flex props here
            }}
            onMouseDown={(e) => {
                if (!isEditing) handleMouseDownCell(r, c, e);
            }}
            onMouseEnter={() => handleMouseEnterCell(r, c)}
            onDoubleClick={() => {
                setEditingCell({ r, c });
                setSelection({ start: {r,c}, end: {r,c} });
            }}
            >
            {/* Editing Toolbar */}
            {isEditing && (
                <div 
                className="absolute z-50 bg-white border border-gray-200 text-gray-700 rounded-md shadow-xl flex items-center p-1 gap-1 min-w-max" 
                style={getEditingToolbarStyle(r, c)}
                onMouseDown={(e) => e.preventDefault()} // Critical: prevents input blur
                >
                    {/* Toolbar Content */}
                     {/* B / I / U */}
                     <div className="flex gap-0.5 border-r border-gray-200 pr-1">
                          <button 
                            className={`p-1 rounded hover:bg-gray-100 ${currentStyle.bold ? 'bg-indigo-50 text-indigo-600' : ''}`}
                            onClick={() => updateStyle(r, c, { bold: !currentStyle.bold })}
                            title="Bold"
                          ><Bold size={14} strokeWidth={2.5}/></button>
                          <button 
                             className={`p-1 rounded hover:bg-gray-100 ${currentStyle.italic ? 'bg-indigo-50 text-indigo-600' : ''}`}
                             onClick={() => updateStyle(r, c, { italic: !currentStyle.italic })}
                             title="Italic"
                          ><Italic size={14} /></button>
                          <button 
                             className={`p-1 rounded hover:bg-gray-100 ${currentStyle.underline ? 'bg-indigo-50 text-indigo-600' : ''}`}
                             onClick={() => updateStyle(r, c, { underline: !currentStyle.underline })}
                             title="Underline"
                          ><Underline size={14} /></button>
                      </div>

                      {/* H-Align */}
                      <div className="flex gap-0.5 border-r border-gray-200 pr-1 pl-1">
                          <button 
                             className={`p-1 rounded hover:bg-gray-100 ${(!currentStyle.align || currentStyle.align === 'left') ? 'bg-indigo-50 text-indigo-600' : ''}`}
                             onClick={() => updateStyle(r, c, { align: 'left' })}
                             title="Align Left"
                          ><AlignLeft size={14} /></button>
                          <button 
                             className={`p-1 rounded hover:bg-gray-100 ${currentStyle.align === 'center' ? 'bg-indigo-50 text-indigo-600' : ''}`}
                             onClick={() => updateStyle(r, c, { align: 'center' })}
                             title="Align Center"
                          ><AlignCenter size={14} /></button>
                          <button 
                             className={`p-1 rounded hover:bg-gray-100 ${currentStyle.align === 'right' ? 'bg-indigo-50 text-indigo-600' : ''}`}
                             onClick={() => updateStyle(r, c, { align: 'right' })}
                             title="Align Right"
                          ><AlignRight size={14} /></button>
                      </div>

                      {/* V-Align */}
                      <div className="flex gap-0.5 pl-1">
                          <button 
                             className={`p-1 rounded hover:bg-gray-100 ${currentStyle.vAlign === 'top' ? 'bg-indigo-50 text-indigo-600' : ''}`}
                             onClick={() => updateStyle(r, c, { vAlign: 'top' })}
                             title="Align Top"
                          ><ArrowUpToLine size={14} /></button>
                          <button 
                             className={`p-1 rounded hover:bg-gray-100 ${(!currentStyle.vAlign || currentStyle.vAlign === 'middle') ? 'bg-indigo-50 text-indigo-600' : ''}`}
                             onClick={() => updateStyle(r, c, { vAlign: 'middle' })}
                             title="Align Middle"
                          ><AlignVerticalJustifyCenter size={14} /></button>
                          <button 
                             className={`p-1 rounded hover:bg-gray-100 ${currentStyle.vAlign === 'bottom' ? 'bg-indigo-50 text-indigo-600' : ''}`}
                             onClick={() => updateStyle(r, c, { vAlign: 'bottom' })}
                             title="Align Bottom"
                          ><ArrowDownToLine size={14} /></button>
                      </div>
                </div>
            )}

            {isEditing ? (
                <input
                    type="text"
                    autoFocus
                    value={getCellValue(r, c)}
                    onChange={(e) => updateCellValue(r, c, e.target.value)}
                    onBlur={() => setEditingCell(null)}
                    onKeyDown={(e) => {
                        if(e.key === 'Enter') setEditingCell(null);
                    }}
                    className={`w-full bg-white border-none px-1 focus:ring-2 focus:ring-blue-500 focus:ring-inset z-20 ${r === 0 ? 'text-center' : ''}`}
                    style={{ 
                        fontSize: scaledFontSize,
                        fontWeight: cssStyle.fontWeight,
                        fontStyle: cssStyle.fontStyle,
                        textDecoration: cssStyle.textDecoration,
                        textAlign: cssStyle.textAlign as any,
                    }}
                />
            ) : (
                <div 
                    className={`w-full p-1 overflow-hidden text-ellipsis whitespace-nowrap cursor-cell ${r === 0 ? 'text-center' : ''}`}
                    style={{ 
                        fontSize: scaledFontSize,
                        fontWeight: cssStyle.fontWeight,
                        fontStyle: cssStyle.fontStyle,
                        textDecoration: cssStyle.textDecoration,
                        textAlign: cssStyle.textAlign as any,
                    }}
                >
                        {getCellValue(r, c)}
                </div>
            )}
            </div>
        );

        // Push Handles - Now using absolute positioning with explicit grid coordinates to overlay cells
        if (isTableActive) {
            handleElements.push(
                <div 
                    key={`handle-${r}-${c}`}
                    className="absolute w-full h-full pointer-events-none z-[60]"
                    style={{
                        gridColumn: `${c + 1} / span ${colSpan}`,
                        gridRow: `${r + 1} / span ${rowSpan}`,
                    }}
                >
                    {/* Column Resize Handle (Right) - Removed r===0 check to allow resizing from any row */}
                    <div 
                    className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 pointer-events-auto transition-opacity"
                    onMouseDown={(e) => handleMouseDownCol(e, c + colSpan - 1)} 
                    />
                    
                    {/* Row Resize Handle (Bottom) */}
                    <div 
                    className="absolute -bottom-1.5 left-0 right-0 h-3 cursor-row-resize hover:bg-blue-400 opacity-0 hover:opacity-100 pointer-events-auto transition-opacity"
                    onMouseDown={(e) => handleMouseDownRow(e, r + rowSpan - 1)}
                    />
                </div>
            );
        }
    });
  });


  return (
    <div ref={overlayRef} className="relative group/table select-none bg-white shadow-2xl">
      
      {/* --- Move Handle (Top Left) --- */}
      {isTableActive && (
        <div 
            className="absolute -top-[1px] -left-8 w-8 h-8 bg-indigo-900 text-white flex items-center justify-center rounded-l-md cursor-move z-[70] hover:bg-indigo-800 transition-colors"
            onMouseDown={(e) => {
            setIsTableActive(true);
            onDragStart(e);
            }}
            title="Click to select, Drag to move"
        >
            <Move size={16} />
        </div>
      )}

      {/* --- Delete Table Button (Top Right - Conditional) --- */}
      {isTableActive && (
        <button
          onClick={(e) => {
              e.stopPropagation();
              onDelete();
          }}
          className="absolute -top-10 right-0 z-[70] flex items-center justify-center bg-red-600 text-white w-8 h-8 rounded shadow hover:bg-red-700 transition-all animate-in fade-in slide-in-from-bottom-2 duration-200"
          title="Delete Entire Table"
        >
          <Trash2 size={16} />
        </button>
      )}

      {/* Selection Toolbar (Only when NOT editing text) */}
      {selection && !editingCell && (
        <div className="absolute z-[80] bg-gray-900 text-white rounded-md shadow-lg flex items-center p-1.5 gap-2" style={getToolbarStyle()}>
          
          {/* Merge Controls */}
          <div className="flex gap-1 border-r border-gray-700 pr-2">
            {canMerge && (
                <button onClick={mergeCells} className="flex flex-col items-center justify-center w-8 h-8 hover:bg-gray-700 rounded transition-colors" title="Merge Cells">
                    <MergeIcon size={16} />
                </button>
            )}
            {existingMerge && !canMerge && (
                <button onClick={unmergeCells} className="flex flex-col items-center justify-center w-8 h-8 hover:bg-gray-700 rounded transition-colors" title="Unmerge">
                    <Split size={16} />
                </button>
            )}
            {!canMerge && !existingMerge && (
                 <div className="w-8 h-8 flex items-center justify-center opacity-30 cursor-not-allowed">
                     <MergeIcon size={16} />
                 </div>
            )}
          </div>

          {/* Style Clipboard Controls */}
          <div className="flex gap-1 border-r border-gray-700 pr-2">
             <button onClick={handleCopyStyle} className="flex flex-col items-center justify-center w-8 h-8 hover:bg-gray-700 rounded transition-colors" title="Copy Style">
                <Copy size={16} />
            </button>
            <button 
                onClick={handlePasteStyle} 
                disabled={!copiedStyle}
                className={`flex flex-col items-center justify-center w-8 h-8 rounded transition-colors ${copiedStyle ? 'hover:bg-gray-700' : 'opacity-30 cursor-not-allowed'}`}
                title="Paste Style"
            >
                <ClipboardPaste size={16} />
            </button>
          </div>

          {/* Delete Controls */}
          <div className="flex gap-1">
             <button onClick={clearSelection} className="flex flex-col items-center justify-center w-8 h-8 hover:bg-gray-700 rounded transition-colors" title="Clear Content">
                <Eraser size={16} />
            </button>
            
            <button 
                onClick={canDeleteRows ? deleteRows : undefined} 
                disabled={!canDeleteRows}
                className={`flex flex-col items-center justify-center w-8 h-8 rounded transition-colors ${canDeleteRows ? 'hover:bg-red-900/50 hover:text-red-200' : 'opacity-30 cursor-not-allowed'}`} 
                title={canDeleteRows ? "Delete Row(s)" : "Cannot delete all rows"}
            >
                <Rows size={16} />
                <span className="text-[8px] leading-none -mt-1 scale-75">Row</span>
            </button>

            <button 
                onClick={canDeleteCols ? deleteCols : undefined} 
                disabled={!canDeleteCols}
                className={`flex flex-col items-center justify-center w-8 h-8 rounded transition-colors ${canDeleteCols ? 'hover:bg-red-900/50 hover:text-red-200' : 'opacity-30 cursor-not-allowed'}`} 
                title={canDeleteCols ? "Delete Column(s)" : "Cannot delete all columns"}
            >
                <Columns size={16} />
                <span className="text-[8px] leading-none -mt-1 scale-75">Col</span>
            </button>
          </div>

        </div>
      )}

      {/* CSS Grid Container */}
      <div 
        className={`border-l border-t ${borderClass} bg-white relative`}
        style={{
          display: 'grid',
          gridTemplateColumns: displayColWidths.map(w => `${w * scale}px`).join(' '),
          gridTemplateRows: displayRowHeights.map(h => `${h * scale}px`).join(' '),
        }}
        onMouseLeave={() => isSelecting && setIsSelecting(false)}
      >
        {cellElements}
        {handleElements}
      </div>

      {/* Add Controls */}
      {isTableActive && (
        <button
            onClick={addColumn}
            className="absolute top-0 bottom-0 -right-5 w-5 flex items-center justify-center bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-r-md transition-colors text-indigo-600"
            title="Add Column"
        >
            <Plus size={16} />
        </button>
      )}

      {isTableActive && (
        <button
            onClick={addRow}
            className="absolute left-0 right-0 -bottom-5 h-5 flex items-center justify-center bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-b-md transition-colors text-indigo-600"
            title="Add Row"
        >
            <Plus size={16} />
        </button>
      )}

      {/* --- Table Resize Handle (Bottom Right) --- */}
      {isTableActive && (
        <div
            className="absolute -bottom-3 -right-3 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center cursor-nwse-resize z-[90] shadow-lg hover:bg-indigo-700 transition-colors border border-white"
            onMouseDown={handleMouseDownTableResize}
            title="Resize Table"
        >
            <ArrowDownRight size={14} strokeWidth={3} />
        </div>
      )}

      {/* Hints - Moved to Bottom to avoid conflict */}
      {!selection && isTableActive && (
         <div className="absolute top-full mt-7 left-0 bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap pointer-events-none opacity-50 group-hover/table:opacity-100 transition-opacity z-40">
           Drag to select & merge. Dbl-click to edit.
        </div>
      )}
    </div>
  );
};

export default TableOverlay;
