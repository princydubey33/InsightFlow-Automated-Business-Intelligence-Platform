import React, { useState } from 'react';
import { 
  Palette, 
  Sliders, 
  Type, 
  Layers, 
  RotateCcw, 
  Check, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  DollarSign, 
  Eye, 
  EyeOff,
  ChevronRight,
  Sun,
  Moon,
  Sparkles
} from 'lucide-react';
import type { 
  VisualConfig, 
  DashboardTheme, 
  ThemePreset, 
  NumberFormatType 
} from '../../types/dashboard';
import { THEME_PRESETS, getDefaultTheme } from '../../utils/dashboardThemes';

interface FormatPanelProps {
  selectedVisual: VisualConfig | null;
  onUpdateVisual: (updated: VisualConfig) => void;
  theme: DashboardTheme;
  onUpdateTheme: (theme: DashboardTheme) => void;
  onResetTheme: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const FormatPanel: React.FC<FormatPanelProps> = ({
  selectedVisual,
  onUpdateVisual,
  theme,
  onUpdateTheme,
  onResetTheme,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'page'>(selectedVisual ? 'visual' : 'page');

  // Handle visual formatting update
  const updateFormatting = (partial: Partial<VisualConfig['formatting']>) => {
    if (!selectedVisual) return;
    const updated: VisualConfig = {
      ...selectedVisual,
      formatting: {
        ...selectedVisual.formatting,
        ...partial
      }
    };
    onUpdateVisual(updated);
  };

  // Handle theme preset selection
  const handleSelectThemePreset = (presetKey: ThemePreset) => {
    const preset = THEME_PRESETS[presetKey];
    if (preset) {
      onUpdateTheme(preset);
    }
  };

  if (isCollapsed) {
    return (
      <div 
        onClick={onToggleCollapse}
        className="w-10 bg-white border-l border-gray-200 flex flex-col items-center py-4 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm select-none"
        title="Expand Format Pane"
      >
        <div className="flex flex-col items-center gap-2">
          <Sliders className="w-4 h-4 text-gray-500" />
          <span 
            className="text-xs font-semibold text-gray-600 tracking-wider uppercase"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Format
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full shadow-sm text-gray-800 text-sm">
      {/* Pane Top Header */}
      <div className="px-4 py-2.5 border-b border-gray-200 flex items-center justify-between bg-gray-50/80">
        <div className="flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-purple-600" />
          <h3 className="font-semibold text-gray-900 text-xs">Format & Themes</h3>
        </div>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200/60"
            title="Collapse Format Panel"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabs Switcher: Visual vs Page */}
      <div className="flex border-b border-gray-200 bg-gray-100/60 p-1 gap-1">
        <button
          onClick={() => setActiveTab('visual')}
          disabled={!selectedVisual}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'visual'
              ? 'bg-white text-purple-700 shadow-sm font-semibold'
              : selectedVisual
              ? 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              : 'text-gray-300 cursor-not-allowed'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Visual
          {selectedVisual && <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />}
        </button>
        <button
          onClick={() => setActiveTab('page')}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'page'
              ? 'bg-white text-purple-700 shadow-sm font-semibold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          Page Theme
        </button>
      </div>

      {/* Tab 1: Visual Formatting */}
      {activeTab === 'visual' && selectedVisual && (
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
          {/* Header Info */}
          <div className="p-2.5 bg-purple-50/50 border border-purple-100 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-purple-900 capitalize">
                {selectedVisual.type.replace('_', ' ')} Chart
              </span>
              <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-mono font-bold">
                {selectedVisual.id}
              </span>
            </div>
            <p className="text-[11px] text-purple-600/80 mt-0.5">
              Targeted styling applied exclusively to this visual.
            </p>
          </div>

          {/* Title & Subtitle */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-700 text-[11px] uppercase tracking-wider flex items-center gap-1">
              <Type className="w-3 h-3 text-purple-600" />
              Title & Header
            </h4>
            <div>
              <label className="text-[10px] text-gray-500 font-medium block mb-1">Visual Title</label>
              <input
                type="text"
                value={selectedVisual.formatting.title}
                onChange={(e) => updateFormatting({ title: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-medium block mb-1">Subtitle</label>
              <input
                type="text"
                value={selectedVisual.formatting.subtitle || ''}
                placeholder="Optional description"
                onChange={(e) => updateFormatting({ subtitle: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-gray-500 font-medium">Title Alignment</label>
              <div className="flex border border-gray-200 rounded overflow-hidden">
                <button
                  type="button"
                  onClick={() => updateFormatting({ titleAlign: 'left' })}
                  className={`p-1.5 ${selectedVisual.formatting.titleAlign === 'left' ? 'bg-purple-100 text-purple-700' : 'bg-white hover:bg-gray-100'}`}
                  title="Align Left"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => updateFormatting({ titleAlign: 'center' })}
                  className={`p-1.5 ${selectedVisual.formatting.titleAlign === 'center' ? 'bg-purple-100 text-purple-700' : 'bg-white hover:bg-gray-100'}`}
                  title="Align Center"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => updateFormatting({ titleAlign: 'right' })}
                  className={`p-1.5 ${selectedVisual.formatting.titleAlign === 'right' ? 'bg-purple-100 text-purple-700' : 'bg-white hover:bg-gray-100'}`}
                  title="Align Right"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Number & Value Formatting */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-700 text-[11px] uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-purple-600" />
              Number Formatting
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-500 font-medium block mb-1">Display Format</label>
                <select
                  value={selectedVisual.formatting.numberFormat}
                  onChange={(e) => updateFormatting({ numberFormat: e.target.value as NumberFormatType })}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs bg-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="standard">Standard (1,234.56)</option>
                  <option value="currency">Currency ($ / ₹ / € / £)</option>
                  <option value="percentage">Percentage (%)</option>
                  <option value="compact">Compact (1.2K / 1.5M)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-medium block mb-1">Decimals</label>
                <select
                  value={selectedVisual.formatting.decimalPlaces}
                  onChange={(e) => updateFormatting({ decimalPlaces: parseInt(e.target.value) })}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs bg-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                >
                  <option value={0}>0 (e.g. 1,000)</option>
                  <option value={1}>1 (e.g. 1,000.5)</option>
                  <option value={2}>2 (e.g. 1,000.50)</option>
                  <option value={3}>3 (e.g. 1,000.500)</option>
                </select>
              </div>
            </div>

            {selectedVisual.formatting.numberFormat === 'currency' && (
              <div>
                <label className="text-[10px] text-gray-500 font-medium block mb-1">Currency Symbol</label>
                <div className="flex gap-2">
                  {(['$', '₹', '€', '£'] as const).map(sym => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => updateFormatting({ currencySymbol: sym })}
                      className={`flex-1 py-1 rounded border text-xs font-bold transition-colors ${
                        selectedVisual.formatting.currencySymbol === sym
                          ? 'border-purple-600 bg-purple-50 text-purple-700'
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <hr className="border-gray-200" />

          {/* Axes & Grid Lines */}
          {selectedVisual.type !== 'pie' && selectedVisual.type !== 'donut' && selectedVisual.type !== 'kpi' && selectedVisual.type !== 'table' && (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-700 text-[11px] uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3 h-3 text-purple-600" />
                Axes & Grid
              </h4>
              <div className="space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-gray-600">Show X-Axis</span>
                  <input
                    type="checkbox"
                    checked={selectedVisual.formatting.showXAxis}
                    onChange={(e) => updateFormatting({ showXAxis: e.target.checked })}
                    className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-gray-600">Show Y-Axis</span>
                  <input
                    type="checkbox"
                    checked={selectedVisual.formatting.showYAxis}
                    onChange={(e) => updateFormatting({ showYAxis: e.target.checked })}
                    className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-gray-600">Show Grid Lines</span>
                  <input
                    type="checkbox"
                    checked={selectedVisual.formatting.showGrid}
                    onChange={(e) => updateFormatting({ showGrid: e.target.checked })}
                    className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-gray-600">Show Tooltip on Hover</span>
                  <input
                    type="checkbox"
                    checked={selectedVisual.formatting.showTooltip}
                    onChange={(e) => updateFormatting({ showTooltip: e.target.checked })}
                    className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-gray-600">Data Labels on Bars/Points</span>
                  <input
                    type="checkbox"
                    checked={selectedVisual.formatting.showDataLabels}
                    onChange={(e) => updateFormatting({ showDataLabels: e.target.checked })}
                    className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                </label>
              </div>

              {/* Legend Configuration */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-gray-600 font-medium">Show Legend</label>
                  <input
                    type="checkbox"
                    checked={selectedVisual.formatting.showLegend}
                    onChange={(e) => updateFormatting({ showLegend: e.target.checked })}
                    className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                </div>
                {selectedVisual.formatting.showLegend && (
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">Legend Position</label>
                    <select
                      value={selectedVisual.formatting.legendPosition}
                      onChange={(e) => updateFormatting({ legendPosition: e.target.value as any })}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs bg-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    >
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          <hr className="border-gray-200" />

          {/* Series Colors Override */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-700 text-[11px] uppercase tracking-wider flex items-center gap-1">
              <Palette className="w-3 h-3 text-purple-600" />
              Chart Colors
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-500">Primary Color</span>
                <input
                  type="color"
                  value={selectedVisual.formatting.seriesColors[0] || theme.palette[0]}
                  onChange={(e) => {
                    const newColors = [...selectedVisual.formatting.seriesColors];
                    newColors[0] = e.target.value;
                    updateFormatting({ seriesColors: newColors });
                  }}
                  className="w-7 h-7 rounded border border-gray-300 p-0 cursor-pointer overflow-hidden"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-500">Secondary Color</span>
                <input
                  type="color"
                  value={selectedVisual.formatting.seriesColors[1] || theme.palette[1]}
                  onChange={(e) => {
                    const newColors = [...selectedVisual.formatting.seriesColors];
                    newColors[1] = e.target.value;
                    updateFormatting({ seriesColors: newColors });
                  }}
                  className="w-7 h-7 rounded border border-gray-300 p-0 cursor-pointer overflow-hidden"
                />
              </div>
              <button
                type="button"
                onClick={() => updateFormatting({ seriesColors: [...theme.palette] })}
                className="text-[11px] text-purple-600 hover:underline font-medium block"
              >
                Reset colors to theme palette
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Page Theme & Dashboard Styling */}
      {activeTab === 'page' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
          {/* Preset Themes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-700 text-[11px] uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-600" />
                Theme Presets
              </h4>
              <button
                onClick={onResetTheme}
                className="text-[10px] text-gray-500 hover:text-purple-600 flex items-center gap-1"
                title="Reset to default theme"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {Object.entries(THEME_PRESETS).map(([key, preset]) => {
                const isSelected = theme.id === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectThemePreset(key as ThemePreset)}
                    className={`p-2 rounded-lg border text-left transition-all relative ${
                      isSelected
                        ? 'border-purple-600 ring-2 ring-purple-100 shadow-sm bg-purple-50/20'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-[11px] text-gray-800 truncate">
                        {preset.name}
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                      )}
                    </div>
                    {/* Palette Swatch Preview */}
                    <div className="flex rounded overflow-hidden h-3 w-full border border-gray-200/60">
                      {preset.palette.slice(0, 5).map((color, idx) => (
                        <div key={idx} className="flex-1 h-full" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Background & Colors */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-700 text-[11px] uppercase tracking-wider flex items-center gap-1">
              <Palette className="w-3 h-3 text-purple-600" />
              Canvas & Background
            </h4>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-700 block">Canvas Background</span>
                  <span className="text-[10px] text-gray-400">Backdrop behind visual cards</span>
                </div>
                <input
                  type="color"
                  value={theme.canvasBg}
                  onChange={(e) => onUpdateTheme({ ...theme, canvasBg: e.target.value, id: 'custom' })}
                  className="w-7 h-7 rounded border border-gray-300 p-0 cursor-pointer overflow-hidden"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-700 block">Card Background</span>
                  <span className="text-[10px] text-gray-400">Inside individual charts</span>
                </div>
                <input
                  type="color"
                  value={theme.cardBg}
                  onChange={(e) => onUpdateTheme({ ...theme, cardBg: e.target.value, id: 'custom' })}
                  className="w-7 h-7 rounded border border-gray-300 p-0 cursor-pointer overflow-hidden"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-700 block">Card Border Color</span>
                  <span className="text-[10px] text-gray-400">Outline around visual cards</span>
                </div>
                <input
                  type="color"
                  value={theme.cardBorder}
                  onChange={(e) => onUpdateTheme({ ...theme, cardBorder: e.target.value, id: 'custom' })}
                  className="w-7 h-7 rounded border border-gray-300 p-0 cursor-pointer overflow-hidden"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-700 block">Primary Text Color</span>
                  <span className="text-[10px] text-gray-400">Titles and labels</span>
                </div>
                <input
                  type="color"
                  value={theme.textColor}
                  onChange={(e) => onUpdateTheme({ ...theme, textColor: e.target.value, id: 'custom' })}
                  className="w-7 h-7 rounded border border-gray-300 p-0 cursor-pointer overflow-hidden"
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Border Radius */}
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-700 text-[11px] uppercase tracking-wider">
              Corner Radius
            </h4>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: 'Square', val: 'rounded-none' },
                { label: 'Small', val: 'rounded-md' },
                { label: 'Rounded', val: 'rounded-xl' },
                { label: 'Full', val: 'rounded-2xl' }
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => onUpdateTheme({ ...theme, borderRadius: opt.val, id: 'custom' })}
                  className={`py-1.5 rounded border text-[11px] font-medium transition-colors ${
                    theme.borderRadius === opt.val
                      ? 'border-purple-600 bg-purple-50 text-purple-700 font-bold'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Theme Palette Customizer */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-700 text-[11px] uppercase tracking-wider">
              Color Palette (Global)
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {theme.palette.map((col, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <input
                    type="color"
                    value={col}
                    onChange={(e) => {
                      const newPalette = [...theme.palette];
                      newPalette[idx] = e.target.value;
                      onUpdateTheme({ ...theme, palette: newPalette, id: 'custom' });
                    }}
                    className="w-8 h-8 rounded border border-gray-300 p-0 cursor-pointer overflow-hidden"
                  />
                  <span className="text-[10px] text-gray-400 font-mono">#{idx + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
