import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ShieldCheck, AlertTriangle, ShieldAlert, CheckCircle, Info, Database, Hash, List, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import AnimatedCount from '../components/AnimatedCount';
import { API_BASE_URL } from '../config';
import { authFetch } from '../utils/api';

const container: any = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.01 }
  }
};

const item: any = {
  hidden: { opacity: 0, y: 2 },
  show: { opacity: 1, y: 0, transition: { duration: 0.1, ease: 'easeOut' } }
};

export default function DataQualityPage() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qualityData, setQualityData] = useState<any>(null);
  const [currentDatasetId, setCurrentDatasetId] = useState<number | null>(null);
  const [fixingIssueId, setFixingIssueId] = useState<string | null>(null);
  const [fixMessage, setFixMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  useEffect(() => {
    const fetchQualityData = async () => {
      try {
        setLoading(true);
        let datasetId = location.state?.datasetId;

        if (!datasetId) {
          // Fetch latest dataset if no ID provided in state
          const datasetsResponse = await authFetch(`${API_BASE_URL}/api/datasets`);
          if (!datasetsResponse.ok) throw new Error('Failed to fetch datasets');
          const datasets = await datasetsResponse.json();
          if (datasets.length > 0) {
            datasetId = datasets[0].id;
          } else {
            setError('No datasets available. Please upload a dataset first.');
            setLoading(false);
            return;
          }
        }

        const qualityResponse = await authFetch(`${API_BASE_URL}/api/datasets/${datasetId}/quality`);
        if (!qualityResponse.ok) throw new Error('Failed to fetch quality data. Ensure the dataset has been processed.');
        const data = await qualityResponse.json();
        setQualityData(data);
        setCurrentDatasetId(datasetId);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQualityData();
  }, [location.state]);

  const handleApplyFix = async (issue: any) => {
    if (!currentDatasetId) return;
    try {
      setFixingIssueId(issue.id);
      setFixMessage(null);
      
      const response = await authFetch(`${API_BASE_URL}/api/datasets/${currentDatasetId}/fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issue_id: issue.id,
          issue_type: issue.type,
          column: issue.column
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to apply fix');
      }

      setFixMessage({ type: 'success', text: `Successfully fixed: ${issue.type}` });
      
      // Refresh data
      const qualityResponse = await authFetch(`${API_BASE_URL}/api/datasets/${currentDatasetId}/quality`);
      if (qualityResponse.ok) {
        const data = await qualityResponse.json();
        setQualityData(data);
      }
    } catch (err: any) {
      setFixMessage({ type: 'error', text: err.message });
    } finally {
      setFixingIssueId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-rose-500">
        <AlertTriangle className="w-6 h-6 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  if (!qualityData) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Data Quality</h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Review issues found during the automated data cleaning process.</p>
      </div>

      {fixMessage && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          fixMessage.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-400'
        }`}>
          {fixMessage.type === 'success' ? <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />}
          <p className="text-sm font-medium">{fixMessage.text}</p>
        </div>
      )}

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <motion.div variants={item} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center xl:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-brand" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Quality Score</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              <AnimatedCount value={qualityData.quality_score} duration={1.5} />
            </span>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-500">/ 100</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: `${qualityData.quality_score}%` }} 
              transition={{ duration: 0.5, ease: "easeOut" }} 
              className="bg-brand h-full rounded-full" 
            />
          </div>
        </motion.div>

        {[
          { label: 'Total Rows', value: qualityData.total_rows, icon: Info, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/10' },
          { label: 'Total Columns', value: qualityData.total_columns, icon: Database, color: 'text-indigo-500 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-500/10' },
          { label: 'Missing Values', value: qualityData.missing_values, icon: AlertTriangle, color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-500/10' },
          { label: 'Duplicate Rows', value: qualityData.duplicate_rows, icon: ShieldAlert, color: 'text-rose-500 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-500/10' },
          { label: 'Numeric Cols', value: qualityData.numeric_columns, icon: Hash, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/10' },
          { label: 'Categorical Cols', value: qualityData.categorical_columns, icon: List, color: 'text-purple-500 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-500/10' },
        ].map((stat, i) => (
          <motion.div variants={item} key={i} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${stat.bg}`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 truncate">{stat.label}</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white truncate">
              <AnimatedCount value={stat.value as number} formatter={(v) => v.toLocaleString()} />
            </h3>
          </motion.div>
        ))}
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, y: 2 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.1 }}
        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Dataset Columns</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-950/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Column Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Data Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Missing Values</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Unique Values</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
              {qualityData.column_summary.map((col: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{col.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{col.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                    <span className={col.missing_count > 0 ? "text-amber-500 font-semibold" : ""}>
                      {col.missing_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{col.unique_count}</td>
                </tr>
              ))}
              {qualityData.column_summary.length === 0 && (
                 <tr>
                 <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                   No column data available.
                 </td>
               </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 2 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.1 }}
        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Identified Issues</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-950/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Issue Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Column / Field</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Row Index</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Severity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Suggested Fix</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
              {qualityData.identified_issues.map((issue: any) => (
                <tr key={issue.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{issue.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{issue.column}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{issue.row}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      issue.severity === 'High' ? 'bg-rose-100 dark:bg-rose-500/10 text-rose-800 dark:text-rose-400' :
                      issue.severity === 'Medium' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400' :
                      'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300'
                    }`}>
                      {issue.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{issue.suggestedFix}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={() => handleApplyFix(issue)}
                      disabled={fixingIssueId === issue.id}
                      className="text-brand dark:text-brand-light hover:text-brand-dark dark:hover:text-white flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {fixingIssueId === issue.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      {fixingIssueId === issue.id ? 'Fixing...' : 'Apply Fix'}
                    </button>
                  </td>
                </tr>
              ))}
              {qualityData.identified_issues.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    No issues identified. Your data looks good!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
