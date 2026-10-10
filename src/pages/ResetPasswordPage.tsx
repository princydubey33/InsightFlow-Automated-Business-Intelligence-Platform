import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
import { API_BASE_URL } from '../config';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data?.detail || 'Failed to reset password');
      }
      
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8">
        <ThemeToggle />
      </div>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-brand to-primary-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand/20">
            <BarChart3 className="text-white w-7 h-7" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-slate-900 dark:text-white">Reset Password</h2>
        {email && <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">for {email}</p>}
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 2 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.1 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="bg-white dark:bg-slate-900 py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-slate-100 dark:border-slate-800">
          {error && (
            <div className="mb-4 bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 p-3 rounded-lg text-sm border border-rose-200 dark:border-rose-800">
              {error}
            </div>
          )}
          {success ? (
            <div className="text-center">
              <div className="mb-4 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 p-3 rounded-lg text-sm border border-emerald-200 dark:border-emerald-800">
                Password has been reset successfully! Redirecting to login...
              </div>
              <Link to="/login" className="font-medium text-brand hover:text-brand-dark transition-colors">
                Click here if not redirected
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  New Password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                  </div>
                  <input
                    type="password"
                    required
                    disabled={!token || loading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="focus:ring-brand focus:border-brand block w-full pl-10 sm:text-sm border-slate-300 dark:border-slate-700 rounded-lg py-2.5 border bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Confirm New Password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                  </div>
                  <input
                    type="password"
                    required
                    disabled={!token || loading}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="focus:ring-brand focus:border-brand block w-full pl-10 sm:text-sm border-slate-300 dark:border-slate-700 rounded-lg py-2.5 border bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={!token || loading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-slate-900 dark:bg-brand hover:bg-slate-800 dark:hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 dark:focus:ring-brand transition-all disabled:opacity-50"
                >
                  {loading ? 'Resetting...' : 'Set New Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
