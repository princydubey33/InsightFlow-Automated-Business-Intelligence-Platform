import React, { useState, useCallback } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle2, Search, Database, BarChart, Lightbulb } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

const steps = [
  { name: 'Uploading', icon: UploadCloud },
  { name: 'Cleaning Data', icon: Database },
  { name: 'Validating Data', icon: Search },
  { name: 'Analyzing Data', icon: BarChart },
  { name: 'Generating Dashboard', icon: FileSpreadsheet },
  { name: 'Finding Insights', icon: Lightbulb },
  { name: 'Complete', icon: CheckCircle2 }
];

export default function UploadDataPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<'idle' | 'processing' | 'done'>('idle');
  const [currentStep, setCurrentStep] = useState(0);
  const [datasetId, setDatasetId] = useState<number | null>(null);
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

  const handleFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setUploadState('processing');
    setCurrentStep(0);
    
    // Quick progress simulation for UI
    const stepDuration = 500;
    const progressInterval = setInterval(() => {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 2));
    }, stepDuration);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setDatasetId(data.id);

      clearInterval(progressInterval);
      setCurrentStep(steps.length - 1);
      setTimeout(() => setUploadState('done'), 800);
    } catch (error) {
      console.error(error);
      clearInterval(progressInterval);
      setUploadState('idle');
      alert('Upload failed. Please check backend server.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -2 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.1 }}>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Upload Data</h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Upload your CSV or Excel files for automated analysis.</p>
      </motion.div>

      <AnimatePresence mode="wait">
        {uploadState === 'idle' && (
          <motion.div 
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className={`mt-8 border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
              isDragging ? 'border-brand bg-primary-50 dark:bg-brand/10' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-brand dark:hover:border-brand hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <motion.div 
              animate={{ y: isDragging ? -10 : 0, scale: isDragging ? 1.1 : 1 }}
              className="w-20 h-20 bg-primary-50 dark:bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <UploadCloud className="w-10 h-10 text-brand" />
            </motion.div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Drag & drop your file here</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8">Support for CSV, XLSX, and XLS files up to 50MB</p>
            
            <label className="cursor-pointer inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-brand hover:bg-brand-dark transition-colors shadow-sm">
              Browse Files
              <input 
                type="file" 
                className="hidden" 
                accept=".csv,.xlsx,.xls"
                onChange={handleFileInput}
              />
            </label>
          </motion.div>
        )}

        {uploadState === 'processing' && (
          <motion.div 
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm mt-8"
          >
            <div className="flex items-center justify-center mb-8">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 0, repeat: 0, ease: "linear" }}
              >
                {React.createElement(steps[currentStep].icon, { className: "w-12 h-12 text-brand" })}
              </motion.div>
            </div>
            <h3 className="text-xl font-semibold text-center text-slate-900 dark:text-white mb-12">Processing {file?.name}</h3>
            
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-slate-100 dark:bg-slate-800">
                  <motion.div 
                    initial={{ width: "0%" }}
                    animate={{ width: `${((currentStep) / (steps.length - 1)) * 100}%` }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-brand" 
                  />
                </div>
              </div>
              
              <div className="mt-16 space-y-4">
                {steps.map((step, index) => (
                  <motion.div 
                    key={index} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: index <= currentStep + 1 ? 1 : 0.3, x: index <= currentStep + 1 ? 0 : -10 }}
                    transition={{ duration: 0.1 }}
                    className="flex items-center gap-4"
                  >
                    {index < currentStep ? (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      </motion.div>
                    ) : index === currentStep ? (
                      <motion.div 
                        animate={{ rotate: 360 }} 
                        transition={{ repeat: 0, duration: 1, ease: "linear" }}
                        className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full"
                      />
                    ) : (
                      <div className="w-5 h-5 border-2 border-slate-200 dark:border-slate-700 rounded-full" />
                    )}
                    <span className={`text-sm ${index <= currentStep ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
                      {step.name}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {uploadState === 'done' && (
          <motion.div 
            key="done"
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.1 }}
            className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm mt-8 text-center"
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.1 }}
              className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </motion.div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Analysis Complete!</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-8">We've successfully processed {file?.name} and generated insights.</p>
            
            <div className="flex justify-center gap-4">
              <button 
                onClick={() => setUploadState('idle')}
                className="px-6 py-3 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Upload Another
              </button>
              <button 
                onClick={() => navigate('/app/quality', { state: { datasetId } })}
                className="px-6 py-3 bg-brand text-white font-medium rounded-lg hover:bg-brand-dark transition-colors shadow-sm"
              >
                View Data Quality
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
