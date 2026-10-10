import os

NEW_HISTORY_PAGE = """import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Activity, Database, FileText, Calendar, TrendingUp, AlertTriangle, Lightbulb, Search, Filter, ShieldCheck, Trash2, X, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';
import { authFetch } from '../utils/api';

interface ActivityLog {
  id: number;
  dataset_id: number;
  dataset_filename: string;
  activity_type: string;
  status: string;
  summary_metrics: string; // JSON string
  created_at: string;
}

interface DatasetHistory {
  id: number;
  original_filename: string;
  file_size: number;
  row_count: number;
  column_count: number;
  uploaded_at: string;
  status: string;
}

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 5 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } }
};

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState<'activity' | 'dataset'>('activity');
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [datasets, setDatasets] = useState<DatasetHistory[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{type: 'activity' | 'dataset' | 'all_activities', id?: number, name?: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const [resActivities, resDatasets] = await Promise.all([
        authFetch(`${API_BASE_URL}/api/history/activities`),
        authFetch(`${API_BASE_URL}/api/history/datasets`)
      ]);
      
      if (!resActivities.ok) throw new Error('Failed to load activity history');
      if (!resDatasets.ok) throw new Error('Failed to load dataset history');
      
      const actData = await resActivities.json();
      const dsData = await resDatasets.json();
      
      setActivities(actData);
      setDatasets(dsData);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching history');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (type: 'activity' | 'dataset' | 'all_activities', id?: number, name?: string) => {
    setDeleteTarget({ type, id, name });
    setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (deleteTarget.type === 'activity') {
        const res = await authFetch(`${API_BASE_URL}/api/history/activities/${deleteTarget.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete activity log');
        setActivities(activities.filter(a => a.id !== deleteTarget.id));
        setSuccessMsg('Activity log deleted successfully');
      } else if (deleteTarget.type === 'all_activities') {
        const res = await authFetch(`${API_BASE_URL}/api/history/activities`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to clear activity history');
        setActivities([]);
        setSuccessMsg('All activity history cleared successfully');
      } else if (deleteTarget.type === 'dataset') {
        const res = await authFetch(`${API_BASE_URL}/api/datasets/${deleteTarget.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete dataset');
        setDatasets(datasets.filter(d => d.id !== deleteTarget.id));
        setActivities(activities.filter(a => a.dataset_id !== deleteTarget.id));
        setSuccessMsg('Dataset and associated history deleted successfully');
      }
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Error deleting item');
      setIsDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getIconForActivity = (type: string) => {
    switch(type) {
      case 'Upload': return <Database className="w-5 h-5 text-blue-500" />;
      case 'Data Quality': return <ShieldCheck className="w-5 h-5 text-brand" />;
      case 'Analytics': return <TrendingUp className="w-5 h-5 text-emerald-500" />;
      case 'Insights': return <Lightbulb className="w-5 h-5 text-amber-500" />;
      case 'Report': return <FileText className="w-5 h-5 text-indigo-500" />;
      case 'AI Query': return <Activity className="w-5 h-5 text-purple-500" />;
      case 'Data Cleaning': return <AlertTriangle className="w-5 h-5 text-rose-500" />;
      default: return <Activity className="w-5 h-5 text-slate-500" />;
    }
  };

  const parseMetrics = (metricsStr: string | null) => {
    if (!metricsStr) return null;
    try {
      return JSON.parse(metricsStr);
    } catch {
      return null;
    }
  };

  const renderSummary = (type: string, metrics: any) => {
    if (!metrics) return null;
    switch(type) {
      case 'Upload': return `Rows: ${metrics.row_count || 0} | Cols: ${metrics.column_count || 0}`;
      case 'Data Quality': return `Score: ${metrics.score || 'N/A'}`;
      case 'Analytics': return `Revenue: ₹${metrics.revenue?.toLocaleString() || 0}`;
      case 'Insights': return `Generated ${metrics.insights_generated || 0} insights`;
      case 'AI Query': return `Q: "${metrics.question || ''}"`;
      case 'Data Cleaning': return metrics.error ? `Failed to fix ${metrics.issue_type}` : `Fixed ${metrics.issue_type}`;
      case 'Report': return `Quality Score: ${metrics.quality_score || 'N/A'}, Revenue: ₹${metrics.total_revenue?.toLocaleString() || 0}`;
      default: return null;
    }
  };

  const filteredActivities = activities.filter(a => {
    const matchesSearch = (a.dataset_filename || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'All' || a.activity_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const filteredDatasets = datasets.filter(d => 
    (d.original_filename || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">History & Assets</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Manage your past datasets and analysis activity.
          </p>
        </div>
        {activeTab === 'activity' && activities.length > 0 && (
          <button
            onClick={() => confirmDelete('all_activities')}
            className="px-4 py-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium rounded-xl hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors flex items-center gap-2 text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Clear Activity History
          </button>
        )}
      </div>

      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 p-4 rounded-xl flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
          <CheckCircle className="w-5 h-5" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 dark:bg-rose-500/10 p-4 rounded-xl border border-rose-100 dark:border-rose-500/20 flex items-center gap-3 text-rose-700 dark:text-rose-400">
          <AlertTriangle className="w-5 h-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('activity')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'activity' ? 'bg-white dark:bg-slate-700 text-brand shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          Activity History
        </button>
        <button 
          onClick={() => setActiveTab('dataset')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dataset' ? 'bg-white dark:bg-slate-700 text-brand shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          Datasets
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        {activeTab === 'activity' && (
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand appearance-none min-w-[150px]"
            >
              <option value="All">All Activities</option>
              <option value="Upload">Uploads</option>
              <option value="Data Quality">Data Quality</option>
              <option value="Analytics">Analytics</option>
              <option value="Insights">Insights</option>
              <option value="Report">Reports</option>
              <option value="AI Query">AI Queries</option>
              <option value="Data Cleaning">Data Cleaning</option>
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-slate-500 dark:text-slate-400 text-sm font-medium">Loading...</p>
        </div>
      ) : activeTab === 'activity' ? (
        filteredActivities.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-100 dark:border-slate-800 text-center shadow-sm">
            <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No history found</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
              {searchQuery || filterType !== 'All' 
                ? "No activities match your current filters. Try adjusting them."
                : "You haven't analyzed any datasets yet. Upload a dataset to get started."}
            </p>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredActivities.map((activity) => (
                <motion.li key={activity.id} variants={itemVariants} className="p-4 sm:p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                    
                    <div className="flex items-start gap-4">
                      <div className="mt-1 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        {getIconForActivity(activity.activity_type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {activity.activity_type}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            activity.status === 'success' 
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' 
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                          }`}>
                            {activity.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" />
                          {formatDate(activity.created_at)}
                        </p>
                        <div className="mt-2 text-sm text-slate-700 dark:text-slate-300 flex flex-col gap-1">
                          <span><span className="text-slate-400">Dataset:</span> <span className="font-medium">{activity.dataset_filename || `ID: ${activity.dataset_id}`}</span></span>
                          
                          {activity.summary_metrics && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded w-fit mt-1">
                              {renderSummary(activity.activity_type, parseMetrics(activity.summary_metrics))}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
  
                    <div className="flex items-center justify-end gap-3">
                      {activity.activity_type === 'Report' && activity.dataset_id ? (
                        <Link
                          to="/app/reports"
                          state={{ datasetId: activity.dataset_id }}
                          className="px-4 py-2 bg-brand/10 text-brand dark:text-brand-light text-xs font-bold rounded-xl hover:bg-brand/20 transition-colors"
                        >
                          View Report
                        </Link>
                      ) : activity.dataset_id ? (
                        <Link
                          to="/app/datasets"
                          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          Go to Dataset
                        </Link>
                      ) : null}
                      <button
                        onClick={() => confirmDelete('activity', activity.id, activity.activity_type)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
  
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )
      ) : (
        filteredDatasets.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-100 dark:border-slate-800 text-center shadow-sm">
            <Database className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No datasets found</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
              You haven't uploaded any datasets yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDatasets.map(ds => (
              <div key={ds.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-brand/30 transition-colors">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                        <Database className="w-5 h-5 text-blue-500" />
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white truncate" title={ds.original_filename}>
                        {ds.original_filename}
                      </h4>
                    </div>
                    <button
                      onClick={() => confirmDelete('dataset', ds.id, ds.original_filename)}
                      className="text-slate-400 hover:text-rose-500 transition-colors"
                      title="Delete dataset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDate(ds.uploaded_at)}</span>
                    <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {(ds.file_size / 1024).toFixed(1)} KB</span>
                    <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> {ds.row_count || 0} rows</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <AnimatePresence>
        {isDeleteModalOpen && deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md p-6 rounded-3xl shadow-xl relative z-10 border border-slate-100 dark:border-slate-800"
            >
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="mb-6 flex gap-4 items-start">
                <div className="p-3 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                    {deleteTarget.type === 'all_activities' ? 'Clear Activity History?' 
                      : deleteTarget.type === 'dataset' ? 'Delete Dataset?' 
                      : 'Delete Activity Record?'}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                    {deleteTarget.type === 'all_activities' 
                      ? 'This will permanently remove all your activity logs. This does NOT delete your actual uploaded datasets.'
                      : deleteTarget.type === 'dataset'
                      ? `This will permanently delete the dataset "${deleteTarget.name}". Any history logs and saved reports associated with this dataset will also be removed.`
                      : `This will remove this ${deleteTarget.name} record from your history. The original dataset will NOT be deleted.`
                    }
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isDeleting}
                  className="px-5 py-2.5 rounded-xl font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={executeDelete}
                  disabled={isDeleting}
                  className="px-5 py-2.5 rounded-xl font-medium bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/20 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting...</>
                  ) : (
                    'Yes, Delete'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
"""

with open('src/pages/HistoryPage.tsx', 'w', encoding='utf-8') as f:
    f.write(NEW_HISTORY_PAGE)
