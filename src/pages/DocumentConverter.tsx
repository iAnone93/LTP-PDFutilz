// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileOutput, FileText, File, Table, Image as ImageIcon, UploadCloud, FileCheck, Loader2, Download, X } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as pdfjsLib from 'pdfjs-dist';
import { Document as DocxDocument, Packer, Paragraph, TextRun } from "docx";
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

type ConversionType = 'pdf-to-word' | 'word-to-pdf' | 'pdf-to-excel' | 'excel-to-pdf' | 'jpg-to-pdf' | 'pdf-to-jpg' | null;

const conversionOptions = [
  { id: 'pdf-to-word', label: 'PDF to Word', icon: FileText, from: 'PDF', to: 'Word', ext: '.pdf' },
  { id: 'word-to-pdf', label: 'Word to PDF', icon: File, from: 'Word', to: 'PDF', ext: '.doc,.docx' },
  { id: 'pdf-to-excel', label: 'PDF to Excel', icon: Table, from: 'PDF', to: 'Excel', ext: '.pdf' },
  { id: 'excel-to-pdf', label: 'Excel to PDF', icon: File, from: 'Excel', to: 'PDF', ext: '.xls,.xlsx' },
  { id: 'jpg-to-pdf', label: 'JPG to PDF', icon: File, from: 'JPG', to: 'PDF', ext: '.jpg,.jpeg,.png' },
  { id: 'pdf-to-jpg', label: 'PDF to JPG', icon: ImageIcon, from: 'PDF', to: 'JPG', ext: '.pdf' },
];

const DocumentConverter: React.FC = () => {
  const [selectedType, setSelectedType] = useState<ConversionType>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'converting' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = conversionOptions.find(opt => opt.id === selectedType);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const processJpgToPdf = async (inputFile: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
          const pdf = new jsPDF({
            orientation: img.width > img.height ? "l" : "p",
            unit: "px",
            format: [img.width, img.height]
          });
          pdf.addImage(img, 'JPEG', 0, 0, img.width, img.height);
          resolve(pdf.output('blob'));
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(inputFile);
    });
  };

  const processPdfToJpg = async (inputFile: File): Promise<Blob> => {
    const arrayBuffer = await inputFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const page = await pdf.getPage(1);
    
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({
      canvasContext: context!,
      viewport: viewport
    }).promise;
    
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob from canvas"));
      }, 'image/jpeg', 0.9);
    });
  };

  const processPdfToWord = async (inputFile: File): Promise<Blob> => {
    const arrayBuffer = await inputFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    
    const paragraphs: Paragraph[] = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      
      // Sort items by Y coordinate (descending, as PDF origin is bottom-left), then by X coordinate (ascending)
      const items = content.items as any[];
      items.sort((a, b) => {
        const yDiff = b.transform[5] - a.transform[5];
        if (Math.abs(yDiff) > 5) { // If Y difference is significant, they are on different lines
          return yDiff;
        }
        return a.transform[4] - b.transform[4]; // Sort left to right on the same line
      });

      let currentLine = "";
      let lastY: number | null = null;

      for (const item of items) {
        if (lastY !== null && Math.abs(lastY - item.transform[5]) > 5) {
          // New line detected
          if (currentLine.trim()) {
            paragraphs.push(new Paragraph({ children: [new TextRun(currentLine.trim())] }));
          }
          currentLine = "";
        }
        currentLine += item.str + " ";
        lastY = item.transform[5];
      }
      
      if (currentLine.trim()) {
        paragraphs.push(new Paragraph({ children: [new TextRun(currentLine.trim())] }));
      }
      
      // Page break or space between pages
      paragraphs.push(new Paragraph({ children: [new TextRun("")] }));
    }
    
    const doc = new DocxDocument({
      sections: [{
        properties: {},
        children: paragraphs.length > 0 ? paragraphs : [new Paragraph({ children: [new TextRun("No text found in PDF.")] })]
      }]
    });
    
    return await Packer.toBlob(doc);
  };

  const processWordToPdf = async (inputFile: File): Promise<Blob> => {
    const arrayBuffer = await inputFile.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value;
    
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(text, 180);
    doc.text(lines, 10, 10);
    
    return doc.output('blob');
  };

  const processExcelToPdf = async (inputFile: File): Promise<Blob> => {
    const arrayBuffer = await inputFile.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    const doc = new jsPDF();
    if (data.length > 0) {
      autoTable(doc, {
        head: [data[0]],
        body: data.slice(1)
      });
    }
    return doc.output('blob');
  };

  const processPdfToExcel = async (inputFile: File): Promise<Blob> => {
    const arrayBuffer = await inputFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    
    const rows: any[][] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      content.items.forEach((item: any) => {
        if (item.str.trim()) {
          rows.push([item.str]);
        }
      });
    }
    
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([wbout], { type: "application/octet-stream" });
  };

  const startConversion = async () => {
    if (!file || !selectedType) return;
    setStatus('converting');
    setProgress(10);
    setErrorMessage('');
    
    try {
      let resultBlob: Blob | null = null;
      
      setProgress(40);
      switch (selectedType) {
        case 'jpg-to-pdf':
          resultBlob = await processJpgToPdf(file);
          break;
        case 'pdf-to-jpg':
          resultBlob = await processPdfToJpg(file);
          break;
        case 'pdf-to-word':
          resultBlob = await processPdfToWord(file);
          break;
        case 'word-to-pdf':
          resultBlob = await processWordToPdf(file);
          break;
        case 'excel-to-pdf':
          resultBlob = await processExcelToPdf(file);
          break;
        case 'pdf-to-excel':
          resultBlob = await processPdfToExcel(file);
          break;
        default:
          throw new Error("Conversion not implemented");
      }
      
      setProgress(100);
      setConvertedBlob(resultBlob);
      setStatus('completed');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || 'An error occurred during conversion.');
    }
  };

  const reset = () => {
    setFile(null);
    setStatus('idle');
    setProgress(0);
    setConvertedBlob(null);
    setErrorMessage('');
  };

  const handleDownload = () => {
    if (!file || !selectedOption || !convertedBlob) return;
    
    let targetExt = selectedOption.to.toLowerCase();
    if (targetExt === 'word') targetExt = 'docx';
    if (targetExt === 'excel') targetExt = 'xlsx';
    if (selectedOption.id === 'pdf-to-jpg') targetExt = 'jpg';
    
    const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const newFileName = `${originalName}_converted.${targetExt}`;
    
    const url = URL.createObjectURL(convertedBlob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = newFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 z-20 shadow-sm relative">
        <div className="flex items-center space-x-3">
          <Link to="/" className="p-2 -ml-2 mr-1 text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <div className="bg-orange-600 p-2 rounded-lg text-white">
            <FileOutput size={20} />
          </div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight truncate">Document Converter</h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center overflow-auto p-6 md:p-8">
        <div className="text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-500">
            <FileOutput size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Under Construction</h2>
          <p className="text-gray-500 mb-8">
            The Document Converter tool is currently being upgraded and is temporarily disabled. Please check back later.
          </p>
          <Link to="/" className="inline-flex items-center justify-center px-6 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm">
            Back to Toolkit
          </Link>
        </div>
      </main>
    </div>
  );
};

export default DocumentConverter;
