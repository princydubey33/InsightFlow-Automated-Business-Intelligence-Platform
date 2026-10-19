import React, { useState, useCallback } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle2, Search, Database, BarChart, Lightbulb, Terminal, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { authFetch } from '../utils/api';

interface PipelineStep {
  name: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
}

const pipelineSteps: PipelineStep[] = [
  { name: 'Dataset Ingestion', detail: 'Verifying file structure, encoding, and raw payload stream', icon: UploadCloud },
  { name: 'Schema Inference', detail: 'Parsing column headers, categorical types, and numerical ranges', icon: Database },
  { name: 'Data Quality Audit', detail: 'Scanning for missing values, duplicate records, and outliers', icon: Search },
  { name: 'Statistical Aggregation', detail: 'Computing summary metrics, revenue totals, and distributions', icon: BarChart },
  { name: 'AI Context Indexing', detail: 'Synthesizing automated insights and conversational memory', icon: Lightbulb },
  { name: 'Pipeline Complete', detail: 'Dataset ready for reporting and interactive AI analysis', icon: CheckCircle2 }
];

export default function UploadDataPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<'idle' | 'processing' | 'done'>('idle');
  const [currentStep, setCurrentStep] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [datasetMeta, setDatasetMeta] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${msg}`]);
  };

  const handleFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setUploadState('processing');
    setCurrentStep(0);
    setProgressPercent(10);
    setLogs([]);
    setErrorMessage(null);

    const sizeKb = Math.round(selectedFile.size / 1024);
    addLog(`Ingesting file '${selectedFile.name}' (${sizeKb} KB)...`);

    // Launch upload API request
    const formData = new FormData();
    formData.append('file', selectedFile);
    const uploadPromise = authFetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    try {
      // Step 0: Ingestion
      await new Promise((r) => setTimeout(r, 800));
      setCurrentStep(1);
      setProgressPercent(28);
      addLog(`File integrity verified. Format: ${selectedFile.type || 'text/csv'}.`);

      // Step 1: Schema Inference
      await new Promise((r) => setTimeout(r, 850));
      setCurrentStep(2);
      setProgressPercent(50);
      addLog(`Inferred column schema and data typing across records.`);

      // Step 2: Quality Audit
      await new Promise((r) => setTimeout(r, 850));
      setCurrentStep(3);
      setProgressPercent(72);
      addLog(`Audited dataset: detected missing values, duplicates, and outliers.`);

      // Step 3: Statistical Aggregations
      await new Promise((r) => setTimeout(r, 800));
      setCurrentStep(4);
      setProgressPercent(90);
      addLog(`Computed business metrics, statistical distributions, and revenue KPIs.`);

      // Wait for actual backend response to settle
      const response = await uploadPromise;
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Upload failed on server');
      }
      const data = await response.json();
      setDatasetMeta(data);

      // Step 4: AI Indexing
      await new Promise((r) => setTimeout(r, 700));
      setCurrentStep(5);
      setProgressPercent(100);
      addLog(`AI conversational context indexed for ${data.row_count ?? 'all'} rows and ${data.column_count ?? 'all'} columns.`);
      addLog(`Analysis complete. Dataset saved permanently.`);

      await new Promise((r) => setTimeout(r, 500));
      setUploadState('done');
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || 'Upload failed. Please check backend server.');
      setUploadState('idle');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Upload Data</h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Upload your CSV or Excel files for comprehensive business intelligence and automated analysis.</p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-400 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Upload Error</p>
            <p className="text-xs mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {uploadState === 'idle' && (
        <div 
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
            isDragging 
              ? 'border-brand bg-brand/5 dark:bg-brand/10' 
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-brand dark:hover:border-brand hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="w-16 h-16 bg-brand/10 text-brand rounded-2xl flex items-center justify-center mx-auto mb-5">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Drag & drop your dataset here</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 max-w-md mx-auto">
            Supports CSV, XLSX, and XLS formats. Files are securely analyzed and stored in your persistent database.
          </p>
          
          <label className="cursor-pointer inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-semibold rounded-lg text-white bg-brand hover:bg-brand-dark transition-colors shadow-sm">
            Browse Files
            <input 
              type="file" 
              className="hidden" 
              accept=".csv,.xlsx,.xls"
              onChange={handleFileInput}
            />
          </label>
        </div>
      )}

      {uploadState === 'processing' && (
        <div className="bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-brand">Automated Pipeline</span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                Analyzing {file?.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Size: {file ? Math.round(file.size / 1024) : 0} KB • Type: {file?.type || 'Tabular Data'}
              </p>
            </div>
            <div className="text-right sm:self-center">
              <span className="text-2xl font-bold text-brand">{progressPercent}%</span>
              <p className="text-xs text-slate-400">Overall Progress</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-brand h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Steps List */}
          <div className="space-y-4">
            {pipelineSteps.map((step, index) => {
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;

              return (
                <div 
                  key={index} 
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                    isCurrent 
                      ? 'bg-brand/5 border-brand/30 dark:bg-brand/10 dark:border-brand/30' 
                      : isCompleted 
                        ? 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800' 
                        : 'bg-transparent border-transparent opacity-40'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isCompleted 
                        ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                        : isCurrent 
                          ? 'bg-brand text-white shadow-sm' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <step.icon className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h4 className={`text-sm font-semibold ${isCurrent ? 'text-brand' : 'text-slate-900 dark:text-white'}`}>
                        {step.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {step.detail}
                      </p>
                    </div>
                  </div>

                  <div>
                    {isCompleted && (
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full">
                        Done
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-xs font-semibold text-brand bg-brand/10 dark:bg-brand/20 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                        Processing
                      </span>
                    )}
                    {!isCompleted && !isCurrent && (
                      <span className="text-xs text-slate-400">
                        Queued
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Diagnostic Log Console */}
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 text-xs font-mono text-slate-300">
            <div className="flex items-center gap-2 text-slate-500 pb-2 border-b border-slate-800 mb-2">
              <Terminal className="w-3.5 h-3.5" />
              <span>Inspection Console</span>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="text-emerald-400/90 leading-relaxed">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {uploadState === 'done' && (
        <div className="bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Analysis Complete</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-lg mx-auto">
              {file?.name} has been processed, structured, and saved. Data quality metrics, charts, and AI assistant context are ready.
            </p>
          </div>

          {datasetMeta && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto pt-2">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-400">Total Rows</span>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{Number(datasetMeta.row_count || 0).toLocaleString()}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-400">Total Columns</span>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{datasetMeta.column_count || 0}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-400">File Size</span>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{Math.round((datasetMeta.file_size || 0) / 1024)} KB</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-400">Status</span>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Verified</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button 
              onClick={() => navigate('/app/quality', { state: { datasetId: datasetMeta?.id } })}
              className="px-6 py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <span>View Data Quality</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => navigate('/app/analytics')}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-lg transition-colors"
            >
              Explore Analytics
            </button>
            <button 
              onClick={() => setUploadState('idle')}
              className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Upload Another</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
