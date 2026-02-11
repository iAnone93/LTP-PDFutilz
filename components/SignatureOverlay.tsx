
import React, { useRef } from 'react';
import { SignatureData } from '../types';
import { X, ArrowDownRight } from 'lucide-react';

interface SignatureOverlayProps {
  signature: SignatureData;
  scale: number;
  onUpdate: (updated: SignatureData) => void;
  onRemove: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  isGlobalDragging: boolean;
}

const SignatureOverlay: React.FC<SignatureOverlayProps> = ({ 
  signature, 
  scale, 
  onUpdate, 
  onRemove,
  onDragStart,
  isGlobalDragging
}) => {
  const isResizing = useRef(false);
  const resizeStart = useRef({ 
    mouseX: 0, 
    mouseY: 0, 
    width: 0, 
    height: 0,
    sigY: 0
  });

  // Handle Resize
  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    isResizing.current = true;
    
    resizeStart.current = { 
      mouseX: e.clientX, 
      mouseY: e.clientY,
      width: signature.width, 
      height: signature.height,
      sigY: signature.y
    };

    const handleMouseMove = (mv: MouseEvent) => {
      if (!isResizing.current) return;
      
      const deltaX = (mv.clientX - resizeStart.current.mouseX) / scale;
      const deltaY = (mv.clientY - resizeStart.current.mouseY) / scale; 

      // Calculate new dimensions
      const newWidth = Math.max(20, resizeStart.current.width + deltaX);
      
      // Calculate new Height
      const newHeight = Math.max(20, resizeStart.current.height + deltaY);
      
      // Calculate new Y position to anchor top
      const actualHeightChange = newHeight - resizeStart.current.height;
      const newY = resizeStart.current.sigY - actualHeightChange;

      onUpdate({
        ...signature,
        width: newWidth,
        height: newHeight,
        y: newY
      });
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      className="absolute group select-none pointer-events-auto z-20"
      // Delegate Drag Start
      onMouseDown={onDragStart}
      style={{
        left: signature.x * scale,
        top: 'auto', 
        bottom: signature.y * scale, 
        width: signature.width * scale,
        height: signature.height * scale,
        cursor: isGlobalDragging ? 'grabbing' : 'grab'
      }}
    >
      <div className="relative w-full h-full border border-transparent group-hover:border-dashed group-hover:border-indigo-500 hover:border-solid bg-transparent group-hover:bg-indigo-50/10">
        <img 
          src={signature.dataUrl} 
          alt="Signature" 
          className="w-full h-full object-contain pointer-events-none" 
          draggable={false}
        />

        {/* Delete Handle (Top Right) */}
        <button 
          className="absolute -top-3 -right-3 p-1 bg-red-500 text-white rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600 z-30"
          onMouseDown={(e) => e.stopPropagation()} 
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
        >
          <X size={12} />
        </button>

        {/* Resize Handle (Bottom Right) */}
        <div 
          className="absolute -bottom-3 -right-3 p-1 bg-indigo-600 text-white rounded-full cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-30"
          onMouseDown={handleMouseDownResize}
        >
          <ArrowDownRight size={12} />
        </div>
      </div>
    </div>
  );
};

export default SignatureOverlay;
