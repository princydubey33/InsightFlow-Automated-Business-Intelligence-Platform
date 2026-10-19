import type { DashboardTheme, ThemePreset } from '../types/dashboard';

export const THEME_PRESETS: Record<ThemePreset, DashboardTheme> = {
  powerbi: {
    id: 'powerbi',
    name: 'Power BI Classic',
    canvasBg: '#f0f2f5',
    dashboardBg: '#e5e7eb',
    cardBg: '#ffffff',
    cardBorder: '#d1d5db',
    borderRadius: 'rounded-lg',
    textColor: '#1f2937',
    subtextColor: '#6b7280',
    gridColor: '#e5e7eb',
    palette: ['#118DFF', '#12239E', '#E66C37', '#6B007B', '#E044A7', '#744EC2', '#D9B300', '#D64550']
  },
  executive: {
    id: 'executive',
    name: 'Executive Slate',
    canvasBg: '#f8fafc',
    dashboardBg: '#f1f5f9',
    cardBg: '#ffffff',
    cardBorder: '#cbd5e1',
    borderRadius: 'rounded-xl',
    textColor: '#0f172a',
    subtextColor: '#64748b',
    gridColor: '#f1f5f9',
    palette: ['#2563eb', '#0891b2', '#059669', '#4f46e5', '#d97706', '#dc2626', '#7c3aed', '#0284c7']
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Warmth',
    canvasBg: '#fff7ed',
    dashboardBg: '#ffedd5',
    cardBg: '#ffffff',
    cardBorder: '#fed7aa',
    borderRadius: 'rounded-2xl',
    textColor: '#431407',
    subtextColor: '#9a3412',
    gridColor: '#fed7aa40',
    palette: ['#ea580c', '#e11d48', '#f59e0b', '#9333ea', '#4f46e5', '#db2777', '#ca8a04', '#c026d3']
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean Breeze',
    canvasBg: '#f0f9ff',
    dashboardBg: '#e0f2fe',
    cardBg: '#ffffff',
    cardBorder: '#bae6fd',
    borderRadius: 'rounded-xl',
    textColor: '#082f49',
    subtextColor: '#0369a1',
    gridColor: '#e0f2fe60',
    palette: ['#0284c7', '#0d9488', '#2563eb', '#06b6d4', '#6366f1', '#14b8a6', '#3b82f6', '#38bdf8']
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Mint',
    canvasBg: '#f0fdf4',
    dashboardBg: '#dcfce7',
    cardBg: '#ffffff',
    cardBorder: '#bbf7d0',
    borderRadius: 'rounded-xl',
    textColor: '#052e16',
    subtextColor: '#166534',
    gridColor: '#dcfce750',
    palette: ['#059669', '#10b981', '#0d9488', '#65a30d', '#0284c7', '#d97706', '#14b8a6', '#84cc16']
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk Dark',
    canvasBg: '#090d16',
    dashboardBg: '#030712',
    cardBg: '#111827',
    cardBorder: '#374151',
    borderRadius: 'rounded-xl',
    textColor: '#f9fafb',
    subtextColor: '#9ca3af',
    gridColor: '#1f2937',
    palette: ['#a855f7', '#06b6d4', '#f43f5e', '#eab308', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6']
  },
  light: {
    id: 'light',
    name: 'Modern Light',
    canvasBg: '#ffffff',
    dashboardBg: '#f8fafc',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    borderRadius: 'rounded-xl',
    textColor: '#1e293b',
    subtextColor: '#64748b',
    gridColor: '#f1f5f9',
    palette: ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']
  },
  dark: {
    id: 'dark',
    name: 'Midnight Dark',
    canvasBg: '#0f172a',
    dashboardBg: '#020617',
    cardBg: '#1e293b',
    cardBorder: '#334155',
    borderRadius: 'rounded-xl',
    textColor: '#f8fafc',
    subtextColor: '#94a3b8',
    gridColor: '#33415540',
    palette: ['#818cf8', '#38bdf8', '#34d399', '#fbbf24', '#f87171', '#c084fc', '#f472b6', '#2dd4bf']
  },
  custom: {
    id: 'custom',
    name: 'Custom Theme',
    canvasBg: '#f8fafc',
    dashboardBg: '#f1f5f9',
    cardBg: '#ffffff',
    cardBorder: '#cbd5e1',
    borderRadius: 'rounded-xl',
    textColor: '#0f172a',
    subtextColor: '#64748b',
    gridColor: '#e2e8f0',
    palette: ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6']
  }
};

export const getDefaultTheme = (): DashboardTheme => THEME_PRESETS.powerbi;
