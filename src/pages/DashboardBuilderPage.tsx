import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  LayoutDashboard, 
  Filter, 
  Database, 
  RotateCcw, 
  Sparkles, 
  AlertCircle,
  X,
  Sliders,
  BarChart3,
  ListTree,
  Loader2
} from 'lucide-react';
import type { 
  DashboardConfig, 
  VisualConfig, 
  DashboardTheme, 
  DashboardFilter, 
  CrossFilter, 
  ChartType,
  DatasetDataResponse,
  SavedDashboardRecord
} from '../types/dashboard';
import { THEME_PRESETS, getDefaultTheme } from '../utils/dashboardThemes';
import { filterRecords, processVisualData } from '../utils/dashboardDataEngine';
import { TopToolbar } from '../components/dashboard-builder/TopToolbar';
import { VisualsPanel } from '../components/dashboard-builder/VisualsPanel';
import { FieldsPanel } from '../components/dashboard-builder/FieldsPanel';
import { FormatPanel } from '../components/dashboard-builder/FormatPanel';
import { FiltersPanel } from '../components/dashboard-builder/FiltersPanel';
import { VisualCard } from '../components/dashboard-builder/VisualCard';
import { API_BASE_URL } from '../config';
import { authFetch } from '../utils/api';

const MAX_HISTORY = 25;

