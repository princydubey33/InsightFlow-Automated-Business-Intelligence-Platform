import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Activity, Database, FileText, Calendar, TrendingUp, AlertTriangle, Lightbulb, Search, Filter, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
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
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await authFetch(`${API_BASE_URL}/api/history/activities`);
        if (!res.ok) throw new Error('Failed to load history');
        const data = await res.json();
        setActivities(data);
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching history');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

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

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Dataset & Analysis History</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Track your dataset uploads, quality reports, commercial analytics, and AI queries.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by dataset filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
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
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-slate-500 dark:text-slate-400 text-sm font-medium">Loading history...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 dark:bg-rose-500/10 p-6 rounded-2xl border border-rose-100 dark:border-rose-500/20 text-center">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-3" />
          <p className="text-rose-700 dark:text-rose-400 font-medium">{error}</p>
        </div>
      ) : filteredActivities.length === 0 ? (
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

                  <div className="flex justify-end">
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
                  </div>

                </div>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
}
