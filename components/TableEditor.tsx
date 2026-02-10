import React from 'react';
import { TableData } from '../types';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface TableEditorProps {
  data: TableData;
  onChange: (data: TableData) => void;
}

const TableEditor: React.FC<TableEditorProps> = ({ data, onChange }) => {
  
  const updateHeader = (index: number, value: string) => {
    const newHeaders = [...data.headers];
    newHeaders[index] = value;
    onChange({ ...data, headers: newHeaders });
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = [...data.rows];
    newRows[rowIndex][colIndex] = value;
    onChange({ ...data, rows: newRows });
  };

  const addRow = () => {
    const newRow = new Array(data.headers.length).fill('');
    const newRowHeights = [...data.rowHeights, 30];
    onChange({ ...data, rows: [...data.rows, newRow], rowHeights: newRowHeights });
  };

  const removeRow = (index: number) => {
    const newRows = data.rows.filter((_, i) => i !== index);
    // Index 0 of rowHeights is header, so row index i corresponds to i+1
    const newRowHeights = data.rowHeights.filter((_, i) => i !== index + 1);
    onChange({ ...data, rows: newRows, rowHeights: newRowHeights });
  };

  const addColumn = () => {
    const newHeaders = [...data.headers, `Col ${data.headers.length + 1}`];
    const newRows = data.rows.map(row => [...row, '']);
    const newColumnWidths = [...data.columnWidths, 100];
    onChange({ 
      ...data, 
      headers: newHeaders, 
      rows: newRows, 
      columnWidths: newColumnWidths 
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Table Content</h3>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-10 px-3 py-3"></th>
              {data.headers.map((header, i) => (
                <th key={i} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="text"
                    value={header}
                    onChange={(e) => updateHeader(i, e.target.value)}
                    className="w-full bg-transparent border-none focus:ring-0 p-1 font-bold text-gray-700"
                    placeholder="Header"
                  />
                </th>
              ))}
              <th className="w-10 px-3 py-3">
                 <button onClick={addColumn} className="text-blue-600 hover:text-blue-800" title="Add Column">
                   <Plus size={16} />
                 </button>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                 <td className="px-3 py-4 whitespace-nowrap text-center text-gray-400">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs">{rowIndex + 1}</span>
                    </div>
                 </td>
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="px-3 py-2 whitespace-nowrap">
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-1.5 border"
                    />
                  </td>
                ))}
                 <td className="px-3 py-2 whitespace-nowrap text-center">
                   <button 
                    onClick={() => removeRow(rowIndex)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                   >
                     <Trash2 size={16} />
                   </button>
                 </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <button
        onClick={addRow}
        className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 border border-transparent rounded-md hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <Plus size={16} className="mr-2" /> Add Row
      </button>
    </div>
  );
};

export default TableEditor;