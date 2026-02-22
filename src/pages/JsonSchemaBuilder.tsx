import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileJson } from 'lucide-react';

const JsonSchemaBuilder: React.FC = () => {
  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 z-20 shadow-sm relative">
        <div className="flex items-center space-x-3">
          <Link to="/" className="p-2 -ml-2 mr-1 text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <FileJson size={20} />
          </div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight truncate">JSON Schema Builder</h1>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <FileJson className="w-16 h-16 text-blue-300 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">JSON Schema Builder</h2>
          <p className="text-gray-500">This tool is currently under construction.</p>
        </div>
      </main>
    </div>
  );
};

export default JsonSchemaBuilder;
