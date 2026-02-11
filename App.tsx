
import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Download, FileText, Layout, CheckCircle, MousePointer2, Undo, Redo, PenTool, Menu, X } from 'lucide-react';
import PDFPreview from './components/PDFPreview';
import { readFileAsArrayBuffer, insertTableIntoPDF } from './utils/pdfUtils';
import { TableData, Placement, ProcessingStatus, SignatureData } from './types';
import ImageProcessorModal from './components/ImageProcessorModal';

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

  // Signature State
  const [signatures, setSignatures] = useState<SignatureData[]>([]);
  const [signatureFileToProcess, setSignatureFileToProcess] = useState<File | null>(null);

  // Active Page State
  const [activePageIndex, setActivePageIndex] = useState(0);

  // Sidebar Mobile State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
        setSignatures([]); // Reset signatures
        setActivePageIndex(0);
        
        // Reset History
        setHistory([INITIAL_TABLE_DATA]);
        setHistoryIndex(0);
        
        // Close sidebar on mobile to show preview
        setIsSidebarOpen(false);
      } catch (error) {
        console.error("File read error", error);
        setStatus('error');
      }
    }
  };

  const handleDownload = async () => {
    if (!fileData) return;
    if (!placement && signatures.length === 0) return;
    
    setStatus('processing');
    try {
      const newPdfBytes = await insertTableIntoPDF(fileData, tableData, placement, signatures);
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

  // --- Signature Logic ---
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Always open processor modal for signatures, even PNGs, to allow background removal
      setSignatureFileToProcess(file);
      e.target.value = '';
    }
  };

  const addSignature = (dataUrl: string) => {
     // Default placement: Active Page, center-ish
     setSignatures(prev => [...prev, {
         id: Math.random().toString(36).substr(2, 9),
         dataUrl,
         x: 100,
         y: 100, 
         width: 150,
         height: 75,
         pageIndex: activePageIndex
     }]);
     setSignatureFileToProcess(null);
     
     // Close sidebar on mobile to allow dragging
     setIsSidebarOpen(false);
  };

  const updateSignature = (updated: SignatureData) => {
      setSignatures(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  const removeSignature = (id: string) => {
      setSignatures(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900">
      {/* Processor Modal */}
      {signatureFileToProcess && (
        <ImageProcessorModal 
          file={signatureFileToProcess} 
          onConfirm={addSignature} 
          onCancel={() => setSignatureFileToProcess(null)} 
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 z-20 shadow-sm relative">
        <div className="flex items-center space-x-3">
          {/* Mobile Menu Toggle */}
          <button 
            className="lg:hidden p-2 -ml-2 mr-1 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <Layout size={20} />
          </div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight truncate">PDF Table Placer</h1>
        </div>
        <div className="text-sm text-gray-500 hidden sm:block">
          v1.6.1
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div 
            className="absolute inset-0 bg-gray-900/50 z-20 lg:hidden backdrop-blur-sm transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar Configuration */}
        <aside 
          className={`
            absolute top-0 bottom-0 left-0 z-30 w-80 bg-white border-r border-gray-200 flex flex-col shadow-2xl 
            transition-transform duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:static lg:translate-x-0 lg:shadow-lg
          `}
        >
          {/* Mobile Close Header inside sidebar */}
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
            <span className="font-semibold text-gray-700">Tools</span>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 bg-white border border-gray-200 rounded-md text-gray-500 hover:text-gray-700"
            >
              <X size={18} />
            </button>
          </div>

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

            {/* Step 2: Edit Table */}
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
              
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 mb-2">
                <div className="flex items-start">
                   <MousePointer2 size={16} className="mt-0.5 mr-2 shrink-0" />
                   <p>Click PDF to place table. <br/>Drag to <b>select & merge</b>.</p>
                </div>
              </div>
            </section>

            {/* Step 3: Add Signature */}
            <section className={!file ? "opacity-50 pointer-events-none filter grayscale transition-all duration-300" : "transition-all duration-300"}>
               <div className="flex items-center mb-4 text-indigo-900">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold mr-2">3</div>
                  <h2 className="text-lg font-semibold">Add Signature</h2>
               </div>
               
               <div className="space-y-3">
                  <label className="flex items-center justify-center w-full px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
                      <PenTool className="mr-2 h-4 w-4 text-gray-500" />
                      Upload Signature Image
                      <input type="file" className="hidden" accept="image/*" onChange={handleSignatureUpload} />
                  </label>
                  
                  {signatures.length > 0 && (
                     <div className="bg-gray-50 p-2 rounded border border-gray-200 text-xs text-gray-600">
                        {signatures.length} signature(s) placed. Drag to move/resize on PDF.
                     </div>
                  )}
               </div>
            </section>

            {/* Step 4: Download */}
             <section className={!file || (!placement && signatures.length === 0) ? "opacity-50 pointer-events-none filter grayscale transition-all duration-300" : "transition-all duration-300"}>
               <div className="flex items-center mb-4 text-indigo-900">
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold mr-2">4</div>
                <h2 className="text-lg font-semibold">Generate</h2>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-4">
                 <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Target:</span>
                    <span className="font-mono font-bold text-gray-900">
                        {placement ? `Table & ${signatures.length} Sig` : `${signatures.length} Signatures`}
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
        <section className="flex-1 bg-gray-100/50 p-6 flex flex-col h-full overflow-hidden relative z-10">
            <PDFPreview 
              fileData={fileData} 
              onPlacementSelect={setPlacement}
              selectedPlacement={placement}
              tableData={tableData}
              onTableDataChange={handleTableDataChange}
              onDeleteTable={() => setPlacement(null)}
              signatures={signatures}
              onSignatureUpdate={updateSignature}
              onSignatureRemove={removeSignature}
              onActivePageChange={setActivePageIndex}
            />
        </section>

      </main>
    </div>
  );
};

export default App;
