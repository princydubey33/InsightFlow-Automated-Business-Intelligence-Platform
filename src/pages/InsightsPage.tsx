import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  Lightbulb, 
  AlertTriangle, 
  Send, 
  Sparkles, 
  TrendingUp, 
  RefreshCw, 
  Database,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

interface InsightItem {
  id?: string | number;
  type?: string;
  title: string;
  description: string;
  value?: string | number | null;
  severity?: string;
  recommendation?: string;
}

interface Dataset {
  id: number;
  original_filename: string;
  filename: string;
  file_type: string;
  file_size: number;
  row_count: number;
  column_count: number;
  status: string;
  uploaded_at: string;
}

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 }
  }
};

const cardVariants: any = {
  hidden: { opacity: 0, y: 2 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.1, ease: 'easeOut' } }
};

const chatVariants: any = {
  hidden: { opacity: 0, scale: 0.95, y: 2 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.1, ease: 'easeOut' } }
};

const TypingIndicator = () => (
  <div className="flex gap-1 items-center p-2">
    <motion.div  transition={{ duration: 0.6, repeat: 0, delay: 0 }} className="w-1.5 h-1.5 bg-brand rounded-full" />
    <motion.div  transition={{ duration: 0.6, repeat: 0, delay: 0.2 }} className="w-1.5 h-1.5 bg-brand rounded-full" />
    <motion.div  transition={{ duration: 0.6, repeat: 0, delay: 0.4 }} className="w-1.5 h-1.5 bg-brand rounded-full" />
  </div>
);

const getSeverityConfig = (severity?: string, type?: string) => {
  const sev = (severity || '').toLowerCase();
  const typ = (type || '').toLowerCase();

  if (sev === 'high' || sev === 'error' || typ === 'error') {
    return {
      icon: AlertTriangle,
      iconClass: 'bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-200/50 dark:border-rose-500/20',
      badgeClass: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30',
      label: 'High'
    };
  }
  if (sev === 'warning' || sev === 'medium' || typ === 'warning') {
    return {
      icon: AlertTriangle,
      iconClass: 'bg-amber-50 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20',
      badgeClass: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30',
      label: sev === 'medium' ? 'Medium' : 'Warning'
    };
  }
  if (sev === 'success' || typ === 'trend') {
    return {
      icon: TrendingUp,
      iconClass: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30',
      label: 'Success'
    };
  }
  return {
    icon: Lightbulb,
    iconClass: 'bg-brand/10 dark:bg-brand/20 text-brand dark:text-brand-light border border-brand/20',
    badgeClass: 'bg-brand/10 dark:bg-brand/20 text-brand dark:text-brand-light border border-brand/20',
    label: 'Info'
  };
};

