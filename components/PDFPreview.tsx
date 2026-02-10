import React, { useEffect, useRef, useState } from 'react';
import { getPDFDocument } from '../utils/pdfUtils';
import { Placement, TableData } from '../types';
import { MousePointerClick, ZoomIn, ZoomOut } from 'lucide-react';
import TableOverlay from './TableOverlay';

interface PDFPreviewProps {
  fileData: ArrayBuffer | null;
  onPlacementSelect: (placement: Placement) => void;
  selectedPlacement: Placement | null;
  tableData: TableData;
  onTableDataChange: (data: TableData) => void;
  onDeleteTable: () => void;
}

const PDFPreview: React.FC<PDFPreviewProps> = ({ 
  fileData, 
  onPlacementSelect, 
  selectedPlacement,
  tableData,
  onTableDataChange,
  onDeleteTable
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [scale, setScale] = useState(1.0);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    const loadPdf = async () => {
      if (!fileData) return;
      try {
        setRendering(true);
        const doc = await getPDFDocument(fileData);
        setPdfDoc(doc);
        setNumPages(doc.numPages);
      } catch (err) {
        console.error("Error loading PDF", err);
      } finally {
        setRendering(false);
      }
    };
    loadPdf();
  }, [fileData]);

  // Handle Canvas Click
  const handleCanvasClick = (
    e: React.MouseEvent<HTMLDivElement>, 
    pageIndex: number, 
    viewport: any
  ) => {
    // If clicking inside inputs (which stop propagation), don't move the table
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).closest('button')) {
      return;
    }

    // If table is already placed, prevent moving it by clicking elsewhere on the canvas.
    if (selectedPlacement) {
      return;
    }

    if (!containerRef.current) return;
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const xCanvas = e.clientX - rect.left;
    const yCanvas = e.clientY - rect.top;

    const xPdf = xCanvas / scale;
    const yPdf = (viewport.height - yCanvas) / scale;

    onPlacementSelect({
      pageIndex,
      x: xPdf,
      y: yPdf,
      pageWidth: viewport.width / scale,
      pageHeight: viewport.height / scale,
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 rounded-xl overflow-hidden shadow-inner border border-gray-200">
      {/* Toolbar */}
      <div className="bg-white p-2 border-b border-gray-200 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="text-xs font-semibold text-gray-500 uppercase px-2">PDF Preview</div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>
          <span className="text-xs font-mono w-12 text-center text-gray-600">{Math.round(scale * 100)}%</span>
          <button 
            onClick={() => setScale(s => Math.min(3.0, s + 0.25))}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={18} />
          </button>
        </div>
      </div>

      {/* Pages Container */}
      <div className="flex-1 overflow-auto p-8 relative" ref={containerRef}>
        {!fileData && (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <MousePointerClick size={48} className="mb-4 opacity-50" />
            <p>Upload a PDF to start previewing</p>
          </div>
        )}

        {rendering && (
           <div className="h-full flex items-center justify-center text-indigo-500">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
           </div>
        )}

        {pdfDoc && Array.from({ length: numPages }, (_, i) => (
          <PDFPage 
            key={i} 
            pdfDoc={pdfDoc} 
            pageIndex={i} 
            scale={scale} 
            onClick={(e, vp) => handleCanvasClick(e, i, vp)}
            selectedPlacement={selectedPlacement?.pageIndex === i ? selectedPlacement : null}
            tableData={tableData}
            onTableDataChange={onTableDataChange}
            onDeleteTable={onDeleteTable}
            onPlacementUpdate={onPlacementSelect}
          />
        ))}
      </div>
    </div>
  );
};

interface PDFPageProps {
  pdfDoc: any;
  pageIndex: number;
  scale: number;
  onClick: (e: React.MouseEvent<HTMLDivElement>, viewport: any) => void;
  selectedPlacement: Placement | null;
  tableData: TableData;
  onTableDataChange: (data: TableData) => void;
  onDeleteTable: () => void;
  onPlacementUpdate: (placement: Placement) => void;
}

const PDFPage: React.FC<PDFPageProps> = ({ 
  pdfDoc, 
  pageIndex, 
  scale, 
  onClick, 
  selectedPlacement,
  tableData,
  onTableDataChange,
  onDeleteTable,
  onPlacementUpdate
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewport, setViewport] = useState<any>(null);
  const renderTaskRef = useRef<any>(null);
  
  // Drag State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [initialPlacement, setInitialPlacement] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let isMounted = true;

    const renderPage = async () => {
      if (!canvasRef.current || !pdfDoc) return;

      // Cancel previous render task if it exists to avoid "canvas in use" errors
      if (renderTaskRef.current) {
        try {
          await renderTaskRef.current.cancel();
        } catch (error) {
          // Ignore cancellation errors
        }
      }

      try {
        const page = await pdfDoc.getPage(pageIndex + 1);
        if (!isMounted) return;

        const vp = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        canvas.height = vp.height;
        canvas.width = vp.width;

        const renderContext = {
          canvasContext: context,
          viewport: vp,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;

        if (isMounted) {
          setViewport(vp);
          renderTaskRef.current = null;
        }
      } catch (error: any) {
        if (error.name !== 'RenderingCancelledException') {
          console.error('Render error:', error);
        }
      }
    };

    renderPage();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel().catch(() => {});
      }
    };
  }, [pdfDoc, pageIndex, scale]);

  // Handle Dragging
  const handleDragStart = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    e.preventDefault();
    if (!selectedPlacement) return;

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPlacement({ x: selectedPlacement.x, y: selectedPlacement.y });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragStart || !initialPlacement || !selectedPlacement) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      // Convert screen pixels to PDF units
      const deltaPdfX = deltaX / scale;
      const deltaPdfY = deltaY / scale;

      // Update Placement
      // Note: PDF coordinates: Y increases upwards. 
      // Screen coordinates: Y increases downwards.
      // Moving mouse down (positive deltaY) should DECREASE PDF Y.
      onPlacementUpdate({
        ...selectedPlacement,
        x: initialPlacement.x + deltaPdfX,
        y: initialPlacement.y - deltaPdfY 
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragStart(null);
      setInitialPlacement(null);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, initialPlacement, scale, selectedPlacement, onPlacementUpdate]);


  return (
    <div className="mb-8 flex justify-center relative group cursor-crosshair">
      <div className="relative shadow-lg" onClick={(e) => viewport && !isDragging && onClick(e, viewport)}>
        <canvas ref={canvasRef} className="bg-white" />
        
        {/* Interactive Table Overlay */}
        {selectedPlacement && viewport && (
          <div 
            className="absolute z-10"
            style={{
              left: selectedPlacement.x * scale,
              top: viewport.height - (selectedPlacement.y * scale),
            }}
            onClick={(e) => e.stopPropagation()} // Prevent repositioning when clicking the table itself
          >
             <TableOverlay 
               data={tableData} 
               onChange={onTableDataChange} 
               onDelete={onDeleteTable}
               scale={scale} 
               onDragStart={handleDragStart}
             />
          </div>
        )}
        
        {/* Hover hint */}
        {!selectedPlacement && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-indigo-900/5 pointer-events-none transition-opacity duration-200 flex items-center justify-center">
              <span className="bg-white/90 text-gray-700 text-xs px-2 py-1 rounded shadow-sm backdrop-blur-sm">
                  Click to place table
              </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFPreview;