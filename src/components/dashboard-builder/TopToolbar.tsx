import React, { useState, useRef, useEffect } from 'react';
import { 
  Save, 
  Undo2, 
  Redo2, 
  Eye, 
  Edit3, 
  Download, 
  Maximize, 
  Minimize, 
  FileSpreadsheet, 
  Printer, 
  Image as ImageIcon, 
  RotateCcw, 
  Database, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown
} from 'lucide-react';

interface TopToolbarProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  datasetName?: string;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  onSave: () => void;
  isSaving: boolean;
  isDirty: boolean;
  onResetDefault: () => void;
  onFullscreen: () => void;
  isFullscreen: boolean;
  onExportCSV: () => void;
  onExportPDF: (orientation: 'landscape' | 'portrait') => void;
  onExportImage: () => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  title,
  onTitleChange,
  datasetName,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isEditMode,
  onToggleEditMode,
  onSave,
  isSaving,
  isDirty,
  onResetDefault,
  onFullscreen,
  isFullscreen,
  onExportCSV,
  onExportPDF,
  onExportImage
}) => {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTempTitle(title);
  }, [title]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Click outside to close export menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (tempTitle.trim() && tempTitle !== title) {
      onTitleChange(tempTitle.trim());
    } else {
      setTempTitle(title);
    }
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between select-none z-20 shadow-sm print:hidden">
      {/* Left: Title & Dataset Info */}
      <div className="flex items-center gap-3">
        {/* Power BI inspired Logo Badge */}
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-amber-600 to-yellow-400 flex items-center justify-center text-white font-black text-sm shadow-sm ring-1 ring-amber-400/40">
          IF
        </div>

        {/* Dashboard Title */}
        <div className="flex items-center gap-2">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') {
                  setTempTitle(title);
                  setIsEditingTitle(false);
                }
              }}
              className="text-base font-bold text-gray-900 border-b-2 border-blue-600 px-1 py-0.5 focus:outline-none bg-blue-50/50 rounded-t"
            />
          ) : (
            <div 
              onClick={() => setIsEditingTitle(true)}
              className="group flex items-center gap-1.5 cursor-pointer py-1 px-1.5 rounded hover:bg-gray-100 transition-colors"
              title="Click to rename report"
            >
              <h1 className="text-base font-bold text-gray-900 tracking-tight">
                {title || 'Untitled Dashboard'}
              </h1>
              <Edit3 className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}

          {/* Dataset Badge */}
          {datasetName && (
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
              <Database className="w-3 h-3 text-slate-500" />
              <span className="truncate max-w-[140px]">{datasetName}</span>
            </div>
          )}

          {/* Save Status Indicator */}
          <div className="hidden md:flex items-center text-xs">
            {isSaving ? (
              <span className="flex items-center gap-1 text-blue-600 font-medium">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
              </span>
            ) : isDirty ? (
              <span className="flex items-center gap-1 text-amber-600 font-medium">
                <AlertCircle className="w-3 h-3" /> Unsaved changes
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <CheckCircle2 className="w-3 h-3" /> Saved
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Center: Undo / Redo & Mode Toggle */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo */}
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded text-gray-700 transition-colors ${
              canUndo 
                ? 'hover:bg-white hover:text-gray-900 hover:shadow-xs cursor-pointer' 
                : 'text-gray-300 cursor-not-allowed opacity-50'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-gray-300 mx-0.5" />
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded text-gray-700 transition-colors ${
              canRedo 
                ? 'hover:bg-white hover:text-gray-900 hover:shadow-xs cursor-pointer' 
                : 'text-gray-300 cursor-not-allowed opacity-50'
            }`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* View Mode Toggle: Design Mode vs Preview Mode */}
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200">
          <button
            onClick={onToggleEditMode}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              isEditMode
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Design View</span>
          </button>
          <button
            onClick={onToggleEditMode}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              !isEditMode
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Preview Mode</span>
          </button>
        </div>
      </div>

      {/* Right: Actions (Save, Export, Fullscreen, Reset) */}
      <div className="flex items-center gap-2">
        {/* Reset Default */}
        <button
          onClick={onResetDefault}
          className="hidden lg:flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 px-2 py-1.5 rounded hover:bg-gray-100 transition-colors"
          title="Reset to default dashboard layout"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>

        {/* Fullscreen Presentation Mode */}
        <button
          onClick={onFullscreen}
          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Presentation'}
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>

        {/* Export Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Export</span>
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </button>

          {exportMenuOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-30 animate-in fade-in slide-in-from-top-1 text-xs">
              <button
                onClick={() => {
                  setExportMenuOpen(false);
                  onExportPDF('landscape');
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between text-gray-700 hover:text-blue-600"
              >
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-rose-500 shrink-0" />
                  <div>
                    <div className="font-medium flex items-center gap-1.5">
                      <span>Print to PDF (Landscape)</span>
                      <span className="text-[9px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded font-bold">Recommended</span>
                    </div>
                    <div className="text-[10px] text-gray-400">A4 Landscape • Best for multi-column dashboards</div>
                  </div>
                </div>
              </button>
              <button
                onClick={() => {
                  setExportMenuOpen(false);
                  onExportPDF('portrait');
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700 hover:text-blue-600"
              >
                <Printer className="w-4 h-4 text-purple-500 shrink-0" />
                <div>
                  <div className="font-medium">Print to PDF (Portrait)</div>
                  <div className="text-[10px] text-gray-400">A4 Portrait • Standard vertical page</div>
                </div>
              </button>
              <button
                onClick={() => {
                  setExportMenuOpen(false);
                  onExportImage();
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700 hover:text-blue-600"
              >
                <ImageIcon className="w-4 h-4 text-indigo-500" />
                <div>
                  <div className="font-medium">Export as Image</div>
                  <div className="text-[10px] text-gray-400">Download dashboard snapshot</div>
                </div>
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => {
                  setExportMenuOpen(false);
                  onExportCSV();
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700 hover:text-blue-600"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <div>
                  <div className="font-medium">Export Filtered CSV</div>
                  <div className="text-[10px] text-gray-400">Download raw active records</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={onSave}
          disabled={isSaving}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all ${
            isDirty
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
              : 'bg-gray-900 hover:bg-gray-800 text-white'
          }`}
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>{isSaving ? 'Saving' : 'Save'}</span>
        </button>
      </div>
    </header>
  );
};
