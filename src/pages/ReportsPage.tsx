import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  FileText, 
  Download, 
  Calendar, 
  Database, 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Layers, 
  MapPin, 
  Package, 
  RefreshCw, 
  Lightbulb, 
  ArrowRight,
  Printer
} from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '../config';

interface TopItem {
  name: string;
  value: number;
}

interface InsightItem {
  id?: string | number;
  type?: string;
  title: string;
  description: string;
  value?: string | number | null;
  severity?: string;
  recommendation?: string;
}

interface ReportData {
  dataset_name: string;
  upload_date: string | null;
  total_rows: number | null;
  total_columns: number | null;
  quality_score: number | null;
  data_quality_score?: number | null;
  missing_values: number | null;
  duplicate_rows: number | null;
  total_revenue: number | null;
  total_orders: number | null;
  total_quantity: number | null;
  total_returns: number | null;
  average_order_value: number | null;
  top_products: TopItem[];
  top_categories: TopItem[];
  top_cities: TopItem[];
  automated_insights: InsightItem[];
}

interface Dataset {
  id: number;
  original_filename: string;
  filename: string;
  uploaded_at: string;
}

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 }
  }
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 2 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.1, ease: 'easeOut' } }
};

export default function ReportsPage() {
  const location = useLocation();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(
    location.state?.datasetId ? Number(location.state.datasetId) : null
  );
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async (datasetId: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/api/datasets/${datasetId}/report`);
      if (!res.ok) {
        throw new Error(`Failed to load report (HTTP ${res.status})`);
      }
      const data: ReportData = await res.json();
      setReport(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error fetching report');
    } finally {
      setLoading(false);
    }
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch available datasets
      const dsRes = await fetch(`${API_BASE_URL}/api/datasets`);
      if (!dsRes.ok) throw new Error('Failed to fetch datasets');
      const dsList: Dataset[] = await dsRes.json();
      setDatasets(dsList);

      if (dsList.length === 0) {
        setSelectedDatasetId(null);
        setReport(null);
        setLoading(false);
        return;
      }

      // 2. Select dataset
      let targetId = location.state?.datasetId ? Number(location.state.datasetId) : selectedDatasetId;
      if (!targetId || !dsList.some(d => d.id === targetId)) {
        targetId = dsList[0].id;
      }
      setSelectedDatasetId(targetId);

      // 3. Fetch report
      await fetchReport(targetId);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error initializing reports');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [location.state?.datasetId]);

  const handleDatasetChange = (id: number) => {
    setSelectedDatasetId(id);
    fetchReport(id);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.dataset_name || 'dataset'}_report.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (val: number | null) => {
    if (val === null || val === undefined) return 'N/A';
    return `₹${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (val: number | null) => {
    if (val === null || val === undefined) return 'N/A';
    return val.toLocaleString();
  };

  const formatDate = (isoString: string | null) => {
    if (!isoString) return 'N/A';
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const qualityScore = report?.quality_score ?? report?.data_quality_score ?? null;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Executive Business Report</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Consolidated business performance, data quality, and automated intelligence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {datasets.length > 0 && (
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-brand dark:text-brand-light" />
              <select
                aria-label="Select Dataset"
                value={selectedDatasetId || ''}
                onChange={e => handleDatasetChange(Number(e.target.value))}
                className="text-xs sm:text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand shadow-sm"
              >
                {datasets.map(ds => (
                  <option key={ds.id} value={ds.id}>
                    {ds.original_filename} (ID: {ds.id})
                  </option>
                ))}
              </select>
              <button
                onClick={() => selectedDatasetId && fetchReport(selectedDatasetId)}
                title="Refresh Report"
                aria-label="Refresh Report"
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-brand dark:hover:text-brand-light transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}

          {report && (
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrint}
                className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button 
                onClick={handleExportJSON}
                className="flex items-center gap-1.5 bg-brand text-white px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold hover:bg-brand-dark transition-colors shadow-sm shadow-brand/20"
              >
                <Download className="w-4 h-4" />
                Export JSON
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
            Generating comprehensive report from quality, analytics, and insights services...
          </p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-rose-50 dark:bg-rose-500/10 rounded-2xl border border-rose-200 dark:border-rose-500/20 max-w-lg mx-auto">
          <AlertTriangle className="w-10 h-10 text-rose-500 mb-3" />
          <h4 className="text-base font-bold text-rose-800 dark:text-rose-200 mb-1">Failed to generate report</h4>
          <p className="text-sm text-rose-600 dark:text-rose-300 mb-5">{error}</p>
          <button 
            onClick={() => selectedDatasetId ? fetchReport(selectedDatasetId) : loadInitialData()}
            className="px-4 py-2 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition-colors shadow-sm"
          >
            Retry Report
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && !report && (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="w-16 h-16 bg-brand/10 dark:bg-brand/20 rounded-2xl flex items-center justify-center mb-4 text-brand dark:text-brand-light">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Reports Available</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mt-1 mb-6">
            Upload a CSV or Excel dataset to automatically synthesize data quality, commercial analytics, and automated insights.
          </p>
          <Link
            to="/app/upload"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand text-white text-sm font-bold rounded-xl hover:bg-brand-dark transition-colors shadow-md shadow-brand/20"
          >
            Upload Data <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Real Report View */}
      {!loading && !error && report && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
          {/* Dataset Summary Banner */}
          <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand/10 dark:bg-brand/20 flex items-center justify-center text-brand dark:text-brand-light">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Dataset Name</span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{report.dataset_name}</h3>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Uploaded: <strong>{formatDate(report.upload_date)}</strong></span>
              </div>
              <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                Ready & Analyzed
              </span>
            </div>
          </motion.div>

          {/* Section 1: Data Quality & Health Overview */}
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand" /> Data Quality & Scope
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Data Quality Score</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">
                    {qualityScore !== null ? `${qualityScore}%` : 'N/A'}
                  </span>
                  {qualityScore !== null && (
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                      qualityScore >= 80 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                      qualityScore >= 50 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' :
                      'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                    }`}>
                      {qualityScore >= 80 ? 'Good' : qualityScore >= 50 ? 'Fair' : 'Poor'}
                    </span>
                  )}
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Rows</p>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">{formatNumber(report.total_rows)}</span>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Columns</p>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">{formatNumber(report.total_columns)}</span>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Missing Values</p>
                <span className={`text-2xl font-bold ${
                  (report.missing_values || 0) > 0 ? 'text-amber-500' : 'text-slate-900 dark:text-white'
                }`}>
                  {formatNumber(report.missing_values)}
                </span>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Duplicate Rows</p>
                <span className={`text-2xl font-bold ${
                  (report.duplicate_rows || 0) > 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'
                }`}>
                  {formatNumber(report.duplicate_rows)}
                </span>
              </motion.div>
            </div>
          </div>

          {/* Section 2: Financial & Commercial Analytics */}
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" /> Commercial Performance
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Revenue</p>
                  <DollarSign className="w-4 h-4 text-brand" />
                </div>
                <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(report.total_revenue)}
                </span>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Orders</p>
                  <ShoppingCart className="w-4 h-4 text-primary-500" />
                </div>
                <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {formatNumber(report.total_orders)}
                </span>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Quantity</p>
                  <Package className="w-4 h-4 text-amber-500" />
                </div>
                <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {formatNumber(report.total_quantity)}
                </span>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Returns</p>
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                </div>
                <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {formatNumber(report.total_returns)}
                </span>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Order Value</p>
                  <DollarSign className="w-4 h-4 text-teal-500" />
                </div>
                <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(report.average_order_value)}
                </span>
              </motion.div>
            </div>
          </div>

          {/* Section 3: Rankings (Top Products, Categories, Cities) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Top Products */}
            <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center gap-2">
                <Package className="w-4 h-4 text-brand" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Top Products</h4>
              </div>
              <div className="p-4 flex-1">
                {report.top_products && report.top_products.length > 0 ? (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {report.top_products.map((item, idx) => (
                      <li key={idx} className="py-2.5 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                          {idx + 1}. {item.name}
                        </span>
                        <span className="font-bold text-brand dark:text-brand-light whitespace-nowrap">
                          {formatCurrency(item.value)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400 py-6 text-center">No product data available</p>
                )}
              </div>
            </motion.div>

            {/* Top Categories */}
            <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary-500" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Top Categories</h4>
              </div>
              <div className="p-4 flex-1">
                {report.top_categories && report.top_categories.length > 0 ? (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {report.top_categories.map((item, idx) => (
                      <li key={idx} className="py-2.5 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                          {idx + 1}. {item.name}
                        </span>
                        <span className="font-bold text-primary-500 dark:text-primary-400 whitespace-nowrap">
                          {formatCurrency(item.value)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400 py-6 text-center">No category data available</p>
                )}
              </div>
            </motion.div>

            {/* Top Cities */}
            <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Top Cities</h4>
              </div>
              <div className="p-4 flex-1">
                {report.top_cities && report.top_cities.length > 0 ? (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {report.top_cities.map((item, idx) => (
                      <li key={idx} className="py-2.5 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                          {idx + 1}. {item.name}
                        </span>
                        <span className="font-bold text-rose-500 dark:text-rose-400 whitespace-nowrap">
                          {formatCurrency(item.value)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400 py-6 text-center">No city data available</p>
                )}
              </div>
            </motion.div>
          </div>

          {/* Section 4: Automated Insights */}
          <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" /> Automated Intelligence & Insights
            </h3>

            {report.automated_insights && report.automated_insights.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.automated_insights.map((ins, idx) => (
                  <div 
                    key={ins.id || idx}
                    className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <h5 className="font-bold text-sm text-slate-900 dark:text-white">{ins.title}</h5>
                        <div className="flex items-center gap-1.5">
                          {ins.value && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                              {ins.value}
                            </span>
                          )}
                          {ins.severity && (
                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                              ins.severity === 'success' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                              ins.severity === 'warning' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' :
                              ins.severity === 'High' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300' :
                              'bg-brand/10 dark:bg-brand/20 text-brand dark:text-brand-light'
                            }`}>
                              {ins.severity}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">{ins.description}</p>
                    </div>

                    {ins.recommendation && (
                      <div className="mt-2 text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                        <span className="font-semibold text-brand dark:text-brand-light">Action: </span>
                        <span className="text-slate-700 dark:text-slate-300">{ins.recommendation}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-6 text-center">No automated insights available for this dataset.</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
