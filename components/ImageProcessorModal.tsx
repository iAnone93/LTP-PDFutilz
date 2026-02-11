
import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Sliders } from 'lucide-react';

interface ImageProcessorModalProps {
  file: File;
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
}

const ImageProcessorModal: React.FC<ImageProcessorModalProps> = ({ file, onConfirm, onCancel }) => {
  const [threshold, setThreshold] = useState<number>(200);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load image from file
  useEffect(() => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      setOriginalImage(img);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Process image when threshold or image changes
  useEffect(() => {
    if (!originalImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;

    // Draw original image
    ctx.drawImage(originalImage, 0, 0);

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Apply thresholding (Background Removal)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Calculate brightness
      const brightness = (r + g + b) / 3;

      // If brightness is higher than threshold, make it transparent
      if (brightness > threshold) {
        data[i + 3] = 0; // Alpha = 0
      }
    }

    // Put modified data back
    ctx.putImageData(imageData, 0, 0);

  }, [originalImage, threshold]);

  const handleSave = () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onConfirm(dataUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Sliders size={20} />
            Clean Up Signature
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-6 overflow-y-auto">
          <p className="text-sm text-gray-600">
            Adjust the slider to remove the background. The checkerboard pattern indicates transparency.
          </p>
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 flex justify-between">
              <span>Background Removal Sensitivity</span>
              <span className="text-indigo-600">{Math.round((threshold / 255) * 100)}%</span>
            </label>
            <input 
              type="range" 
              min="0" 
              max="255" 
              value={threshold} 
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          <div className="flex gap-4 h-64 justify-center">
             {/* Preview */}
             <div className="flex-1 bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] border border-gray-300 rounded-lg overflow-hidden relative flex items-center justify-center bg-gray-100">
                <canvas 
                  ref={canvasRef} 
                  className="max-w-full max-h-full object-contain"
                />
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 flex items-center gap-2"
          >
            <Check size={16} />
            Use Signature
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageProcessorModal;
