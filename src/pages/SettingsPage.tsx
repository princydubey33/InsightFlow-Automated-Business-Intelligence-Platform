import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Bell, Shield, Palette, Sun, Moon, LogOut, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('Profile');
  const { theme, setTheme } = useTheme();
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for form fields initialized directly from authenticated user
  const initialFirst = user ? (user.name || '').trim().split(' ')[0] || '' : '';
  const initialLast = user ? (user.name || '').trim().split(' ').slice(1).join(' ') || '' : '';
  
  const [firstName, setFirstName] = useState(initialFirst);
  const [lastName, setLastName] = useState(initialLast);
  const [email, setEmail] = useState(user?.email || '');
  const [company, setCompany] = useState('');

  // Status feedback
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (user) {
      const nameParts = (user.name || '').trim().split(' ');
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
      setEmail(user.email || '');
    } else {
      setFirstName('');
      setLastName('');
      setEmail('');
    }
  }, [user?.name, user?.email]);

  // Extract initials dynamically from real user name
  const initials = user && user.name.trim()
    ? user.name.trim().split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSuccessMessage(`Avatar "${e.target.files[0].name}" selected.`);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const full = [trimmedFirst, trimmedLast].filter(Boolean).join(' ');

    if (!full) {
      setErrorMessage('Name cannot be empty.');
      return;
    }

    try {
      updateUser({ name: full });
      setSuccessMessage('Profile name updated successfully.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update profile name.');
    }
  };

  const handleCancelProfile = () => {
    setSuccessMessage('');
    setErrorMessage('');
    if (user) {
      const nameParts = (user.name || '').trim().split(' ');
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
    } else {
      setFirstName('');
      setLastName('');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Manage your account preferences and application settings.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-300">
        <div className="flex flex-col md:flex-row">
          {/* Left Navigation */}
          <div className="md:w-64 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-4 flex flex-col justify-between">
            <nav className="space-y-1">
              {[
                { name: 'Profile', icon: User },
                { name: 'Notifications', icon: Bell },
                { name: 'Security', icon: Shield },
                { name: 'Appearance', icon: Palette },
              ].map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    setActiveTab(item.name);
                    setSuccessMessage('');
                    setErrorMessage('');
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === item.name 
                      ? 'bg-white dark:bg-slate-800 text-brand dark:text-brand-light shadow-sm border border-slate-200 dark:border-slate-700' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </button>
              ))}
            </nav>

            {/* Logout in navigation */}
            <div className="pt-4 mt-6 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            </div>
          </div>
          
          {/* Right Content */}
          <div className="flex-1 p-6 sm:p-8">
            {/* Feedback messages */}
            {successMessage && (
              <div className="mb-6 flex items-center justify-between gap-3 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 rounded-lg text-sm animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{successMessage}</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setSuccessMessage('')} 
                  className="text-emerald-600 dark:text-emerald-400 hover:opacity-75 text-xs font-bold px-1"
                >
                  ✕
                </button>
              </div>
            )}

            {errorMessage && (
              <div className="mb-6 flex items-center justify-between gap-3 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 rounded-lg text-sm animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setErrorMessage('')} 
                  className="text-rose-600 dark:text-rose-400 hover:opacity-75 text-xs font-bold px-1"
                >
                  ✕
                </button>
              </div>
            )}

            {activeTab === 'Profile' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Profile Settings</h3>
                  {user?.role && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand-light border border-brand/20">
                      Role: {user.role}
                    </span>
                  )}
                </div>
                
                {/* User Header Card */}
                <div className="flex items-center gap-6 mb-8 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
                  <div className="w-20 h-20 bg-gradient-to-tr from-brand-light to-primary-500 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-md shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                        {user?.name || 'User'}
                      </h4>
                      {user?.role && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {user.role}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {user?.email || 'No email associated'}
                    </p>
                    <div className="mt-3">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleAvatarChange}
                      />
                      <button 
                        type="button"
                        onClick={handleAvatarClick}
                        className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-colors"
                      >
                        Change Avatar
                      </button>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">First Name</label>
                      <input 
                        type="text" 
                        value={firstName} 
                        onChange={(e) => setFirstName(e.target.value)} 
                        placeholder="Enter first name"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white dark:focus:bg-slate-900 text-sm text-slate-900 dark:text-white" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Last Name</label>
                      <input 
                        type="text" 
                        value={lastName} 
                        onChange={(e) => setLastName(e.target.value)} 
                        placeholder="Enter last name"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white dark:focus:bg-slate-900 text-sm text-slate-900 dark:text-white" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                      <input 
                        type="email" 
                        value={email} 
                        disabled 
                        readOnly 
                        className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed" 
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Email address is linked to your account.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                      <input 
                        type="text" 
                        value={user?.role || 'User'} 
                        disabled 
                        readOnly 
                        className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 font-medium cursor-not-allowed" 
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Assigned permission level for your account.</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Organization / Company</label>
                    <input 
                      type="text" 
                      value={company} 
                      onChange={(e) => setCompany(e.target.value)} 
                      placeholder="Optional company or team name"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white dark:focus:bg-slate-900 text-sm text-slate-900 dark:text-white" 
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 mt-6">
                    <button 
                      type="button" 
                      onClick={handleCancelProfile}
                      className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark shadow-sm transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>

                {/* Clear Logout Section */}
                <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40">
                    <div>
                      <h4 className="text-sm font-semibold text-rose-900 dark:text-rose-200">Account Session</h4>
                      <p className="text-xs text-rose-700/80 dark:text-rose-400/80 mt-0.5">
                        Log out of your account on this device.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors shrink-0"
                    >
                      <LogOut className="w-4 h-4" />
                      Log Out
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'Security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Security & Password</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage credentials and login security.</p>
                </div>

                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 text-sm flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Backend Password Management</p>
                    <p className="text-xs text-amber-800/90 dark:text-amber-400/90 mt-1 leading-relaxed">
                      Password modification is not currently supported by the existing authentication API. Account credentials and authentication parameters are maintained directly by the system administrator.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 opacity-70">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
                    <input 
                      type="password" 
                      value="••••••••••••" 
                      disabled 
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm cursor-not-allowed text-slate-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New Password</label>
                    <input 
                      type="password" 
                      placeholder="Remote password change not supported by backend" 
                      disabled 
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm cursor-not-allowed text-slate-500" 
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Appearance' && (
              <>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Appearance Settings</h3>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">Theme Preference</h4>
                    <div className="grid grid-cols-2 gap-4 max-w-md">
                      <button 
                        type="button"
                        onClick={() => setTheme('light')}
                        className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          theme === 'light' 
                            ? 'border-brand bg-brand/5 dark:bg-brand/10 text-brand dark:text-brand-light' 
                            : 'border-slate-200 dark:border-slate-700 hover:border-brand/50 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <Sun className="w-5 h-5" />
                        <span className="font-semibold">Light</span>
                      </button>
                      
                      <button 
                        type="button"
                        onClick={() => setTheme('dark')}
                        className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          theme === 'dark' 
                            ? 'border-brand bg-brand/5 dark:bg-brand/10 text-brand dark:text-brand-light' 
                            : 'border-slate-200 dark:border-slate-700 hover:border-brand/50 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <Moon className="w-5 h-5" />
                        <span className="font-semibold">Dark</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'Notifications' && (
              <div className="py-10 text-center">
                <p className="text-slate-500 dark:text-slate-400">Notification preferences will be available in an upcoming update.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