export const DashboardBuilderPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);

  // Persistence ID
  const [dashboardId, setDashboardId] = useState<number | null>(null);

  // Core Dashboard Configuration
  const [config, setConfig] = useState<DashboardConfig>(() => ({
    version: 1,
    title: 'Executive Sales & Operations',
    datasetId: null,
    theme: getDefaultTheme(),
    visuals: [],
    filters: []
  }));

  // Undo / Redo Stacks
  const [history, setHistory] = useState<DashboardConfig[]>([]);
  const [future, setFuture] = useState<DashboardConfig[]>([]);

  // Selection & UI State
  const [selectedVisualId, setSelectedVisualId] = useState<string | null>(null);
  const [crossFilter, setCrossFilter] = useState<CrossFilter | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [printStatusMessage, setPrintStatusMessage] = useState<string | null>(null);

  // Collapsible Panes State (Power BI layout)
  const [activeRightPane, setActiveRightPane] = useState<'fields' | 'format' | 'filters' | null>('fields');
  const [visualsCollapsed, setVisualsCollapsed] = useState<boolean>(false);

  // Datasets State
  const [datasets, setDatasets] = useState<Array<{ id: number; filename: string }>>([]);
  const [datasetData, setDatasetData] = useState<DatasetDataResponse | null>(null);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Push to Undo history
  const pushHistory = useCallback((newConfig: DashboardConfig) => {
    setHistory(prev => [...prev.slice(-MAX_HISTORY), config]);
    setFuture([]);
    setConfig(newConfig);
    setIsDirty(true);
  }, [config]);

  // Undo
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory(prev => prev.slice(0, prev.length - 1));
    setFuture(prev => [config, ...prev]);
    setConfig(previous);
    setIsDirty(true);
  }, [history, config]);

  // Redo
  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture(prev => prev.slice(1));
    setHistory(prev => [...prev, config]);
    setConfig(next);
    setIsDirty(true);
  }, [future, config]);

  // Keyboard shortcut listener (Ctrl+Z / Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Fullscreen listener
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Print lifecycle listener
  useEffect(() => {
    const handleBeforePrint = () => {
      setIsPrinting(true);
      setSelectedVisualId(null);
    };

    const handleAfterPrint = () => {
      setIsPrinting(false);
      setPrintStatusMessage(null);
      const styleEl = document.getElementById('print-orientation-style');
      if (styleEl) styleEl.remove();
      document.body.removeAttribute('data-print-orientation');
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  // Fetch Dataset Data & Saved Dashboard on Mount
  useEffect(() => {
    let isMounted = true;

    async function initializeStudio() {
      try {
        setLoadingData(true);
        setError(null);

        // 1. Fetch available datasets
        const dsRes = await authFetch(`${API_BASE_URL}/api/datasets`);
        if (!dsRes.ok) throw new Error('Failed to load datasets');
        const dsList = await dsRes.json();
        if (!isMounted) return;
        setDatasets(dsList);

        let activeDatasetId: number | null = location.state?.datasetId || null;

        // 2. Fetch saved dashboards for this user
        let loadedDashboard: SavedDashboardRecord | null = null;
        try {
          const dashRes = await authFetch(`${API_BASE_URL}/api/dashboards`);
          if (dashRes.ok) {
            const dashList: SavedDashboardRecord[] = await dashRes.json();
            if (dashList.length > 0) {
              // Find default or most recently updated
              loadedDashboard = dashList.find(d => d.is_default) || dashList[0];
            }
          }
        } catch (dashErr) {
          console.warn('Could not load existing dashboard:', dashErr);
        }

        // 3. Resolve active dataset ID
        if (loadedDashboard && loadedDashboard.dataset_id) {
          activeDatasetId = loadedDashboard.dataset_id;
          setDashboardId(loadedDashboard.id);
        } else if (!activeDatasetId && dsList.length > 0) {
          activeDatasetId = dsList[0].id;
        }

        // 4. Fetch the dataset records and schema
        if (activeDatasetId) {
          const dataRes = await authFetch(`${API_BASE_URL}/api/datasets/${activeDatasetId}/data`);
          if (dataRes.ok) {
            const parsedData: DatasetDataResponse = await dataRes.json();
            if (!isMounted) return;
            setDatasetData(parsedData);

            // If we have a saved configuration, parse and apply it
            if (loadedDashboard && loadedDashboard.config) {
              try {
                const parsedConfig: DashboardConfig = JSON.parse(loadedDashboard.config);
                setConfig({
                  ...parsedConfig,
                  datasetId: activeDatasetId,
                  theme: parsedConfig.theme || getDefaultTheme()
                });
                setIsDirty(false);
                setLoadingData(false);
                return;
              } catch (parseErr) {
                console.error('Failed to parse saved dashboard config', parseErr);
              }
            }

            // Otherwise, construct a rich starter layout using the dataset's columns
            const starterConfig = buildStarterDashboard(parsedData, activeDatasetId);
            setConfig(starterConfig);
            setIsDirty(false);
          } else {
            throw new Error('Failed to load dataset records');
          }
        } else {
          setError('No datasets found. Please upload a dataset to begin designing dashboards.');
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Error initializing Dashboard Studio');
      } finally {
        if (isMounted) setLoadingData(false);
      }
    }

    initializeStudio();

    return () => {
      isMounted = false;
    };
  }, [location.state?.datasetId]);

  // Change Dataset
  const handleSelectDataset = async (newDatasetId: number) => {
    try {
      setLoadingData(true);
      const res = await authFetch(`${API_BASE_URL}/api/datasets/${newDatasetId}/data`);
      if (!res.ok) throw new Error('Failed to load dataset data');
      const data: DatasetDataResponse = await res.json();
      setDatasetData(data);
      setCrossFilter(null);

      // Re-map starter layout or retain compatible visuals
      const updatedConfig: DashboardConfig = {
        ...config,
        datasetId: newDatasetId,
        filters: [], // reset filters for new dataset
        visuals: buildStarterDashboard(data, newDatasetId).visuals
      };

      pushHistory(updatedConfig);
      setSelectedVisualId(null);
    } catch (err: any) {
      alert(`Could not switch dataset: ${err.message}`);
    } finally {
      setLoadingData(false);
    }
  };

  // Build Default Starter Dashboard based on real column types
  const buildStarterDashboard = (data: DatasetDataResponse, dsId: number): DashboardConfig => {
    const numericCols = Object.entries(data.column_types)
      .filter(([_, t]) => t === 'numeric')
      .map(([col]) => col);

    const catCols = Object.entries(data.column_types)
      .filter(([_, t]) => t === 'categorical')
      .map(([col]) => col);

    const dateCols = Object.entries(data.column_types)
      .filter(([_, t]) => t === 'date')
      .map(([col]) => col);

    const defaultTheme = getDefaultTheme();
    const primaryNum = numericCols[0] || 'Amount';
    const secondaryNum = numericCols[1] || primaryNum;
    const primaryCat = catCols[0] || 'Category';
    const secondaryCat = catCols[1] || primaryCat;
    const timeCol = dateCols[0] || catCols[0] || 'Period';

    const starterVisuals: VisualConfig[] = [
      // KPI 1
      {
        id: 'kpi-1',
        type: 'kpi',
        title: `Total ${primaryNum}`,
        subtitle: `Aggregated sum of ${primaryNum}`,
        xField: '',
        yField: primaryNum,
        aggregation: 'sum',
        colSpan: 4,
        formatting: {
          title: `Total ${primaryNum}`,
          titleAlign: 'left',
          showXAxis: false,
          showYAxis: false,
          showLegend: false,
          legendPosition: 'bottom',
          showGrid: false,
          showTooltip: true,
          showDataLabels: true,
          seriesColors: [defaultTheme.palette[0]],
          numberFormat: 'compact',
          currencySymbol: '$',
          decimalPlaces: 1
        }
      },
      // KPI 2
      {
        id: 'kpi-2',
        type: 'kpi',
        title: `Average ${secondaryNum}`,
        subtitle: `Mean value per transaction`,
        xField: '',
        yField: secondaryNum,
        aggregation: 'avg',
        colSpan: 4,
        formatting: {
          title: `Average ${secondaryNum}`,
          titleAlign: 'left',
          showXAxis: false,
          showYAxis: false,
          showLegend: false,
          legendPosition: 'bottom',
          showGrid: false,
          showTooltip: true,
          showDataLabels: true,
          seriesColors: [defaultTheme.palette[1]],
          numberFormat: 'standard',
          currencySymbol: '$',
          decimalPlaces: 2
        }
      },
      // KPI 3
      {
        id: 'kpi-3',
        type: 'kpi',
        title: `Total Volume`,
        subtitle: 'Count of records',
        xField: '',
        yField: primaryCat,
        aggregation: 'count',
        colSpan: 4,
        formatting: {
          title: `Total Volume`,
          titleAlign: 'left',
          showXAxis: false,
          showYAxis: false,
          showLegend: false,
          legendPosition: 'bottom',
          showGrid: false,
          showTooltip: true,
          showDataLabels: true,
          seriesColors: [defaultTheme.palette[2]],
          numberFormat: 'standard',
          currencySymbol: '$',
          decimalPlaces: 0
        }
      },
      // Bar Chart: Primary Metric by Category
      {
        id: 'visual-bar',
        type: 'bar',
        title: `${primaryNum} by ${primaryCat}`,
        subtitle: 'Ranked descending breakdown',
        xField: primaryCat,
        yField: primaryNum,
        aggregation: 'sum',
        topN: 8,
        colSpan: 6,
        formatting: {
          title: `${primaryNum} by ${primaryCat}`,
          titleAlign: 'left',
          showXAxis: true,
          showYAxis: true,
          showLegend: false,
          legendPosition: 'top',
          showGrid: true,
          showTooltip: true,
          showDataLabels: false,
          seriesColors: [defaultTheme.palette[0], defaultTheme.palette[1]],
          numberFormat: 'compact',
          currencySymbol: '$',
          decimalPlaces: 1
        }
      },
      // Donut Chart: Distribution
      {
        id: 'visual-donut',
        type: 'donut',
        title: `${primaryCat} Share`,
        subtitle: 'Percentage contribution',
        xField: primaryCat,
        yField: primaryNum,
        aggregation: 'sum',
        topN: 6,
        colSpan: 6,
        formatting: {
          title: `${primaryCat} Share`,
          titleAlign: 'left',
          showXAxis: false,
          showYAxis: false,
          showLegend: true,
          legendPosition: 'right',
          showGrid: false,
          showTooltip: true,
          showDataLabels: true,
          seriesColors: defaultTheme.palette,
          numberFormat: 'percentage',
          currencySymbol: '$',
          decimalPlaces: 1
        }
      },
      // Trend Area Chart
      {
        id: 'visual-trend',
        type: 'area',
        title: `${primaryNum} Trend over ${timeCol}`,
        subtitle: 'Temporal progression',
        xField: timeCol,
        yField: primaryNum,
        aggregation: 'sum',
        topN: 15,
        colSpan: 7,
        formatting: {
          title: `${primaryNum} Trend over ${timeCol}`,
          titleAlign: 'left',
          showXAxis: true,
          showYAxis: true,
          showLegend: false,
          legendPosition: 'top',
          showGrid: true,
          showTooltip: true,
          showDataLabels: false,
          seriesColors: [defaultTheme.palette[1]],
          numberFormat: 'compact',
          currencySymbol: '$',
          decimalPlaces: 1
        }
      },
      // Data Matrix / Table
      {
        id: 'visual-table',
        type: 'table',
        title: `Detail Records (${primaryCat} & ${secondaryCat})`,
        subtitle: 'Direct dataset row matrix',
        xField: primaryCat,
        yField: primaryNum,
        groupField: secondaryCat !== primaryCat ? secondaryCat : undefined,
        aggregation: 'sum',
        topN: 20,
        colSpan: 5,
        formatting: {
          title: `Detail Records (${primaryCat})`,
          titleAlign: 'left',
          showXAxis: false,
          showYAxis: false,
          showLegend: false,
          legendPosition: 'bottom',
          showGrid: true,
          showTooltip: false,
          showDataLabels: false,
          seriesColors: [defaultTheme.palette[0]],
          numberFormat: 'standard',
          currencySymbol: '$',
          decimalPlaces: 2
        }
      }
    ];

    return {
      version: 1,
      title: `${data.filename.replace(/\.[^/.]+$/, '')} Report`,
      datasetId: dsId,
      theme: defaultTheme,
      visuals: starterVisuals,
      filters: []
    };
  };

  // Add a new visual
  const handleAddVisual = (type: ChartType) => {
    if (!datasetData) return;

    const numericCols = Object.entries(datasetData.column_types)
      .filter(([_, t]) => t === 'numeric')
      .map(([col]) => col);

    const catCols = Object.entries(datasetData.column_types)
      .filter(([_, t]) => t === 'categorical')
      .map(([col]) => col);

    const xField = catCols[0] || datasetData.columns[0] || 'Category';
    const yField = numericCols[0] || datasetData.columns[1] || 'Value';

    const newId = `visual-${Date.now().toString(36)}`;
    const newVisual: VisualConfig = {
      id: newId,
      type,
      title: `${type === 'kpi' ? 'KPI' : type.replace('_', ' ')}: ${yField}`,
      subtitle: `${xField ? `by ${xField}` : ''}`,
      xField: type === 'kpi' ? '' : xField,
      yField,
      aggregation: type === 'kpi' ? 'sum' : 'sum',
      topN: type === 'table' ? 25 : 8,
      colSpan: type === 'kpi' ? 4 : 6,
      formatting: {
        title: `${type === 'kpi' ? 'KPI' : type.replace('_', ' ')} of ${yField}`,
        titleAlign: 'left',
        showXAxis: true,
        showYAxis: true,
        showLegend: type === 'pie' || type === 'donut',
        legendPosition: 'top',
        showGrid: true,
        showTooltip: true,
        showDataLabels: type === 'donut' || type === 'kpi',
        seriesColors: [...config.theme.palette],
        numberFormat: 'standard',
        currencySymbol: '$',
        decimalPlaces: 2
      }
    };

    const updatedConfig = {
      ...config,
      visuals: [...config.visuals, newVisual]
    };

    pushHistory(updatedConfig);
    setSelectedVisualId(newId);
    setActiveRightPane('fields');
  };

  // Change Visual Type for selected visual
  const handleChangeVisualType = (type: ChartType) => {
    if (!selectedVisualId) {
      handleAddVisual(type);
      return;
    }
    const updated = config.visuals.map(v => {
      if (v.id !== selectedVisualId) return v;
      return {
        ...v,
        type,
        formatting: {
          ...v.formatting,
          showLegend: type === 'pie' || type === 'donut' || v.formatting.showLegend,
          showDataLabels: type === 'donut' || type === 'kpi' || v.formatting.showDataLabels
        }
      };
    });
    pushHistory({ ...config, visuals: updated });
  };

  // Update selected visual config
  const handleUpdateVisual = (updated: VisualConfig) => {
    const updatedVisuals = config.visuals.map(v => v.id === updated.id ? updated : v);
    pushHistory({ ...config, visuals: updatedVisuals });
  };

  // Delete visual
  const handleDeleteVisual = (id: string) => {
    const updated = config.visuals.filter(v => v.id !== id);
    pushHistory({ ...config, visuals: updated });
    if (selectedVisualId === id) {
      setSelectedVisualId(null);
    }
  };

  // Duplicate visual
  const handleDuplicateVisual = (id: string) => {
    const target = config.visuals.find(v => v.id === id);
    if (!target) return;

    const clonedId = `visual-${Date.now().toString(36)}`;
    const cloned: VisualConfig = {
      ...target,
      id: clonedId,
      title: `${target.title} (Copy)`,
      formatting: {
        ...target.formatting,
        title: `${target.formatting.title} (Copy)`
      }
    };

    const targetIdx = config.visuals.findIndex(v => v.id === id);
    const newVisuals = [...config.visuals];
    newVisuals.splice(targetIdx + 1, 0, cloned);

    pushHistory({ ...config, visuals: newVisuals });
    setSelectedVisualId(clonedId);
  };

  // Move visual left / up in grid
  const handleMoveVisualUp = (id: string) => {
    const idx = config.visuals.findIndex(v => v.id === id);
    if (idx <= 0) return;
    const newVisuals = [...config.visuals];
    const temp = newVisuals[idx - 1];
    newVisuals[idx - 1] = newVisuals[idx];
    newVisuals[idx] = temp;
    pushHistory({ ...config, visuals: newVisuals });
  };

  // Move visual right / down in grid
  const handleMoveVisualDown = (id: string) => {
    const idx = config.visuals.findIndex(v => v.id === id);
    if (idx < 0 || idx >= config.visuals.length - 1) return;
    const newVisuals = [...config.visuals];
    const temp = newVisuals[idx + 1];
    newVisuals[idx + 1] = newVisuals[idx];
    newVisuals[idx] = temp;
    pushHistory({ ...config, visuals: newVisuals });
  };

  // Resize visual colSpan
  const handleResizeVisual = (id: string, colSpan: number) => {
    const updated = config.visuals.map(v => v.id === id ? { ...v, colSpan } : v);
    pushHistory({ ...config, visuals: updated });
  };

  // Cross-Filter slice / bar click
  const handleSliceClick = (field: string, value: string, visualId: string) => {
    if (crossFilter && crossFilter.visualId === visualId && crossFilter.value === value) {
      // Unset cross-filter
      setCrossFilter(null);
    } else {
      setCrossFilter({ visualId, field, value });
    }
  };

  // Clear cross-filter
  const handleClearCrossFilter = () => {
    setCrossFilter(null);
  };

  // Update Filters
  const handleFilterChange = (newFilters: DashboardFilter[]) => {
    pushHistory({ ...config, filters: newFilters });
  };

  // Clear All Filters
  const handleClearAllFilters = () => {
    pushHistory({ ...config, filters: [] });
    setCrossFilter(null);
  };

  // Save Dashboard to Database
  const handleSaveDashboard = async () => {
    try {
      setIsSaving(true);
      const payload = {
        title: config.title,
        dataset_id: config.datasetId,
        config: JSON.stringify(config),
        is_default: true
      };

      let res;
      if (dashboardId) {
        // Update existing
        res = await authFetch(`${API_BASE_URL}/api/dashboards/${dashboardId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // Create new
        res = await authFetch(`${API_BASE_URL}/api/dashboards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        throw new Error('Failed to save dashboard');
      }

      const savedData = await res.json();
      setDashboardId(savedData.id);
      setIsDirty(false);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default starter template
  const handleResetDefault = () => {
    if (!datasetData || !config.datasetId) return;
    if (window.confirm('Reset this dashboard layout to the default template? Any custom charts will be replaced.')) {
      const fresh = buildStarterDashboard(datasetData, config.datasetId);
      pushHistory(fresh);
      setSelectedVisualId(null);
      setCrossFilter(null);
    }
  };

  // Fullscreen toggle
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Export to PDF / Print with render settling
  const handleExportPDF = async (orientation: 'landscape' | 'portrait' = 'landscape') => {
    try {
      setIsPrinting(true);
      setPrintStatusMessage(`Preparing ${orientation === 'landscape' ? 'Landscape' : 'Portrait'} print layout...`);

      // 1. Inject @page size style for target orientation
      let styleEl = document.getElementById('print-orientation-style');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'print-orientation-style';
        document.head.appendChild(styleEl);
      }
      styleEl.innerHTML = `@page { size: A4 ${orientation}; margin: 8mm 10mm; }`;
      document.body.setAttribute('data-print-orientation', orientation);

      // 2. Clear visual selection so no edit rings or handles are visible
      setSelectedVisualId(null);

      // 3. Settle layout and Recharts SVGs (400ms delay)
      await new Promise(resolve => setTimeout(resolve, 400));

      setPrintStatusMessage(null);
      window.print();
    } catch (err) {
      console.error('Print error:', err);
      setIsPrinting(false);
      setPrintStatusMessage(null);
    }
  };

  // Export Filtered CSV
  const handleExportCSV = () => {
    if (!datasetData) return;
    const records = filterRecords(datasetData.records, config.filters, crossFilter);
    if (records.length === 0) {
      alert('No records match current filters to export.');
      return;
    }

    const headers = datasetData.columns;
    const csvRows = [headers.join(',')];

    for (const r of records) {
      const values = headers.map(h => {
        const val = r[h] ?? '';
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${config.title.toLowerCase().replace(/\s+/g, '_')}_filtered_data.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export as Image
  const handleExportImage = () => {
    // Offer clean print or instructions
    window.print();
  };

  // Selected Visual instance
  const selectedVisual = useMemo(() => {
    return config.visuals.find(v => v.id === selectedVisualId) || null;
  }, [config.visuals, selectedVisualId]);

  // Filtered Records for rendering
  const activeRecords = useMemo(() => {
    if (!datasetData) return [];
    return datasetData.records;
  }, [datasetData]);

  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-700">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <h2 className="text-lg font-bold">Loading InsightFlow Dashboard Studio...</h2>
        <p className="text-sm text-slate-500 mt-1">Preparing high-performance analytical engine</p>
      </div>
    );
  }

  if (error || !datasetData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-800 p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-200 p-6 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">No Dataset Ready</h2>
          <p className="text-sm text-gray-600 mb-6">{error || 'Please connect a dataset first.'}</p>
          <button
            onClick={() => navigate('/app/dashboard')}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
          >
            Go to Upload Datasets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-100 font-sans select-none">
      {/* Top Application Toolbar */}
      <TopToolbar
        title={config.title}
        onTitleChange={(title) => pushHistory({ ...config, title })}
        datasetName={datasetData.filename}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        isEditMode={isEditMode}
        onToggleEditMode={() => {
          setIsEditMode(!isEditMode);
          if (isEditMode) setSelectedVisualId(null);
        }}
        onSave={handleSaveDashboard}
        isSaving={isSaving}
        isDirty={isDirty}
        onResetDefault={handleResetDefault}
        onFullscreen={handleToggleFullscreen}
        isFullscreen={isFullscreen}
        onExportCSV={handleExportCSV}
        onExportPDF={handleExportPDF}
        onExportImage={handleExportImage}
      />

      {/* Main Studio Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Leftmost Visual Types Palette (Visible in Edit Mode) */}
        {isEditMode && (
          <VisualsPanel
            selectedType={selectedVisual?.type || null}
            onAddVisual={handleAddVisual}
            onChangeSelectedType={handleChangeVisualType}
            isCollapsed={visualsCollapsed}
            onToggleCollapse={() => setVisualsCollapsed(!visualsCollapsed)}
          />
        )}

        {/* Central Dashboard Canvas */}
        <div 
          ref={canvasRef}
          onClick={(e) => {
            // Deselect visual if clicking canvas background
            if (e.target === canvasRef.current) {
              setSelectedVisualId(null);
            }
          }}
          className="dashboard-canvas flex-1 overflow-y-auto p-4 md:p-6 transition-colors duration-200 relative print:p-0 print:overflow-visible print:bg-white"
          style={{ backgroundColor: config.theme.canvasBg }}
        >
          {/* Print Header: Only visible on printed report pages */}
          <div className="hidden print:block mb-5 pb-3 border-b-2 border-gray-300">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-amber-500 flex items-center justify-center text-white font-black text-xs">
                    IF
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">{config.title || 'InsightFlow Report'}</h1>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Dataset: {datasetData?.filename} • Filtered Records: {activeRecords.length.toLocaleString()} of {datasetData?.total_rows.toLocaleString()}
                </p>
              </div>
              <div className="text-right text-xs text-gray-500">
                <div className="font-semibold text-gray-800">InsightFlow BI Platform</div>
                <div className="text-gray-500 mt-0.5">
                  Generated {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
              </div>
            </div>
          </div>

          {/* Active Cross-filter Alert Ribbon */}
          {crossFilter && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center justify-between text-xs text-blue-900 shadow-xs print:hidden animate-in fade-in">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-600" />
                <span>
                  Interactive Cross-Filtering: <strong>{crossFilter.field}</strong> = <strong>{crossFilter.value}</strong>
                </span>
                <span className="text-[11px] text-blue-600/80">
                  (Click the slice again or click clear to show all data)
                </span>
              </div>
              <button
                onClick={handleClearCrossFilter}
                className="flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Clear Cross-Filter
              </button>
            </div>
          )}

          {/* Canvas Visuals Grid */}
          {config.visuals.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center bg-white/60">
              <LayoutDashboard className="w-12 h-12 text-gray-400 mb-3" />
              <h3 className="text-base font-bold text-gray-800">Your canvas is empty</h3>
              <p className="text-xs text-gray-500 max-w-sm mt-1 mb-4">
                Click any visualization on the left panel or load default charts to start designing.
              </p>
              <button
                onClick={handleResetDefault}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                Load Recommended Visuals
              </button>
            </div>
          ) : (
            <div className="dashboard-grid grid grid-cols-1 md:grid-cols-12 gap-4 pb-12 print:gap-4 print:pb-0">
              {config.visuals.map((visual) => {
                const visualFilteredRecords = filterRecords(
                  datasetData.records,
                  config.filters,
                  crossFilter,
                  visual.id
                );
                const processed = processVisualData(visual, visualFilteredRecords);

                return (
                  <VisualCard
                    key={visual.id}
                    visual={visual}
                    theme={config.theme}
                    processedData={processed}
                    isSelected={isEditMode && selectedVisualId === visual.id}
                    isEditMode={isEditMode}
                    isPrinting={isPrinting}
                    activeCrossFilter={crossFilter}
                    onSelect={() => {
                      setSelectedVisualId(visual.id);
                      if (activeRightPane === null) setActiveRightPane('fields');
                    }}
                    onDelete={() => handleDeleteVisual(visual.id)}
                    onDuplicate={() => handleDuplicateVisual(visual.id)}
                    onMove={(dir) => dir === 'left' ? handleMoveVisualUp(visual.id) : handleMoveVisualDown(visual.id)}
                    onResize={(span) => handleResizeVisual(visual.id, span)}
                    onCrossFilter={(field, value) => handleSliceClick(field, value, visual.id)}
                    onClearCrossFilter={handleClearCrossFilter}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Right Collapsible Dock (Fields, Format, Filters) - Power BI style */}
        {isEditMode && (
          <div className="flex h-full border-l border-gray-200 z-10 print:hidden shadow-xs">
            {/* Right Pane Selection Tabs Strip */}
            <div className="w-12 bg-gray-50 border-r border-gray-200 flex flex-col items-center py-3 gap-2">
              <button
                onClick={() => setActiveRightPane(activeRightPane === 'fields' ? null : 'fields')}
                className={`p-2.5 rounded-lg transition-colors flex flex-col items-center gap-1 ${
                  activeRightPane === 'fields'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-200/70 hover:text-gray-900'
                }`}
                title="Dataset Fields (Data Model)"
              >
                <ListTree className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase tracking-tighter">Data</span>
              </button>

              <button
                onClick={() => setActiveRightPane(activeRightPane === 'format' ? null : 'format')}
                className={`p-2.5 rounded-lg transition-colors flex flex-col items-center gap-1 ${
                  activeRightPane === 'format'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-200/70 hover:text-gray-900'
                }`}
                title="Visual Formatting & Themes"
              >
                <Sliders className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase tracking-tighter">Format</span>
              </button>

              <button
                onClick={() => setActiveRightPane(activeRightPane === 'filters' ? null : 'filters')}
                className={`p-2.5 rounded-lg transition-colors flex flex-col items-center gap-1 relative ${
                  activeRightPane === 'filters'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-200/70 hover:text-gray-900'
                }`}
                title="Page Filters"
              >
                <Filter className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase tracking-tighter">Filter</span>
                {config.filters.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center">
                    {config.filters.length}
                  </span>
                )}
              </button>
            </div>

            {/* Expanded Right Pane Content */}
            {activeRightPane === 'fields' && (
              <FieldsPanel
                datasets={datasets}
                selectedDatasetId={config.datasetId}
                onSelectDataset={handleSelectDataset}
                columns={datasetData.columns}
                columnTypes={datasetData.column_types}
                selectedVisual={selectedVisual}
                onUpdateVisualConfig={(updates) => selectedVisual && handleUpdateVisual({ ...selectedVisual, ...updates })}
                onToggleCollapse={() => setActiveRightPane(null)}
              />
            )}

            {activeRightPane === 'format' && (
              <FormatPanel
                selectedVisual={selectedVisual}
                onUpdateVisual={handleUpdateVisual}
                theme={config.theme}
                onUpdateTheme={(theme) => pushHistory({ ...config, theme })}
                onResetTheme={() => pushHistory({ ...config, theme: getDefaultTheme() })}
                onToggleCollapse={() => setActiveRightPane(null)}
              />
            )}

            {activeRightPane === 'filters' && (
              <FiltersPanel
                filters={config.filters}
                onFilterChange={handleFilterChange}
                columnTypes={datasetData.column_types}
                records={datasetData.records}
                onClearAll={handleClearAllFilters}
                onToggleCollapse={() => setActiveRightPane(null)}
              />
            )}
          </div>
        )}
      </div>

      {/* Print Preparation Modal */}
      {printStatusMessage && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-200 text-center animate-in fade-in zoom-in-95">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-900">Preparing Print Preview</h3>
            <p className="text-xs text-gray-500 mt-1">{printStatusMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};
export default DashboardBuilderPage;
