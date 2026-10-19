import React from 'react';
import type { 
  VisualConfig, 
  DashboardTheme, 
  CrossFilter 
} from '../../types/dashboard';
import { VisualRenderer } from './VisualRenderer';
import { 
  Copy, 
  Trash2, 
  Sliders, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2,
  X 
} from 'lucide-react';

interface VisualCardProps {
  visual: VisualConfig;
  theme: DashboardTheme;
  processedData: {
    data: any[];
    kpiValue?: number | null;
    kpiLabel?: string;
    seriesKeys: string[];
  };
  isSelected: boolean;
  isEditMode: boolean;
  activeCrossFilter: CrossFilter | null;
  isPrinting?: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onResize: (newColSpan: number) => void;
  onMove: (direction: 'left' | 'right') => void;
  onCrossFilter: (field: string, value: string) => void;
  onClearCrossFilter: () => void;
}

export const VisualCard: React.FC<VisualCardProps> = ({
  visual,
  theme,
  processedData,
  isSelected,
  isEditMode,
  activeCrossFilter,
  isPrinting = false,
  onSelect,
  onDuplicate,
  onDelete,
  onResize,
  onMove,
  onCrossFilter,
  onClearCrossFilter
}) => {
  const { formatting, colSpan, height = 320 } = visual;

  // Responsive Tailwind col-span class
  const colSpanClass = {
    3: 'col-span-12 sm:col-span-6 lg:col-span-3',
    4: 'col-span-12 sm:col-span-6 lg:col-span-4',
    6: 'col-span-12 lg:col-span-6',
    8: 'col-span-12 lg:col-span-8',
    12: 'col-span-12'
  }[colSpan] || 'col-span-12 lg:col-span-6';

  const cardBg = formatting.cardBg || theme.cardBg;
  const cardBorder = formatting.cardBorder || theme.cardBorder;
  const borderRadius = formatting.borderRadius || theme.borderRadius;

  const hasFilterFromThis = activeCrossFilter && activeCrossFilter.visualId === visual.id;

  return (
    <div 
      onClick={onSelect}
      className={`visual-card-wrapper relative group transition-all duration-200 flex flex-col ${colSpanClass} ${borderRadius} ${
        isEditMode && isSelected 
          ? 'ring-2 ring-brand dark:ring-brand-light shadow-xl z-10 print:ring-0 print:shadow-none' 
          : 'hover:shadow-md print:shadow-none'
      } print:break-inside-avoid print:page-break-inside-avoid print:border print:border-gray-200 print:bg-white`}
      style={{
        backgroundColor: cardBg,
        borderColor: isSelected && isEditMode ? undefined : cardBorder,
        borderWidth: '1px',
        borderStyle: 'solid',
        minHeight: `${height}px`
      }}
    >
      {/* Visual Header */}
      <div className="flex items-start justify-between p-4 pb-2 border-b border-transparent">
        <div className={`flex-1 ${formatting.titleAlign === 'center' ? 'text-center' : formatting.titleAlign === 'right' ? 'text-right' : 'text-left'}`}>
          <div className="flex items-center gap-2">
            <h3 
              className="text-sm font-bold tracking-tight truncate"
              style={{ color: formatting.titleColor || theme.textColor }}
            >
              {formatting.title || visual.title}
            </h3>
            {hasFilterFromThis && (
              <span 
                onClick={(e) => {
                  e.stopPropagation();
                  onClearCrossFilter();
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-full cursor-pointer hover:bg-amber-500/25 transition-colors"
                title="Click to clear cross-filter"
              >
                Filtered: {activeCrossFilter.value}
                <X className="w-2.5 h-2.5" />
              </span>
            )}
          </div>
          {formatting.subtitle && (
            <p className="text-[11px] mt-0.5 truncate" style={{ color: theme.subtextColor }}>
              {formatting.subtitle}
            </p>
          )}
        </div>

        {/* Action Controls in Edit Mode */}
        {isEditMode && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0 print:hidden">
            {/* Move Left / Right */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMove('left');
              }}
              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Move backward"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMove('right');
              }}
              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Move forward"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Resize widths */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 rounded p-0.5 text-[10px] font-bold text-slate-500">
              {[3, 4, 6, 8, 12].map(cols => (
                <button
                  key={cols}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResize(cols);
                  }}
                  className={`px-1.5 py-0.5 rounded transition-colors ${
                    colSpan === cols 
                      ? 'bg-white dark:bg-slate-700 text-brand font-extrabold shadow-xs' 
                      : 'hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title={`Resize to ${cols}/12 columns`}
                >
                  {cols === 12 ? 'Full' : cols === 6 ? '1/2' : cols === 4 ? '1/3' : cols === 8 ? '2/3' : '1/4'}
                </button>
              ))}
            </div>

            {/* Duplicate */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="p-1 rounded text-slate-400 hover:text-brand hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Duplicate visual"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
              title="Remove visual"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Chart Body */}
      <div className="flex-1 w-full p-2 pt-0 min-h-[220px]">
        <VisualRenderer
          visual={visual}
          theme={theme}
          processedData={processedData}
          activeCrossFilter={activeCrossFilter}
          isPrinting={isPrinting}
          onCrossFilter={(field, value) => {
            if (activeCrossFilter && activeCrossFilter.field === field && activeCrossFilter.value === value) {
              onClearCrossFilter();
            } else {
              onCrossFilter(field, value);
            }
          }}
          isInteractive={true}
        />
      </div>
    </div>
  );
};
