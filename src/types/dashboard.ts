export type ChartType = 
  | 'bar' 
  | 'horizontal_bar'
  | 'line' 
  | 'area' 
  | 'pie' 
  | 'donut' 
  | 'scatter' 
  | 'table' 
  | 'kpi';

export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max';

export type SortDirection = 'asc' | 'desc';

export type ThemePreset = 
  | 'powerbi' 
  | 'executive' 
  | 'sunset' 
  | 'ocean' 
  | 'emerald' 
  | 'cyberpunk' 
  | 'light' 
  | 'dark' 
  | 'custom';

export interface DashboardTheme {
  id: ThemePreset;
  name: string;
  canvasBg: string;
  dashboardBg: string;
  cardBg: string;
  cardBorder: string;
  borderRadius: string; // 'rounded-none' | 'rounded-lg' | 'rounded-xl' | 'rounded-2xl'
  textColor: string;
  subtextColor: string;
  gridColor: string;
  palette: string[];
}

export type NumberFormatType = 'standard' | 'currency' | 'percentage' | 'compact';

export interface VisualFormatting {
  title: string;
  subtitle?: string;
  titleColor?: string;
  titleAlign: 'left' | 'center' | 'right';
  cardBg?: string;
  cardBorder?: string;
  borderRadius?: string;
  showXAxis: boolean;
  showYAxis: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  axisColor?: string;
  showLegend: boolean;
  legendPosition: 'top' | 'bottom' | 'left' | 'right';
  showGrid: boolean;
  gridColor?: string;
  showTooltip: boolean;
  showDataLabels: boolean;
  seriesColors: string[];
  numberFormat: NumberFormatType;
  currencySymbol: '$' | '₹' | '€' | '£';
  decimalPlaces: number;
}

export interface VisualConfig {
  id: string;
  type: ChartType;
  title: string;
  subtitle?: string;
  xField: string;
  yField: string;
  groupField?: string | null;
  aggregation: AggregationType;
  topN?: number | null; // e.g., 5, 10, null for All
  colSpan: number; // 3, 4, 6, 8, 12 out of 12
  height?: number; // e.g. 280, 340, 420
  formatting: VisualFormatting;
}

export interface DashboardFilter {
  field: string;
  type: 'categorical' | 'numeric' | 'date';
  selectedValues: string[];
  numericMin?: number | null;
  numericMax?: number | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}

export interface CrossFilter {
  visualId: string;
  field: string;
  value: string;
}

export interface DashboardConfig {
  version: number;
  title: string;
  datasetId: number | null;
  theme: DashboardTheme;
  visuals: VisualConfig[];
  filters: DashboardFilter[];
}

export interface DatasetColumnInfo {
  name: string;
  type: 'numeric' | 'categorical' | 'date';
  distinctCount?: number;
  min?: number;
  max?: number;
}

export interface DatasetDataResponse {
  dataset_id: number;
  filename: string;
  total_rows: number;
  columns: string[];
  column_types: Record<string, 'numeric' | 'categorical' | 'date'>;
  records: Record<string, any>[];
}

export interface SavedDashboardRecord {
  id: number;
  user_id: number;
  title: string;
  dataset_id: number | null;
  config: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
