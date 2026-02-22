import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Code, FileJson, FileOutput, Wrench, ArrowRight } from 'lucide-react';

const tools = [
  {
    id: 'pdf-table-placer',
    name: 'PDF Table Placer',
    description: 'Visually place and insert tables or signatures into existing PDF documents.',
    icon: <FileText className="w-8 h-8 text-indigo-500" />,
    path: '/pdf-table-placer',
    color: 'bg-indigo-50 border-indigo-100 hover:border-indigo-300',
    available: true
  },
  {
    id: 'json-formatter',
    name: 'JSON Formatter',
    description: 'Format, validate, and beautify your JSON data with syntax highlighting.',
    icon: <Code className="w-8 h-8 text-emerald-500" />,
    path: '/json-formatter',
    color: 'bg-emerald-50 border-emerald-100 hover:border-emerald-300',
    available: true
  },
  {
    id: 'json-schema-builder',
    name: 'JSON Schema Builder',
    description: 'Visually build and generate JSON schemas for your API testing.',
    icon: <FileJson className="w-8 h-8 text-blue-500" />,
    path: '/json-schema-builder',
    color: 'bg-blue-50 border-blue-100 hover:border-blue-300',
    available: true
  },
  {
    id: 'document-converter',
    name: 'Document Converter',
    description: 'Convert between PDF, Word, Excel, and other document formats.',
    icon: <FileOutput className="w-8 h-8 text-orange-500" />,
    path: '/document-converter',
    color: 'bg-orange-50 border-orange-100 hover:border-orange-300',
    available: true
  },
  {
    id: 'more-tools',
    name: 'More Tools Coming Soon',
    description: 'We are constantly adding new tools to help with your automation testing.',
    icon: <Wrench className="w-8 h-8 text-gray-400" />,
    path: '#',
    color: 'bg-gray-50 border-gray-200',
    available: false
  }
];

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <Wrench size={20} />
          </div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">QA's Toolkit</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
            Essential Tools for Smooth Work!
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            A collection of utilities designed to streamline your workflows way more smoother.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            tool.available ? (
              <Link 
                key={tool.id} 
                to={tool.path}
                className={`flex flex-col p-6 rounded-2xl border-2 transition-all duration-200 group ${tool.color}`}
              >
                <div className="mb-4 bg-white w-16 h-16 rounded-xl shadow-sm flex items-center justify-center">
                  {tool.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                  {tool.name}
                </h3>
                <p className="text-gray-600 flex-1">
                  {tool.description}
                </p>
                <div className="mt-6 flex items-center text-sm font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Open Tool <ArrowRight size={16} className="ml-1" />
                </div>
              </Link>
            ) : (
              <div 
                key={tool.id} 
                className={`flex flex-col p-6 rounded-2xl border-2 border-dashed ${tool.color} opacity-70`}
              >
                <div className="mb-4 bg-white w-16 h-16 rounded-xl shadow-sm flex items-center justify-center opacity-50">
                  {tool.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-500 mb-2">
                  {tool.name}
                </h3>
                <p className="text-gray-500 flex-1">
                  {tool.description}
                </p>
              </div>
            )
          ))}
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
