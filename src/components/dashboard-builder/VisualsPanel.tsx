import React from 'react';
import type { ChartType } from '../../types/dashboard';
import { 
  BarChart3, 
  BarChartHorizontal,
  LineChart as LineIcon, 
  AreaChart as AreaIcon, 
  PieChart as PieIcon, 
  CircleDot, 
  ScatterChart as ScatterIcon, 
  Table as TableIcon, 
  TrendingUp,
  Plus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface VisualsPanelProps {
  selectedType: ChartType | null;
  onAddVisual: (type: ChartType) => void;
  onChangeSelectedType: (type: ChartType) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const VISUAL_TYPES: { type: ChartType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: 'bar', label: 'Bar', icon: BarChart3 },
  { type: 'horizontal_bar', label: 'H-Bar', icon: BarChartHorizontal },
  { type: 'line', label: 'Line', icon: LineIcon },
  { type: 'area', label: 'Area', icon: AreaIcon },
  { type: 'pie', label: 'Pie', icon: PieIcon },
  { type: 'donut', label: 'Donut', icon: CircleDot },
  { type: 'scatter', label: 'Scatter', icon: ScatterIcon },
  { type: 'table', label: 'Table', icon: TableIcon },
  { type: 'kpi', label: 'KPI', icon: TrendingUp },
];

export const VisualsPanel: React.FC<VisualsPanelProps> = ({
  selectedType,
  onAddVisual,
  onChangeSelectedType,
  isCollapsed = false,
  onToggleCollapse
}) => {
  if (isCollapsed) {
    return (
      <div 
        onClick={onToggleCollapse}
        className="w-10 bg-white border-r border-gray-200 flex flex-col items-center py-4 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm select-none"
        title="Expand Visualizations Panel"
      >
        <div className="flex flex-col items-center gap-2">
          <BarChart3 className="w-4 h-4 text-gray-500" />
          <span 
            className="text-xs font-semibold text-gray-600 tracking-wider uppercase"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Visuals
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-56 bg-white border-r border-gray-200 flex flex-col h-full shadow-sm text-gray-800 text-sm select-none">
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-gray-200 flex items-center justify-between bg-gray-50/80">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-gray-900 text-xs">Visualizations</h3>
        </div>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200/60"
            title="Collapse Visualizations"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-3 space-y-3 flex-1 overflow-y-auto">
        <p className="text-[11px] text-gray-500 leading-tight">
          {selectedType ? 'Click any icon to change selected chart type' : 'Click an icon to add a new chart to canvas'}
        </p>

        <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100/70 rounded-xl border border-gray-200">
          {VISUAL_TYPES.map(({ type, label, icon: Icon }) => {
            const isSelected = selectedType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  if (selectedType) {
                    onChangeSelectedType(type);
                  } else {
                    onAddVisual(type);
                  }
                }}
                className={`flex flex-col items-center justify-center p-2 rounded-lg text-xs font-medium transition-all group ${
                  isSelected
                    ? 'bg-white text-blue-600 shadow-sm ring-2 ring-blue-500 font-bold'
                    : 'text-gray-600 hover:bg-white/80 hover:text-gray-900'
                }`}
                title={label}
              >
                <Icon className={`w-4 h-4 mb-1 transition-transform group-hover:scale-110 ${
                  isSelected ? 'text-blue-600' : 'text-gray-500'
                }`} />
                <span className="text-[10px] leading-tight text-center truncate w-full">{label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onAddVisual('bar')}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Bar Chart
        </button>
      </div>
    </div>
  );
};
export default VisualsPanel;
