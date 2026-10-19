import React, { useState } from 'react';
import type { 
  VisualConfig, 
  AggregationType 
} from '../../types/dashboard';
import { 
  Hash, 
  Calendar, 
  Type, 
  Search, 
  Database, 
  ChevronDown, 
  Sparkles, 
  Layers,
  ArrowUpDown,
  ChevronRight
} from 'lucide-react';

interface FieldsPanelProps {
  datasets: { id: number; filename: string; original_filename?: string }[];
  selectedDatasetId: number | null;
  onSelectDataset: (id: number) => void;
  columns: string[];
  columnTypes: Record<string, 'numeric' | 'categorical' | 'date'>;
  selectedVisual: VisualConfig | null;
  onUpdateVisualConfig: (updates: Partial<VisualConfig>) => void;
  onToggleCollapse?: () => void;
}

export const FieldsPanel: React.FC<FieldsPanelProps> = ({
  datasets,
  selectedDatasetId,
  onSelectDataset,
  columns,
  columnTypes,
  selectedVisual,
  onUpdateVisualConfig,
  onToggleCollapse
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredColumns = columns.filter(col => 
    col.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const numericCols = columns.filter(c => columnTypes[c] === 'numeric');
  const categoricalCols = columns.filter(c => columnTypes[c] === 'categorical' || columnTypes[c] === 'date');

  return (
    <div className="space-y-4">
      {/* Dataset Selector */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
          Dataset Source
        </label>
        <div className="relative">
          <Database className="w-4 h-4 text-brand absolute left-3 top-2.5 pointer-events-none" />
          <select
            value={selectedDatasetId ?? ''}
            onChange={(e) => onSelectDataset(Number(e.target.value))}
            className="w-full pl-9 pr-8 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand appearance-none"
          >
            {datasets.map(ds => (
              <option key={ds.id} value={ds.id}>
                {ds.original_filename || ds.filename}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* Visual Configuration Wells (Active when a visual is selected) */}
      {selectedVisual ? (
        <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Layers className="w-3.5 h-3.5 text-brand" />
            <span>Field Bindings</span>
          </div>

          {/* X-Axis / Category Field */}
          {selectedVisual.type !== 'kpi' && (
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                X-Axis / Category
              </label>
              <select
                value={selectedVisual.xField}
                onChange={(e) => onUpdateVisualConfig({ xField: e.target.value })}
                className="w-full py-1.5 px-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand"
              >
                {columns.map(col => (
                  <option key={col} value={col}>
                    {columnTypes[col] === 'numeric' ? '∑ ' : columnTypes[col] === 'date' ? '📅 ' : '🔤 '}
                    {col}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Y-Axis / Metric Field */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Y-Axis / Metric Value
            </label>
            <select
              value={selectedVisual.yField}
              onChange={(e) => onUpdateVisualConfig({ yField: e.target.value })}
              className="w-full py-1.5 px-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand"
            >
              {columns.map(col => (
                <option key={col} value={col}>
                  {columnTypes[col] === 'numeric' ? '∑ ' : '🔤 '}
                  {col}
                </option>
              ))}
            </select>
          </div>

          {/* Grouping / Legend Field (For multi-series) */}
          {['bar', 'line', 'area', 'scatter'].includes(selectedVisual.type) && (
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Legend / Series (Optional)
              </label>
              <select
                value={selectedVisual.groupField ?? ''}
                onChange={(e) => onUpdateVisualConfig({ groupField: e.target.value || null })}
                className="w-full py-1.5 px-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="">None (Single Series)</option>
                {categoricalCols.map(col => (
                  <option key={col} value={col}>
                    🔤 {col}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Aggregation */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Aggregation
              </label>
              <select
                value={selectedVisual.aggregation}
                onChange={(e) => onUpdateVisualConfig({ aggregation: e.target.value as AggregationType })}
                className="w-full py-1.5 px-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand font-semibold capitalize"
              >
                <option value="sum">Sum (∑)</option>
                <option value="avg">Average (Mean)</option>
                <option value="count">Count (Total)</option>
                <option value="min">Minimum</option>
                <option value="max">Maximum</option>
              </select>
            </div>

            {/* Top N Categories */}
            {selectedVisual.type !== 'kpi' && (
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Top N Limit
                </label>
                <select
                  value={selectedVisual.topN ?? 'all'}
                  onChange={(e) => onUpdateVisualConfig({ topN: e.target.value === 'all' ? null : Number(e.target.value) })}
                  className="w-full py-1.5 px-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="all">All Values</option>
                  <option value="5">Top 5</option>
                  <option value="10">Top 10</option>
                  <option value="15">Top 15</option>
                </select>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
          Select a chart on canvas to configure fields & aggregations.
        </div>
      )}

      {/* Dataset Fields List */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Fields ({columns.length})
          </h4>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search fields..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        {/* Column items */}
        <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
          {filteredColumns.map(col => {
            const type = columnTypes[col] || 'categorical';
            const isNumeric = type === 'numeric';
            const isDate = type === 'date';

            return (
              <div
                key={col}
                onClick={() => {
                  if (selectedVisual) {
                    if (isNumeric) {
                      onUpdateVisualConfig({ yField: col });
                    } else {
                      onUpdateVisualConfig({ xField: col });
                    }
                  }
                }}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  selectedVisual && (selectedVisual.xField === col || selectedVisual.yField === col || selectedVisual.groupField === col)
                    ? 'bg-brand/10 dark:bg-brand/20 text-brand font-bold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
                title={`Click to bind to selected chart`}
              >
                <div className="flex items-center gap-2 truncate">
                  {isNumeric ? (
                    <span className="text-brand font-black text-xs shrink-0">∑</span>
                  ) : isDate ? (
                    <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  ) : (
                    <Type className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  )}
                  <span className="truncate">{col}</span>
                </div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold shrink-0">
                  {type}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
