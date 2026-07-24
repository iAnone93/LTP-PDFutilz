import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, GitCompare, Play, Trash2, AlignLeft } from 'lucide-react';
import ReactDiffViewer from 'react-diff-viewer-continued';

const JsonCompare: React.FC = () => {
  const [json1, setJson1] = useState('');
  const [json2, setJson2] = useState('');
  const [isComparing, setIsComparing] = useState(false);
  const [error1, setError1] = useState<string | null>(null);
  const [error2, setError2] = useState<string | null>(null);

  const formatJson = (jsonString: string, setError: (err: string | null) => void): string => {
    try {
      if (!jsonString.trim()) return '';
      const parsed = JSON.parse(jsonString);
      setError(null);
      return JSON.stringify(parsed, null, 2);
    } catch (err: any) {
      setError('Invalid JSON');
      return jsonString;
    }
  };

  const handleFormat1 = () => {
    setJson1(formatJson(json1, setError1));
  };

  const handleFormat2 = () => {
    setJson2(formatJson(json2, setError2));
  };

  const handleCompare = () => {
    handleFormat1();
    handleFormat2();
    setIsComparing(true);
  };

  const handleClear = () => {
    setJson1('');
    setJson2('');
    setIsComparing(false);
    setError1(null);
    setError2(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 -ml-2 mr-1 text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <div className="bg-rose-600 p-2 rounded-lg text-white">
            <GitCompare size={20} />
          </div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">JSON Compare</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleClear}
            disabled={!json1 && !json2}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Trash2 size={16} />
            Clear
          </button>
          {!isComparing ? (
            <button 
              onClick={handleCompare}
              disabled={!json1.trim() || !json2.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
            >
              <Play size={16} />
              Compare
            </button>
          ) : (
            <button 
              onClick={() => setIsComparing(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 shadow-sm transition-all"
            >
              Edit JSONs
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-6 gap-6">
        {!isComparing ? (
          <>
            {/* Left JSON */}
            <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-semibold text-gray-700">Original JSON</h3>
                <button 
                  onClick={handleFormat1}
                  disabled={!json1.trim()}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  <AlignLeft size={14} />
                  Format
                </button>
              </div>
              <div className="flex-1 relative">
                <textarea
                  value={json1}
                  onChange={(e) => {
                    setJson1(e.target.value);
                    if (error1) setError1(null);
                  }}
                  placeholder="Paste original JSON here..."
                  className={`w-full h-full p-4 font-mono text-sm resize-none outline-none focus:ring-2 focus:ring-inset ${error1 ? 'ring-2 ring-inset ring-red-500 bg-red-50/30' : 'focus:ring-rose-500'}`}
                  spellCheck="false"
                />
                {error1 && (
                  <div className="absolute bottom-4 right-4 bg-red-100 text-red-700 px-3 py-1.5 rounded text-sm font-medium shadow-sm">
                    {error1}
                  </div>
                )}
              </div>
            </div>

            {/* Middle Action */}
            <div className="flex items-center justify-center">
              <button 
                onClick={handleCompare}
                disabled={!json1.trim() || !json2.trim()}
                className="p-4 bg-rose-100 text-rose-600 rounded-full hover:bg-rose-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shadow-sm"
                title="Compare JSON"
              >
                <GitCompare size={24} />
              </button>
            </div>

            {/* Right JSON */}
            <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-semibold text-gray-700">Modified JSON</h3>
                <button 
                  onClick={handleFormat2}
                  disabled={!json2.trim()}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  <AlignLeft size={14} />
                  Format
                </button>
              </div>
              <div className="flex-1 relative">
                <textarea
                  value={json2}
                  onChange={(e) => {
                    setJson2(e.target.value);
                    if (error2) setError2(null);
                  }}
                  placeholder="Paste modified JSON here..."
                  className={`w-full h-full p-4 font-mono text-sm resize-none outline-none focus:ring-2 focus:ring-inset ${error2 ? 'ring-2 ring-inset ring-red-500 bg-red-50/30' : 'focus:ring-rose-500'}`}
                  spellCheck="false"
                />
                {error2 && (
                  <div className="absolute bottom-4 right-4 bg-red-100 text-red-700 px-3 py-1.5 rounded text-sm font-medium shadow-sm">
                    {error2}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-auto">
            <ReactDiffViewer 
              oldValue={json1} 
              newValue={json2} 
              splitView={true} 
              useDarkTheme={false}
              leftTitle="Original JSON"
              rightTitle="Modified JSON"
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default JsonCompare;
