
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import PdfTablePlacer from './pages/PdfTablePlacer';
import JsonFormatter from './pages/JsonFormatter';
import JsonSchemaBuilder from './pages/JsonSchemaBuilder';
import DocumentConverter from './pages/DocumentConverter';
import JsonCompare from './pages/JsonCompare';
import PdfMerge from './pages/PdfMerge';

const App: React.FC = () => {
  const baseUrl = (import.meta as any).env?.BASE_URL || '/';
  return (
    <Router basename={baseUrl}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pdf-table-placer" element={<PdfTablePlacer />} />
        <Route path="/pdf-merge" element={<PdfMerge />} />
        <Route path="/json-formatter" element={<JsonFormatter />} />
        <Route path="/json-schema-builder" element={<JsonSchemaBuilder />} />
        <Route path="/document-converter" element={<DocumentConverter />} />
        <Route path="/json-compare" element={<JsonCompare />} />
      </Routes>
    </Router>
  );
};

export default App;

