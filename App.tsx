import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Download, FileText, Layout, CheckCircle, MousePointer2, Undo, Redo } from 'lucide-react';
import PDFPreview from './components/PDFPreview';
import { readFileAsArrayBuffer, insertTableIntoPDF } from './utils/pdfUtils';
import { TableData, Placement, ProcessingStatus } from './types';

// Initial Data with Dimensions
const INITIAL_TABLE_DATA: TableData = {
  headers: ['Header 1', 'Header 2'],
  rows: [
    ['Cell 1', 'Cell 2']
  ],
  columnWidths: [100, 100],
  rowHeights: [30, 30], // [Header Height, Row 1 Height]
  merges: [],
  styles: {}
};

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<ArrayBuffer | null>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>('idle');

  // --- History Management ---
  const [history, setHistory] = useState<TableData[]>([INITIAL_TABLE_DATA]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Derived state for current data
  const tableData = history[historyIndex];

  const handleTableDataChange = useCallback((newData: TableData) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newData);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
    }
  }, [historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
    }
  }, [historyIndex, history.length]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // --- File Handlers ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setStatus('loading');
      try {
        const buffer = await readFileAsArrayBuffer(selectedFile);
        setFileData(buffer);
        setStatus('idle');
        setPlacement(null); // Reset placement on new file
        
        // Reset History
        setHistory([INITIAL_TABLE_DATA]);
        setHistoryIndex(0);
      } catch (error) {
        console.error("File read error", error);
        setStatus('error');
      }
    }
  };

  const handleDownload = async () => {
    if (!fileData || !placement) return;
    
    setStatus('processing');
    try {
      const newPdfBytes = await insertTableIntoPDF(fileData, tableData, placement);
      const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `updated_${file?.name || 'document.pdf'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error("PDF Generation Error", error);
      setStatus('error');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 z-20 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <Layout size={20} />
          </div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">PDF Table Placer</h1>
        </div>
        <div className="text-sm text-gray-500">
          v1.5.0
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Sidebar Configuration */}
        <aside className="w-80 bg-white border-r border-gray-200 flex flex-col z-10 shadow-lg">
          <div className="p-6 overflow-y-auto flex-1 space-y-8 custom-scrollbar">
            
            {/* Step 1: Upload */}
            <section>
              <div className="flex items-center mb-4 text-indigo-900">
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold mr-2">1</div>
                <h2 className="text-lg font-semibold">Upload Document</h2>
              </div>
              <div className="mt-2">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-indigo-100 border-dashed rounded-lg cursor-pointer bg-indigo-50/50 hover:bg-indigo-50 transition-all group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-3 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                    <p className="mb-1 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> PDF</p>
                    <p className="text-xs text-gray-400">MAX 10MB</p>
                  </div>
                  <input type="file" className="hidden" accept="application/pdf" onChange={handleFileUpload} />
                </label>
                {file && (
                  <div className="mt-3 flex items-center p-3 bg-green-50 text-green-700 rounded-md border border-green-100">
                    <FileText size={16} className="mr-2" />
                    <span className="text-sm truncate font-medium">{file.name}</span>
                    <CheckCircle size={16} className="ml-auto text-green-500" />
                  </div>
                )}
              </div>
            </section>

            {/* Step 2: Edit Instruction & Undo */}
            <section className={!file ? "opacity-50 pointer-events-none filter grayscale transition-all duration-300" : "transition-all duration-300"}>
               <div className="flex items-center justify-between mb-4 text-indigo-900">
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold mr-2">2</div>
                    <h2 className="text-lg font-semibold">Edit Table</h2>
                  </div>
                  
                  {/* Undo/Redo Buttons */}
                  <div className="flex space-x-1 bg-gray-100 p-1 rounded-md">
                    <button 
                      onClick={undo} 
                      disabled={historyIndex === 0}
                      className="p-1.5 hover:bg-white hover:text-indigo-600 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                      title="Undo (Ctrl+Z)"
                    >
                      <Undo size={16} />
                    </button>
                    <button 
                      onClick={redo} 
                      disabled={historyIndex === history.length - 1}
                      className="p-1.5 hover:bg-white hover:text-indigo-600 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                      title="Redo (Ctrl+Shift+Z)"
                    >
                      <Redo size={16} />
                    </button>
                  </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
                <div className="flex items-start">
                   <MousePointer2 size={16} className="mt-0.5 mr-2 shrink-0" />
                   <p>Click PDF to place. <br/>Drag to <b>select & merge</b>.<br/>Drag edges to <b>resize</b>.</p>
                </div>
              </div>
            </section>

            {/* Step 3: Download */}
             <section className={!file || !placement ? "opacity-50 pointer-events-none filter grayscale transition-all duration-300" : "transition-all duration-300"}>
               <div className="flex items-center mb-4 text-indigo-900">
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold mr-2">3</div>
                <h2 className="text-lg font-semibold">Generate</h2>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-4">
                 <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Target:</span>
                    <span className="font-mono font-bold text-gray-900">
                        {placement ? `Pg ${placement.pageIndex + 1} @ ${Math.round(placement.x)},${Math.round(placement.y)}` : '-'}
                    </span>
                </div>
              </div>

              <button
                onClick={handleDownload}
                disabled={status === 'processing'}
                className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 transition-all"
              >
                {status === 'processing' ? (
                   <>Processing...</>
                ) : status === 'success' ? (
                   <>Downloaded!</>
                ) : (
                   <><Download className="mr-2" size={20} /> Download PDF</>
                )}
              </button>
            </section>
          </div>
        </aside>

        {/* Preview Area */}
        <section className="flex-1 bg-gray-100/50 p-6 flex flex-col h-full overflow-hidden">
            <PDFPreview 
              fileData={fileData} 
              onPlacementSelect={setPlacement}
              selectedPlacement={placement}
              tableData={tableData}
              onTableDataChange={handleTableDataChange}
              onDeleteTable={() => setPlacement(null)}
            />
            {file && !placement && (
                <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-gray-900/80 text-white px-4 py-2 rounded-full text-sm font-medium animate-pulse shadow-lg pointer-events-none z-50 backdrop-blur-sm">
                    Click anywhere on the PDF to place the table
                </div>
            )}
        </section>

      </main>
    </div>
  );
};

export default App;