import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Layers, 
  UploadCloud, 
  Trash2, 
  Download, 
  ChevronUp, 
  ChevronDown, 
  ChevronsUp, 
  ChevronsDown, 
  Plus, 
  FileText, 
  ArrowUpDown, 
  AlertCircle, 
  Loader2, 
  FileCheck,
  Eye
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

interface PdfFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number | null;
  error?: string;
  loadingPages?: boolean;
}

const PdfMerge: React.FC = () => {
  const [pdfFiles, setPdfFiles] = useState<PdfFileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  const [isMerging, setIsMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState<string>('');
  const [mergedBlobUrl, setMergedBlobUrl] = useState<string | null>(null);
  const [mergedFileName, setMergedFileName] = useState<string>('merged_document.pdf');
  const [mergedStats, setMergedStats] = useState<{ totalPages: number; totalSize: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const appendInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const processIncomingFiles = async (newFilesList: FileList | File[]) => {
    setErrorMessage(null);
    const validPdfFiles: File[] = [];

    Array.from(newFilesList).forEach((file) => {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        validPdfFiles.push(file);
      }
    });

    if (validPdfFiles.length === 0) {
      setErrorMessage('Please select valid PDF files (.pdf).');
      return;
    }

    const newItems: PdfFileItem[] = validPdfFiles.map((file) => ({
      id: Math.random().toString(36).substring(2, 9) + '-' + Date.now(),
      file,
      name: file.name,
      size: file.size,
      pageCount: null,
      loadingPages: true
    }));

    setPdfFiles((prev) => [...prev, ...newItems]);

    // Inspect page count asynchronously
    newItems.forEach(async (item) => {
      try {
        const buffer = await item.file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const count = pdfDoc.getPageCount();

        setPdfFiles((current) =>
          current.map((f) =>
            f.id === item.id ? { ...f, pageCount: count, loadingPages: false } : f
          )
        );
      } catch (err: any) {
        setPdfFiles((current) =>
          current.map((f) =>
            f.id === item.id
              ? {
                  ...f,
                  pageCount: null,
                  loadingPages: false,
                  error: 'Encrypted or unreadable PDF'
                }
              : f
          )
        );
      }
    });
  };

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
      processIncomingFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processIncomingFiles(e.target.files);
      e.target.value = '';
    }
  };

  const removeFile = (id: string) => {
    setPdfFiles((prev) => prev.filter((f) => f.id !== id));
    if (mergedBlobUrl) {
      setMergedBlobUrl(null);
    }
  };

  const clearAll = () => {
    setPdfFiles([]);
    setMergedBlobUrl(null);
    setErrorMessage(null);
  };

  // Reordering functions
  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pdfFiles.length) return;
    setPdfFiles((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  };

  const moveToTop = (index: number) => {
    moveItem(index, 0);
  };

  const moveToBottom = (index: number) => {
    moveItem(index, pdfFiles.length - 1);
  };

  const moveUp = (index: number) => {
    moveItem(index, index - 1);
  };

  const moveDown = (index: number) => {
    moveItem(index, index + 1);
  };

  const reverseOrder = () => {
    setPdfFiles((prev) => [...prev].reverse());
  };

  const sortByNameAsc = () => {
    setPdfFiles((prev) => [...prev].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const sortByNameDesc = () => {
    setPdfFiles((prev) => [...prev].sort((a, b) => b.name.localeCompare(a.name)));
  };

  // Drag & drop item sorting
  const handleItemDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleItemDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedItemId && draggedItemId !== id) {
      setDragOverItemId(id);
    }
  };

  const handleItemDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItemId || draggedItemId === targetId) {
      setDraggedItemId(null);
      setDragOverItemId(null);
      return;
    }

    const fromIndex = pdfFiles.findIndex((f) => f.id === draggedItemId);
    const toIndex = pdfFiles.findIndex((f) => f.id === targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      moveItem(fromIndex, toIndex);
    }

    setDraggedItemId(null);
    setDragOverItemId(null);
  };

  const totalPages = pdfFiles.reduce((sum, item) => sum + (item.pageCount || 0), 0);
  const totalBytes = pdfFiles.reduce((sum, item) => sum + item.size, 0);

  // Merge PDFs
  const handleMergePdfs = async () => {
    if (pdfFiles.length < 2) {
      setErrorMessage('Please add at least 2 PDF files to merge.');
      return;
    }

    setIsMerging(true);
    setErrorMessage(null);
    setMergedBlobUrl(null);
    setMergeProgress('Creating new document...');

    try {
      const mergedPdf = await PDFDocument.create();

      for (let i = 0; i < pdfFiles.length; i++) {
        const item = pdfFiles[i];
        setMergeProgress(`Merging (${i + 1}/${pdfFiles.length}): ${item.name}`);

        const fileBuffer = await item.file.arrayBuffer();
        const sourcePdf = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
        const copiedPages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());

        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      setMergeProgress('Finalizing merged PDF...');
      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      // Determine smart output filename
      const firstName = pdfFiles[0]?.name.replace(/\.pdf$/i, '') || 'document';
      const outputName = `${firstName}_merged_${pdfFiles.length}files.pdf`;

      setMergedFileName(outputName);
      setMergedStats({
        totalPages: mergedPdf.getPageCount(),
        totalSize: blob.size
      });
      setMergedBlobUrl(url);
    } catch (err: any) {
      console.error('Merge error:', err);
      setErrorMessage(
        err.message || 'An error occurred while merging the PDF files. Please check if any file is password protected.'
      );
    } finally {
      setIsMerging(false);
      setMergeProgress('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 -ml-2 mr-1 text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <div className="bg-purple-600 p-2 rounded-lg text-white">
            <Layers size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-800 tracking-tight">PDF Merge</h1>
              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 font-semibold rounded-full hidden sm:inline-block">
                v1.8.0
              </span>
            </div>
            <p className="text-xs text-gray-500 hidden sm:block">Combine multiple PDF files into one in any custom order</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {pdfFiles.length > 0 && (
            <button
              onClick={clearAll}
              disabled={isMerging}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all"
            >
              <Trash2 size={16} />
              <span className="hidden sm:inline">Clear All</span>
            </button>
          )}

          <button
            onClick={handleMergePdfs}
            disabled={pdfFiles.length < 2 || isMerging}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all active:scale-95"
          >
            {isMerging ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Merging...
              </>
            ) : (
              <>
                <Layers size={16} />
                Merge PDFs
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Error Notification */}
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <AlertCircle size={20} className="text-red-500 shrink-0" />
              <span className="text-sm font-medium">{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-sm font-bold text-red-500 hover:text-red-700">
              Dismiss
            </button>
          </div>
        )}

        {/* Success Merged Banner */}
        {mergedBlobUrl && (
          <div className="bg-emerald-50 border-2 border-emerald-300 p-6 rounded-2xl shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                  <FileCheck size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">PDFs Merged Successfully!</h3>
                    <span className="px-2 py-0.5 bg-emerald-200 text-emerald-800 text-xs font-semibold rounded-full">
                      Ready
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    File: <span className="font-semibold text-gray-800">{mergedFileName}</span>
                    {mergedStats && (
                      <span className="ml-2 text-gray-500">
                        • {mergedStats.totalPages} total pages • {formatFileSize(mergedStats.totalSize)}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={mergedBlobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100/50 font-medium rounded-xl transition-all shadow-sm text-sm"
                >
                  <Eye size={16} />
                  Preview
                </a>

                <a
                  href={mergedBlobUrl}
                  download={mergedFileName}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow active:scale-95 text-sm"
                >
                  <Download size={16} />
                  Download Merged PDF
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Upload Zone */}
        <section>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept=".pdf,application/pdf"
            className="hidden"
          />
          <input
            type="file"
            ref={appendInputRef}
            onChange={handleFileChange}
            multiple
            accept=".pdf,application/pdf"
            className="hidden"
          />

          {pdfFiles.length === 0 ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all bg-white shadow-sm ${
                isDragging
                  ? 'border-purple-500 bg-purple-50/70 scale-[0.99]'
                  : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/20'
              }`}
            >
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600">
                <UploadCloud size={40} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Select or Drop PDF Files to Merge</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto text-sm">
                Choose 2 or more PDF documents from your computer. You will be able to organize the first, last, and exact order before merging.
              </p>
              <button
                type="button"
                className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 shadow-md transition-all active:scale-95"
              >
                Choose PDF Files
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-5">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-800 text-lg">Files to Merge</span>
                  <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full">
                    {pdfFiles.length} {pdfFiles.length === 1 ? 'file' : 'files'}
                  </span>
                  {totalPages > 0 && (
                    <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full hidden sm:inline-block">
                      {totalPages} combined pages
                    </span>
                  )}
                  <span className="text-xs text-gray-400">({formatFileSize(totalBytes)})</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => appendInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200"
                  >
                    <Plus size={14} />
                    Add More PDFs
                  </button>

                  <button
                    onClick={reverseOrder}
                    title="Reverse the current file order"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                  >
                    <ArrowUpDown size={14} />
                    Reverse Order
                  </button>

                  <button
                    onClick={sortByNameAsc}
                    title="Sort files alphabetically (A to Z)"
                    className="px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 hidden md:inline-block"
                  >
                    Sort A-Z
                  </button>

                  <button
                    onClick={sortByNameDesc}
                    title="Sort files alphabetically (Z to A)"
                    className="px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 hidden md:inline-block"
                  >
                    Sort Z-A
                  </button>
                </div>
              </div>

              {/* Order Help Banner */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-center justify-between">
                <span>
                  💡 <strong>Tip:</strong> Drag and drop items or use the arrow buttons to position which PDF appears <strong>first</strong> and <strong>last</strong> in the final merged file.
                </span>
                <span className="font-semibold text-indigo-700 hidden md:inline">
                  Top = 1st in merged PDF
                </span>
              </div>

              {/* Files List */}
              <div className="space-y-3">
                {pdfFiles.map((item, index) => {
                  const isFirst = index === 0;
                  const isLast = index === pdfFiles.length - 1;
                  const isDragged = draggedItemId === item.id;
                  const isDragOver = dragOverItemId === item.id;

                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleItemDragStart(e, item.id)}
                      onDragOver={(e) => handleItemDragOver(e, item.id)}
                      onDrop={(e) => handleItemDrop(e, item.id)}
                      className={`group flex items-center justify-between p-3.5 sm:p-4 rounded-xl border transition-all ${
                        isDragged ? 'opacity-40 border-purple-300 bg-purple-50' : 'bg-white'
                      } ${
                        isDragOver ? 'border-purple-500 border-2 bg-purple-50/50' : 'border-gray-200 hover:border-gray-300'
                      } shadow-sm`}
                    >
                      {/* Left side: Position badge & file info */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {/* Order Number Badge */}
                        <div className="flex flex-col items-center justify-center shrink-0">
                          <span
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isFirst
                                ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-200'
                                : isLast
                                ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-200'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            #{index + 1}
                          </span>
                          <span className="text-[10px] font-semibold mt-1 text-gray-500">
                            {isFirst ? 'FIRST' : isLast ? 'LAST' : ''}
                          </span>
                        </div>

                        {/* PDF File Icon */}
                        <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                          <FileText size={22} />
                        </div>

                        {/* File Details */}
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-800 text-sm truncate" title={item.name}>
                              {item.name}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap">
                            <span>{formatFileSize(item.size)}</span>
                            <span>•</span>
                            {item.loadingPages ? (
                              <span className="flex items-center gap-1 text-purple-600">
                                <Loader2 size={12} className="animate-spin" />
                                Reading pages...
                              </span>
                            ) : item.error ? (
                              <span className="text-red-500 font-medium">{item.error}</span>
                            ) : (
                              <span className="font-medium text-gray-700">
                                {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right side: Reorder Actions & Remove */}
                      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        {/* Move to Top */}
                        <button
                          type="button"
                          onClick={() => moveToTop(index)}
                          disabled={isFirst}
                          title="Move to First position"
                          className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                        >
                          <ChevronsUp size={16} />
                        </button>

                        {/* Move Up */}
                        <button
                          type="button"
                          onClick={() => moveUp(index)}
                          disabled={isFirst}
                          title="Move Up"
                          className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                        >
                          <ChevronUp size={18} />
                        </button>

                        {/* Move Down */}
                        <button
                          type="button"
                          onClick={() => moveDown(index)}
                          disabled={isLast}
                          title="Move Down"
                          className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                        >
                          <ChevronDown size={18} />
                        </button>

                        {/* Move to Bottom */}
                        <button
                          type="button"
                          onClick={() => moveToBottom(index)}
                          disabled={isLast}
                          title="Move to Last position"
                          className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                        >
                          <ChevronsDown size={16} />
                        </button>

                        {/* Delete button */}
                        <div className="pl-1 border-l border-gray-200 ml-1">
                          <button
                            type="button"
                            onClick={() => removeFile(item.id)}
                            title="Remove file"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Quick Add / Merge footer */}
              <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-gray-500">
                  Total of <span className="font-semibold text-gray-800">{pdfFiles.length} files</span> with{' '}
                  <span className="font-semibold text-gray-800">{totalPages} total pages</span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => appendInputRef.current?.click()}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl text-sm transition-colors"
                  >
                    <Plus size={16} />
                    Add Another PDF
                  </button>

                  <button
                    type="button"
                    onClick={handleMergePdfs}
                    disabled={pdfFiles.length < 2 || isMerging}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isMerging ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        {mergeProgress || 'Merging...'}
                      </>
                    ) : (
                      <>
                        <Layers size={16} />
                        Merge {pdfFiles.length} PDFs
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default PdfMerge;