export default function InsightsPage() {
  const location = useLocation();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(
    location.state?.datasetId ? Number(location.state.datasetId) : null
  );
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Chat UI state connected to real POST /api/datasets/{id}/ask API
  const [query, setQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chat, setChat] = useState<{ role: 'user' | 'ai'; text: string; sources?: string[] }[]>([
    { 
      role: 'ai', 
      text: 'Hello! I am your InsightFlow AI assistant. Ask me anything about your dataset (e.g. "What is the total revenue?", "Which product has the highest revenue?").' 
    }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchInsightsForDataset = async (datasetId: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/api/datasets/${datasetId}/insights`);
      if (!res.ok) {
        throw new Error(`Failed to fetch insights (Status: ${res.status})`);
      }
      const data = await res.json();
      setInsights(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch insights from backend');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch available datasets
      const dsRes = await fetch(`${API_BASE_URL}/api/datasets`);
      if (!dsRes.ok) throw new Error('Failed to fetch datasets list');
      const dsList: Dataset[] = await dsRes.json();
      setDatasets(dsList);

      if (dsList.length === 0) {
        setSelectedDatasetId(null);
        setInsights([]);
        setLoading(false);
        return;
      }

      // 2. Select target dataset (from navigation state or default to latest)
      let targetId = location.state?.datasetId ? Number(location.state.datasetId) : selectedDatasetId;
      if (!targetId || !dsList.some(d => d.id === targetId)) {
        targetId = dsList[0].id;
      }
      setSelectedDatasetId(targetId);

      // 3. Fetch insights
      await fetchInsightsForDataset(targetId);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading automated insights');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [location.state?.datasetId]);

  const handleDatasetChange = (newId: number) => {
    setSelectedDatasetId(newId);
    fetchInsightsForDataset(newId);
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat, isTyping]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    const userQuestion = query.trim();
    if (!userQuestion || isTyping) return;

    if (!selectedDatasetId) {
      setChat(prev => [
        ...prev,
        { role: 'user', text: userQuestion },
        { role: 'ai', text: 'Please upload or select a dataset first so I can analyze it for you.' }
      ]);
      setQuery('');
      return;
    }

    setChat(prev => [...prev, { role: 'user', text: userQuestion }]);
    setQuery('');
    setIsTyping(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/datasets/${selectedDatasetId}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          question: userQuestion,
          history: chat.map(msg => ({
            role: msg.role === 'ai' ? 'assistant' : 'user',
            content: msg.text
          }))
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server returned error (${res.status})`);
      }

      const data = await res.json();
      const answerText = data.answer || "No response received.";
      const sources = Array.isArray(data.sources) && data.sources.length > 0 ? data.sources : undefined;

      setChat(prev => [
        ...prev,
        {
          role: 'ai',
          text: answerText,
          sources: sources
        }
      ]);
    } catch (err: any) {
      console.error(err);
      setChat(prev => [
        ...prev,
        {
          role: 'ai',
          text: `Sorry, I encountered an issue analyzing your request: ${err.message || 'Please check that the backend server is running.'}`
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      {/* Left Column: Automated Insights */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">AI-Powered Insights</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              Automated business insights derived from your latest data.
            </p>
          </div>

          {datasets.length > 0 && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
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
                onClick={() => selectedDatasetId && fetchInsightsForDataset(selectedDatasetId)}
                title="Refresh Insights"
                aria-label="Refresh Insights"
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-brand dark:hover:text-brand-light transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
              Analyzing dataset and generating insights...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center p-8 text-center bg-rose-50 dark:bg-rose-500/10 rounded-2xl border border-rose-200 dark:border-rose-500/20 max-w-lg mx-auto">
            <AlertTriangle className="w-10 h-10 text-rose-500 mb-3" />
            <h4 className="text-base font-bold text-rose-800 dark:text-rose-200 mb-1">Failed to load insights</h4>
            <p className="text-sm text-rose-600 dark:text-rose-300 mb-5">{error}</p>
            <button 
              onClick={() => selectedDatasetId ? fetchInsightsForDataset(selectedDatasetId) : loadData()}
              className="px-4 py-2 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition-colors shadow-sm"
            >
              Retry Loading
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && insights.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="w-16 h-16 bg-brand/10 dark:bg-brand/20 rounded-2xl flex items-center justify-center mb-4 text-brand dark:text-brand-light">
              <Lightbulb className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Insights Available</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mt-1 mb-6">
              {datasets.length === 0 
                ? "You haven't uploaded any datasets yet. Upload a CSV or Excel file to get automated AI insights."
                : "No automated insights could be derived for the selected dataset. Try uploading a sales or tabular dataset."
              }
            </p>
            <Link
              to="/app/upload"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand text-white text-sm font-bold rounded-xl hover:bg-brand-dark transition-colors shadow-md shadow-brand/20"
            >
              Upload Data <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Real Insights List */}
        {!loading && !error && insights.length > 0 && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid gap-4">
            {insights.map((insight, idx) => {
              const config = getSeverityConfig(insight.severity, insight.type);
              const IconComponent = config.icon;

              return (
                <motion.div 
                  key={insight.id || `${insight.title}-${idx}`} 
                  variants={cardVariants} 
                  className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex gap-4">
                    <motion.div 
                      
                      className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${config.iconClass}`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </motion.div>
                    <div className="w-full">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          {insight.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          {insight.value && (
                            <span className="text-xs sm:text-sm font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                              {insight.value}
                            </span>
                          )}
                          {insight.severity && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${config.badgeClass}`}>
                              {config.label}
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
                        {insight.description}
                      </p>
                      
                      {insight.recommendation && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          transition={{ delay: 0.1, duration: 0.1 }}
                          className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-800 overflow-hidden"
                        >
                          <p className="text-sm">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Recommended Action: </span>
                            <span className="text-slate-600 dark:text-slate-400">{insight.recommendation}</span>
                          </p>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Right Column: Ask Your Data UI connected to real backend API */}
      <div className="w-full lg:w-96 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden h-full">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0, repeat: 0, ease: 'linear' }}>
              <Sparkles className="w-5 h-5 text-brand" />
            </motion.div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Ask Your Data</h3>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live AI
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence initial={false}>
            {chat.map((msg, i) => (
              <motion.div 
                key={i} 
                variants={chatVariants}
                initial="hidden"
                animate="visible"
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-brand text-white rounded-tr-sm' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm shadow-sm border border-slate-100 dark:border-slate-700/50'
                }`}>
                  <p className="whitespace-pre-line">{msg.text}</p>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 pt-1.5 border-t border-slate-200/80 dark:border-slate-700/80 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">Sources: </span>
                      {msg.sources.join(', ')}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            {isTyping && (
              <motion.div 
                key="typing"
                variants={chatVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex justify-start"
              >
                <div className="max-w-[85%] p-3 rounded-2xl text-sm bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm border border-slate-100 dark:border-slate-700/50">
                  <TypingIndicator />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <form onSubmit={handleAsk} className="relative">
            <input 
              type="text" 
              value={query}
              onChange={e => setQuery(e.target.value)}
              disabled={isTyping}
              placeholder={isTyping ? "AI is analyzing your dataset..." : "Ask a question about your data..."} 
              className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-full focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white dark:focus:bg-slate-900 transition-all text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-inner disabled:opacity-60"
            />
            <button 
              type="submit"
              disabled={!query.trim() || isTyping}
              aria-label="Send query"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-brand text-white rounded-full flex items-center justify-center hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
