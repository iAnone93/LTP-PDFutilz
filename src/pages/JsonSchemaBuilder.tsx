import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileJson, Upload, Play, Copy, Check, Trash2, FileCode, Wand2, AlignLeft, Edit3, X, Save, Plus } from 'lucide-react';
import { jsonrepair } from 'jsonrepair';

interface SchemaFormNodeProps {
  path: string[];
  schema: any;
  onUpdate: (path: string[], value: any) => void;
  level?: number;
}

const SchemaPropertyInput: React.FC<{
  initialValue: any;
  onCommit: (val: any) => void;
}> = ({ initialValue, onCommit }) => {
  const [value, setValue] = useState(
    typeof initialValue === 'object' ? JSON.stringify(initialValue) : String(initialValue)
  );

  useEffect(() => {
    setValue(typeof initialValue === 'object' ? JSON.stringify(initialValue) : String(initialValue));
  }, [initialValue]);

  const handleCommit = () => {
    let newVal: any = value;
    try {
      newVal = JSON.parse(value);
    } catch (e) {
      // Keep as string
    }
    onCommit(newVal);
  };

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleCommit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleCommit();
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="flex-1 px-2 py-1 bg-white border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
    />
  );
};

const SchemaFormNode: React.FC<SchemaFormNodeProps> = ({ path, schema, onUpdate, level = 0 }) => {
  const [isAdding, setIsAdding] = React.useState(false);
  const [newKey, setNewKey] = React.useState('');
  const [newValue, setNewValue] = React.useState('');

  const [isAddingToAll, setIsAddingToAll] = React.useState(false);
  const [newAllKey, setNewAllKey] = React.useState('');
  const [newAllValue, setNewAllValue] = React.useState('');

  if (!schema || typeof schema !== 'object') return null;

  const type = schema.type;
  const isObject = type === 'object';
  const isArray = type === 'array';

  const handleValueChange = (key: string, value: any) => {
    onUpdate([...path, key], value);
  };

  const handleAddValidation = () => {
    if (!newKey.trim()) return;
    
    let parsedValue: any = newValue;
    try {
      parsedValue = JSON.parse(newValue);
    } catch (e) {
      // Keep as string
    }
    
    onUpdate([...path, newKey.trim()], parsedValue);
    setNewKey('');
    setNewValue('');
    setIsAdding(false);
  };

  const handleAddValidationToAll = () => {
    if (!newAllKey.trim() || !schema.properties) return;
    
    let parsedValue: any = newAllValue;
    try {
      parsedValue = JSON.parse(newAllValue);
    } catch (e) {
      // Keep as string
    }
    
    const newProperties = { ...schema.properties };
    Object.keys(newProperties).forEach(propKey => {
      newProperties[propKey] = {
        ...newProperties[propKey],
        [newAllKey.trim()]: parsedValue
      };
    });
    
    onUpdate([...path, 'properties'], newProperties);
    setNewAllKey('');
    setNewAllValue('');
    setIsAddingToAll(false);
  };

  const removeKey = (key: string) => {
    const newSchema = { ...schema };
    delete newSchema[key];
    onUpdate(path, newSchema);
  };

  return (
    <div className={`space-y-3 ${level > 0 ? 'ml-6 pl-4 border-l border-gray-200' : ''}`}>
      <div className="flex items-center justify-between group">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
            {path[path.length - 1] || 'Root'}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-mono">
            {type || 'any'}
          </span>
        </div>
        {!isAdding ? (
          <button 
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded transition-all"
          >
            <Plus size={10} />
            Add Validation
          </button>
        ) : (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
            <input 
              autoFocus
              placeholder="Key"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="w-20 px-2 py-1 text-[10px] border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <input 
              placeholder="Value"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="w-24 px-2 py-1 text-[10px] border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <button 
              type="button"
              onClick={handleAddValidation}
              className="p-1 text-green-600 hover:bg-green-50 rounded"
            >
              <Check size={12} />
            </button>
            <button 
              type="button"
              onClick={() => setIsAdding(false)}
              className="p-1 text-gray-400 hover:bg-gray-50 rounded"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Basic Fields */}
      <div className="grid grid-cols-1 gap-2">
        {Object.entries(schema).map(([key, value]) => {
          if (key === 'properties' || key === 'items' || key === 'type' || key === '$schema') return null;
          
          return (
            <div key={key} className="flex items-center gap-2 text-sm">
              <label className="w-24 shrink-0 text-gray-500 font-mono text-xs">{key}:</label>
              <SchemaPropertyInput 
                initialValue={value}
                onCommit={(newVal) => handleValueChange(key, newVal)}
              />
              <button onClick={() => removeKey(key)} className="text-gray-300 hover:text-red-500 transition-colors">
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Recursive Parts */}
      {isObject && schema.properties && (
        <div className="space-y-4 mt-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Properties</p>
            {!isAddingToAll ? (
              <button 
                type="button"
                onClick={() => setIsAddingToAll(true)}
                className="flex items-center gap-1 text-[10px] font-bold text-purple-600 hover:text-purple-700 bg-purple-50 px-2 py-1 rounded transition-all"
              >
                <Plus size={10} />
                Add to All Properties
              </button>
            ) : (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                <input 
                  autoFocus
                  placeholder="Key"
                  value={newAllKey}
                  onChange={(e) => setNewAllKey(e.target.value)}
                  className="w-20 px-2 py-1 text-[10px] border border-gray-200 rounded focus:ring-1 focus:ring-purple-500 outline-none"
                />
                <input 
                  placeholder="Value"
                  value={newAllValue}
                  onChange={(e) => setNewAllValue(e.target.value)}
                  className="w-24 px-2 py-1 text-[10px] border border-gray-200 rounded focus:ring-1 focus:ring-purple-500 outline-none"
                />
                <button 
                  type="button"
                  onClick={handleAddValidationToAll}
                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                >
                  <Check size={12} />
                </button>
                <button 
                  type="button"
                  onClick={() => setIsAddingToAll(false)}
                  className="p-1 text-gray-400 hover:bg-gray-50 rounded"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
          {Object.entries(schema.properties).map(([propName, propSchema]) => (
            <SchemaFormNode 
              key={propName}
              path={[...path, 'properties', propName]}
              schema={propSchema}
              onUpdate={onUpdate}
              level={level + 1}
            />
          ))}
        </div>
      )}

      {isArray && schema.items && (
        <div className="mt-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Items</p>
          <SchemaFormNode 
            path={[...path, 'items']}
            schema={schema.items}
            onUpdate={onUpdate}
            level={level + 1}
          />
        </div>
      )}
    </div>
  );
};

const JsonSchemaBuilder: React.FC = () => {
  const [jsonInput, setJsonInput] = useState<string>('');
  const [schemaOutput, setSchemaOutput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [canFix, setCanFix] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editableSchema, setEditableSchema] = useState('');
  const [editMode, setEditMode] = useState<'code' | 'form'>('code');
  const [editError, setEditError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalTextareaRef = useRef<HTMLTextAreaElement>(null);

  const validateEditableSchema = (input: string) => {
    try {
      if (!input.trim()) {
        setEditError(null);
        return;
      }
      JSON.parse(input);
      setEditError(null);
    } catch (err: any) {
      setEditError(err.message);
    }
  };

  const schemaSuggestions = [
    { label: 'String with format', value: '"format": "email"' },
    { label: 'Number with range', value: '"minimum": 0, "maximum": 100' },
    { label: 'Enum values', value: '"enum": ["value1", "value2"]' },
    { label: 'Pattern (Regex)', value: '"pattern": "^[a-zA-Z0-9]+$"' },
    { label: 'Date-Time format', value: '"format": "date-time"' },
    { label: 'Unique Items', value: '"uniqueItems": true' },
  ];

  const applySuggestion = (val: string) => {
    const textarea = modalTextareaRef.current;
    if (!textarea) {
      // Fallback if ref is not available
      setEditableSchema(prev => {
        const trimmed = prev.trim();
        if (trimmed.endsWith('}')) {
          return prev.replace(/}\s*$/, `,  ${val}\n}`);
        }
        return prev + `\n  ${val}`;
      });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end);

    const newText = before + val + after;
    setEditableSchema(newText);
    validateEditableSchema(newText);

    // Set cursor after the inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + val.length, start + val.length);
    }, 0);
  };

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

  const openEditModal = () => {
    setEditableSchema(schemaOutput);
    setEditError(null);
    setEditMode('code');
    setIsEditModalOpen(true);
  };

  const updateSchemaFromForm = (newSchema: any) => {
    const json = JSON.stringify(newSchema, null, 2);
    setEditableSchema(json);
    validateEditableSchema(json);
  };


  const handleFormUpdate = (path: string[], value: any) => {
    try {
      const newSchema = JSON.parse(editableSchema);
      
      if (path.length === 0) {
        updateSchemaFromForm(value);
        return;
      }

      let target = newSchema;
      for (let i = 0; i < path.length - 1; i++) {
        target = target[path[i]];
      }
      
      const key = path[path.length - 1];
      target[key] = value;

      // Auto-add properties when 'required' is updated
      if (key === 'required' && Array.isArray(value)) {
        if (!target.properties) {
          target.properties = {};
        }
        
        value.forEach((reqField: any) => {
          if (typeof reqField === 'string' && !target.properties[reqField]) {
            // Add new property with default string type
            target.properties[reqField] = { type: 'string' };
          }
        });
      }

      updateSchemaFromForm(newSchema);
    } catch (e) {
      console.error('Failed to update schema from form', e);
    }
  };

  const saveEditedSchema = () => {
    try {
      JSON.parse(editableSchema);
      setSchemaOutput(editableSchema);
      setIsEditModalOpen(false);
    } catch (err: any) {
      setEditError('Invalid JSON Schema format.');
    }
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
          <div className="flex-1 relative group bg-gray-900">
            <div className="absolute inset-0 p-6 overflow-auto">
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
            {schemaOutput && (
              <div className="absolute bottom-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <button 
                  onClick={openEditModal}
                  className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg transition-all text-sm font-semibold"
                >
                  <Edit3 size={16} />
                  Edit JSON Schema
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Edit JSON Schema</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <button 
                      onClick={() => setEditMode('code')}
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded transition-all ${editMode === 'code' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      Code View
                    </button>
                    <button 
                      onClick={() => {
                        try {
                          JSON.parse(editableSchema);
                          setEditMode('form');
                          setEditError(null);
                        } catch(e) {
                          setEditError('Fix JSON errors before switching to Form View');
                        }
                      }}
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded transition-all ${editMode === 'form' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      Form View
                    </button>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 flex overflow-hidden bg-gray-900">
              {editMode === 'code' ? (
                <>
                  {/* Sidebar Suggestions */}
                  <div className="w-64 border-r border-gray-800 bg-gray-900/50 p-4 overflow-y-auto">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Quick Suggestions</h4>
                    <div className="space-y-2">
                      {schemaSuggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => applySuggestion(s.value)}
                          className="w-full text-left p-3 rounded-xl bg-gray-800/50 border border-gray-700 hover:border-blue-500 hover:bg-gray-800 transition-all group"
                        >
                          <p className="text-xs font-semibold text-gray-300 group-hover:text-blue-400">{s.label}</p>
                          <code className="text-[10px] text-gray-500 block mt-1 truncate">{s.value}</code>
                        </button>
                      ))}
                    </div>
                    <div className="mt-8 p-4 bg-blue-900/20 border border-blue-800/30 rounded-xl">
                      <p className="text-[10px] text-blue-300 leading-relaxed">
                        Tip: Click a suggestion to append it to your schema. You may need to manually fix commas.
                      </p>
                    </div>
                  </div>

                  {/* Editor */}
                  <div className="flex-1 relative">
                    <textarea
                      ref={modalTextareaRef}
                      value={editableSchema}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditableSchema(val);
                        validateEditableSchema(val);
                      }}
                      className={`w-full h-full p-6 font-mono text-sm text-blue-300 bg-transparent resize-none focus:outline-none ${editError ? 'bg-red-500/5' : ''}`}
                      spellCheck={false}
                    />
                    {editError && (
                      <div className="absolute bottom-6 left-6 right-6 p-3 bg-red-600/90 backdrop-blur-md text-white text-xs rounded-lg shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-2">
                        <span className="shrink-0">⚠️</span>
                        <span className="font-medium">{editError}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 bg-white overflow-auto p-8">
                  <div className="max-w-2xl mx-auto space-y-8">
                    <div className="pb-6 border-b border-gray-100">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Global Settings</h4>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <label className="w-24 text-sm font-medium text-gray-600">Title:</label>
                          <input 
                            type="text" 
                            value={JSON.parse(editableSchema).title || ''}
                            onChange={(e) => handleFormUpdate(['title'], e.target.value)}
                            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          />
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="w-24 text-sm font-medium text-gray-600">Schema:</label>
                          <input 
                            type="text" 
                            disabled
                            value={JSON.parse(editableSchema).$schema || ''}
                            className="flex-1 px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-400 cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Structure & Validations</h4>
                      <SchemaFormNode 
                        path={[]} 
                        schema={JSON.parse(editableSchema)} 
                        onUpdate={handleFormUpdate}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={saveEditedSchema}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-all text-sm font-bold"
              >
                <Save size={16} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JsonSchemaBuilder;
