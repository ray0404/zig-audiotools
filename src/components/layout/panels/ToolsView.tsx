import React from 'react';
import { BatchProcessMenu } from './BatchProcessMenu';

export const ToolsView: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200 p-4">
      <h2 className="text-lg font-bold tracking-tight uppercase mb-4">Smart Processing</h2>
      <BatchProcessMenu />
    </div>
  );
};
