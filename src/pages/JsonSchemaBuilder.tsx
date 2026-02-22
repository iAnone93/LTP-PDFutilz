import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileJson, Upload, Play, Copy, Check, Trash2, FileCode, Wand2, AlignLeft } from 'lucide-react';
import { jsonrepair } from 'jsonrepair';

const JsonSchemaBuilder: React.FC = () => {
  const [jsonInput, setJsonInput] = useState<string>('');
  const [schemaOutput, setSchemaOutput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [canFix, setCanFix] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateJson = (input: string) => {
    if (!input.trim()) {
      setError(null);
      setCanFix(false);
      return;
    }
    try {
      JSON.parse(input);
      setError(null);
      setCanFix(false);
    } catch (err: any) {
      setError(err.message);
      setCanFix(true);
    }
  };

  const handleFixJson = () => {
    try {
      const fixed = jsonrepair(jsonInput);
      setJsonInput(fixed);
      validateJson(fixed);
    } catch (err) {
      // If jsonrepair fails, fallback to basic balancing
      let fixed = jsonInput.trim();
      fixed = fixed.replace(/,\s*([}\]])/g, '$1');
      const stack: string[] = [];
      let inString = false;
      let escaped = false;

      for (let i = 0; i < fixed.length; i++) {
        const char = fixed[i];
        if (char === '"' && !escaped) inString = !inString;
        if (!inString) {
          if (char === '{') stack.push('}');
          else if (char === '[') stack.push(']');
          else if (char === '}' || char === ']') {
            if (stack.length > 0 && stack[stack.length - 1] === char) stack.pop();
          }
        }
        if (char === '\\') escaped = !escaped;
        else escaped = false;
      }
      while (stack.length > 0) fixed += stack.pop();
      setJsonInput(fixed);
      validateJson(fixed);
    }
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonInput(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch (err: any) {
      setError('Cannot format invalid JSON. Try "Autofix" first.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonInput(content);
      validateJson(content);
    };
    reader.readAsText(file);
  };

  const generateSchema = (obj: any): any => {
    if (obj === null) return { type: 'null' };
    
    if (Array.isArray(obj)) {
      const items = obj.length > 0 ? generateSchema(obj[0]) : {};
      return {
        type: 'array',
        items
      };
    }

    const type = typeof obj;

    if (type === 'object') {
      const properties: any = {};
      const required: string[] = [];
      Object.keys(obj).forEach(key => {
        properties[key] = generateSchema(obj[key]);
        required.push(key);
      });
      return {
        type: 'object',
        properties,
        required
      };
    }

    if (type === 'number') {
      return { type: Number.isInteger(obj) ? 'integer' : 'number' };
    }

    return { type };
  };

  const handleAnalyze = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const schema = {
        $schema: "http://json-schema.org/draft-07/schema#",
        title: "Generated Schema",
        ...generateSchema(parsed)
      };
      setSchemaOutput(JSON.stringify(schema, null, 2));
      setError(null);
    } catch (err) {
      setError('Invalid JSON format. Please check your input.');
      setSchemaOutput('');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(schemaOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setJsonInput('');
    setSchemaOutput('');
    setError(null);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 z-20 shadow-sm relative">
        <div className="flex items-center space-x-3">
          <Link to="/" className="p-2 -ml-2 mr-1 text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <FileJson size={20} />
          </div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">JSON Schema Builder</h1>
        </div>
        <div className="flex items-center gap-3">
           <button 
            onClick={handleClear}
            disabled={!jsonInput && !schemaOutput}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Trash2 size={16} />
            Clear
          </button>
          <button 
            onClick={handleAnalyze}
            disabled={!jsonInput.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
          >
            <Play size={16} />
            Analyze JSON
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* Input Section */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-2">
              <FileCode size={18} className="text-blue-600" />
              <h3 className="font-semibold text-gray-700">JSON Input</h3>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleFormatJson}
                disabled={!jsonInput.trim()}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                title="Format JSON"
              >
                <AlignLeft size={14} />
                Format
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
              >
                <Upload size={14} />
                Upload File
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".json" 
              className="hidden" 
            />
          </div>
          <div className="flex-1 relative">
            <textarea
              value={jsonInput}
              onChange={(e) => {
                const val = e.target.value;
                setJsonInput(val);
                validateJson(val);
              }}
              placeholder='Paste your JSON response body here or upload a file...'
              className={`w-full h-full p-6 font-mono text-sm resize-none focus:outline-none bg-transparent placeholder:text-gray-400 ${error ? 'text-red-900 bg-red-50/10' : ''}`}
            />
            {error && (
              <div className="absolute bottom-6 left-6 right-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">⚠️</div>
                  <p className="font-medium">{error}</p>
                </div>
                {canFix && (
                  <button 
                    onClick={handleFixJson}
                    className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm text-xs font-bold"
                  >
                    <Wand2 size={14} />
                    Autofix
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Output Section */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-2">
              <FileJson size={18} className="text-blue-600" />
              <h3 className="font-semibold text-gray-700">Generated Schema</h3>
            </div>
            {schemaOutput && (
              <button 
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy Schema'}
              </button>
            )}
          </div>
          <div className="flex-1 bg-gray-900 p-6 overflow-auto">
            {schemaOutput ? (
              <pre className="text-blue-300 font-mono text-sm whitespace-pre-wrap">
                {schemaOutput}
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
                <div className="p-4 bg-gray-800 rounded-full">
                  <FileJson size={32} className="opacity-20" />
                </div>
                <p className="text-sm">Generated schema will appear here after analysis.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default JsonSchemaBuilder;
