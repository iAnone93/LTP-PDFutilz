
import React, { useEffect, useRef, useState } from 'react';
import { getPDFDocument } from '../../utils/pdfUtils';
import { Placement, TableData, SignatureData } from '../../types';
import { MousePointerClick, ZoomIn, ZoomOut } from 'lucide-react';
import TableOverlay from './TableOverlay';
import SignatureOverlay from './SignatureOverlay';

interface PDFPreviewProps {
  fileData: ArrayBuffer | null;
  onPlacementSelect: (placement: Placement) => void;
  selectedPlacement: Placement | null;
  tableData: TableData;
  onTableDataChange: (data: TableData) => void;
  onDeleteTable: () => void;
  signatures: SignatureData[];
  onSignatureUpdate: (sig: SignatureData) => void;
  onSignatureRemove: (id: string) => void;
  onActivePageChange?: (index: number) => void;
}

const PDFPreview: React.FC<PDFPreviewProps> = ({ 
  fileData, 
  onPlacementSelect, 
  selectedPlacement,
  tableData,
  onTableDataChange,
  onDeleteTable,
  signatures,
  onSignatureUpdate,
  onSignatureRemove,
  onActivePageChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [scale, setScale] = useState(1.0);
  const [rendering, setRendering] = useState(false);

  // --- Drag & Drop State for Signatures ---
  const [dragState, setDragState] = useState<{
    sigId: string;
    offsetX: number; 
    offsetY: number;
    width: number;
    height: number;
    dataUrl: string;
    clientX: number;
    clientY: number;
  } | null>(null);

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

  // --- Active Page Detection ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onActivePageChange) return;

    const handleScroll = () => {
      // Find the page mostly in view. Simple heuristic: page closest to center.
      const pages = container.querySelectorAll('[data-page-index]');
      const containerRect = container.getBoundingClientRect();
      const centerY = containerRect.top + containerRect.height / 2;

      let closestPage = 0;
      let minDistance = Infinity;

      pages.forEach((page) => {
        const rect = page.getBoundingClientRect();
        const pageCenterY = rect.top + rect.height / 2;
        const distance = Math.abs(centerY - pageCenterY);
        if (distance < minDistance) {
          minDistance = distance;
          closestPage = parseInt(page.getAttribute('data-page-index') || '0', 10);
        }
      });
      onActivePageChange(closestPage);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [onActivePageChange, numPages]);

  // --- Global Drag Logic ---
  const handleSigDragStart = (e: React.MouseEvent, sig: SignatureData) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Calculate offset from the top-left of the signature element
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    setDragState({
      sigId: sig.id,
      offsetX,
      offsetY,
      width: sig.width,
      height: sig.height,
      dataUrl: sig.dataUrl,
      clientX: e.clientX,
      clientY: e.clientY
    });
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!dragState) return;
      setDragState(prev => prev ? ({ ...prev, clientX: e.clientX, clientY: e.clientY }) : null);
    };

    const handleUp = (e: MouseEvent) => {
      if (!dragState) return;

      // Drop Logic
      // 1. Determine which page element is under the cursor/center of item
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const pageEl = elements.find(el => el.hasAttribute('data-page-index'));

      if (pageEl) {
        const pageIndex = parseInt(pageEl.getAttribute('data-page-index') || '0', 10);
        const rect = pageEl.getBoundingClientRect();
        
        // 2. Calculate coordinates relative to that page
        const visX = (e.clientX - dragState.offsetX) - rect.left;
        const visY = (e.clientY - dragState.offsetY) - rect.top;

        // 3. Convert to PDF coordinates
        // PDF X = visual X / scale
        // PDF Y = (Page Height - Visual Bottom) / scale
        // Visual Bottom = visY + (height * scale)
        // PDF Y = (rect.height - (visY + dragState.height * scale)) / scale
        //       = (rect.height - visY)/scale - dragState.height
        
        const pdfX = visX / scale;
        const pdfY = (rect.height - visY) / scale - dragState.height;

        const targetSig = signatures.find(s => s.id === dragState.sigId);
        if (targetSig) {
          onSignatureUpdate({
             ...targetSig,
             pageIndex,
             x: pdfX,
             y: pdfY
          });
        }
      }

      setDragState(null);
    };

    if (dragState) {
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
    }
    return () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
    }
  }, [dragState, scale, signatures, onSignatureUpdate]);


  // Handle Canvas Click (Table Placement)
  const handleCanvasClick = (
    e: React.MouseEvent<HTMLDivElement>, 
    pageIndex: number, 
    viewport: any
  ) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).closest('button')) {
      return;
    }
    if (selectedPlacement) return;
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
    <div className="flex flex-col h-full bg-gray-100 rounded-xl overflow-hidden shadow-inner border border-gray-200 relative">
      {/* Dragging Overlay (Global) */}
      {dragState && (
        <div 
          className="fixed z-50 pointer-events-none opacity-80"
          style={{
            left: dragState.clientX - dragState.offsetX,
            top: dragState.clientY - dragState.offsetY,
            width: dragState.width * scale,
            height: dragState.height * scale,
          }}
        >
          <img src={dragState.dataUrl} className="w-full h-full object-contain" alt="Dragging Signature" />
          <div className="absolute inset-0 border border-indigo-500 border-dashed"></div>
        </div>
      )}

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
            signatures={signatures.filter(s => s.pageIndex === i)}
            onSignatureUpdate={onSignatureUpdate}
            onSignatureRemove={onSignatureRemove}
            onSignatureDragStart={handleSigDragStart}
            isDraggingAny={!!dragState}
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
  signatures: SignatureData[];
  onSignatureUpdate: (sig: SignatureData) => void;
  onSignatureRemove: (id: string) => void;
  onSignatureDragStart: (e: React.MouseEvent, sig: SignatureData) => void;
  isDraggingAny: boolean;
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
  onPlacementUpdate,
  signatures,
  onSignatureUpdate,
  onSignatureRemove,
  onSignatureDragStart,
  isDraggingAny
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewport, setViewport] = useState<any>(null);
  const renderTaskRef = useRef<any>(null);
  
  // Drag State (for table)
  const [isDraggingTable, setIsDraggingTable] = useState(false);
  const [dragStartTable, setDragStartTable] = useState<{ x: number; y: number } | null>(null);
  const [initialPlacement, setInitialPlacement] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let isMounted = true;

    const renderPage = async () => {
      if (!canvasRef.current || !pdfDoc) return;

      if (renderTaskRef.current) {
        // Cancel previous render task if it exists
        // Note: cancel() returns void in newer pdf.js, so we don't await or catch it.
        renderTaskRef.current.cancel(); 
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
        // Cancel pending render on cleanup
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfDoc, pageIndex, scale]);

  // Handle Dragging Table
  const handleDragStart = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    e.preventDefault();
    if (!selectedPlacement) return;

    setIsDraggingTable(true);
    setDragStartTable({ x: e.clientX, y: e.clientY });
    setInitialPlacement({ x: selectedPlacement.x, y: selectedPlacement.y });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingTable || !dragStartTable || !initialPlacement || !selectedPlacement) return;

      const deltaX = e.clientX - dragStartTable.x;
      const deltaY = e.clientY - dragStartTable.y;
      const deltaPdfX = deltaX / scale;
      const deltaPdfY = deltaY / scale;

      onPlacementUpdate({
        ...selectedPlacement,
        x: initialPlacement.x + deltaPdfX,
        y: initialPlacement.y - deltaPdfY 
      });
    };

    const handleMouseUp = () => {
      setIsDraggingTable(false);
      setDragStartTable(null);
      setInitialPlacement(null);
    };

    if (isDraggingTable) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingTable, dragStartTable, initialPlacement, scale, selectedPlacement, onPlacementUpdate]);


  return (
    <div 
      className="mb-8 flex justify-center relative group cursor-crosshair"
    >
      <div 
        className="relative shadow-lg" 
        onClick={(e) => viewport && !isDraggingTable && onClick(e, viewport)}
        data-page-index={pageIndex} // Moved here to ensure bounding rect is the page itself, not the flex container
      >
        <canvas ref={canvasRef} className="bg-white" />
        
        {/* Signatures Container */}
        {viewport && signatures.length > 0 && (
           <div className="absolute inset-0 pointer-events-none">
              {signatures.map(sig => (
                  <SignatureOverlay 
                      key={sig.id}
                      signature={sig} 
                      scale={scale} 
                      onUpdate={onSignatureUpdate}
                      onRemove={() => onSignatureRemove(sig.id)}
                      onDragStart={(e) => onSignatureDragStart(e, sig)}
                      isGlobalDragging={isDraggingAny}
                  />
              ))}
           </div>
        )}

        {/* Interactive Table Overlay */}
        {selectedPlacement && viewport && (
          <div 
            className="absolute z-10"
            style={{
              left: selectedPlacement.x * scale,
              top: viewport.height - (selectedPlacement.y * scale),
            }}
            onClick={(e) => e.stopPropagation()} 
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
