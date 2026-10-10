import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Upload, 
  DatabaseZap, 
  BarChart3, 
  Lightbulb, 
  FileText, 
  Settings, 
  Search, 
  Bell, 
  User,
  Menu,
  X,
  LogOut,
  Check,
  History
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { name: 'Overview', path: '/app/dashboard', icon: LayoutDashboard },
  { name: 'Upload Data', path: '/app/upload', icon: Upload },
  { name: 'Data Quality', path: '/app/quality', icon: DatabaseZap },
  { name: 'Analytics', path: '/app/analytics', icon: BarChart3 },
  { name: 'Insights', path: '/app/insights', icon: Lightbulb },
  { name: 'Reports', path: '/app/reports', icon: FileText },
  { name: 'History', path: '/app/history', icon: History },
  { name: 'Settings', path: '/app/settings', icon: Settings },
];

const searchItems = [
  { name: 'Dashboard Overview', path: '/app/dashboard', type: 'Page' },
  { name: 'Upload Data', path: '/app/upload', type: 'Page' },
  { name: 'Data Quality', path: '/app/quality', type: 'Page' },
  { name: 'Analytics', path: '/app/analytics', type: 'Page' },
  { name: 'Insights', path: '/app/insights', type: 'Page' },
  { name: 'Reports', path: '/app/reports', type: 'Page' },
  { name: 'History', path: '/app/history', type: 'Page' },
  { name: 'Settings', path: '/app/settings', type: 'Page' },
];

const initialNotifications: { id: number, title: string, desc: string, time: string, read: boolean, path: string }[] = [];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Notification State
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Profile State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getPageTitle = () => {
    const item = navItems.find(i => i.path === location.pathname);
    return item ? item.name : 'Dashboard';
  };

  const filteredSearch = searchItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden text-slate-800 dark:text-slate-200 bg-transparent">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Floating Glass Panel */}
      <div className={twMerge(
        "fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto flex lg:w-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <aside className="w-64 glass-panel m-4 flex flex-col h-[calc(100vh-2rem)] overflow-hidden">
          <div className="flex items-center justify-between h-20 px-6 border-b border-white/40 dark:border-slate-800/80">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-brand to-primary-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand/20">
                <BarChart3 className="text-white w-5 h-5" />
              </div>
              <span className="text-2xl font-bold text-gradient tracking-tight">InsightFlow</span>
            </Link>
            <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 mt-2 px-3">Menu</div>
            {navItems.map((item) => (
              <motion.div 
                key={item.name} 
                 
                
              >
                <NavLink
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => clsx(
                    "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-300",
                    isActive 
                      ? "bg-white/80 dark:bg-slate-800 text-brand dark:text-brand-light shadow-sm ring-1 ring-white/50 dark:ring-slate-700" 
                      : "text-slate-600 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                  )}
                >
                  <item.icon className={clsx("w-5 h-5 transition-colors", "text-current")} />
                  {item.name}
                </NavLink>
              </motion.div>
            ))}
          </nav>
          
          <div className="p-4 border-t border-white/40 dark:border-slate-800/80">
            {!user ? (
              <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Demo Mode</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">All data is simulated.</p>
              </div>
            ) : (
              <div className="bg-white/40 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Authenticated</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate" title={user.email}>{user.email}</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between h-20 px-4 sm:px-6 lg:px-8 z-10 mx-4 mt-4 glass-panel rounded-2xl shrink-0">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 -ml-2 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 hidden sm:block tracking-tight">{getPageTitle()}</h1>
              {!user && (
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand/10 text-brand-dark dark:bg-brand/20 dark:text-brand-light border border-brand/20">
                  Demo Data
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-5">
            
            {/* Search */}
            <div className="relative hidden md:block" ref={searchRef}>
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search anything..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onClick={() => setIsSearchOpen(true)}
                className="pl-10 pr-4 py-2.5 w-72 bg-white/50 dark:bg-slate-900/50 border border-white/80 dark:border-slate-700/80 rounded-full text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:bg-white/80 dark:focus:bg-slate-800/80 transition-all shadow-inner backdrop-blur-sm"
              />
              
              {isSearchOpen && searchQuery && (
                <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden z-50 max-h-80 overflow-y-auto">
                  {filteredSearch.length > 0 ? (
                    <ul className="py-2">
                      {filteredSearch.map((item, idx) => (
                        <li key={idx}>
                          <button
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex flex-col"
                            onClick={() => {
                              navigate(item.path);
                              setIsSearchOpen(false);
                              setSearchQuery('');
                            }}
                          >
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{item.name}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{item.type}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                      No results found
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <ThemeToggle />
            
            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button 
                className="relative p-2.5 text-slate-500 dark:text-slate-400 hover:text-brand dark:hover:text-brand-light transition-colors rounded-full hover:bg-white/50 dark:hover:bg-slate-800/50"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full ring-2 ring-white dark:ring-slate-900"></span>
                )}
              </button>
              
              {isNotificationsOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                  <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700/50">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead}
                        className="text-xs text-brand hover:text-brand-dark dark:text-brand-light dark:hover:text-white flex items-center gap-1 transition-colors"
                      >
                        <Check className="w-3 h-3" /> Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length > 0 ? (
                      <ul className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {notifications.map((notif) => (
                          <li key={notif.id}>
                            <button
                              onClick={() => {
                                setNotifications(notifications.map(n => n.id === notif.id ? { ...n, read: true } : n));
                                setIsNotificationsOpen(false);
                                navigate(notif.path);
                              }}
                              className={clsx(
                                "w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors",
                                !notif.read && "bg-brand/5 dark:bg-brand/10"
                              )}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <p className={clsx(
                                  "text-sm font-medium",
                                  !notif.read ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"
                                )}>
                                  {notif.title}
                                </p>
                                <span className="text-xs text-slate-500 whitespace-nowrap ml-2">{notif.time}</span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{notif.desc}</p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        No notifications
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <div 
                className="flex items-center gap-3 pl-4 border-l border-white/50 dark:border-slate-700/80 cursor-pointer group"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-brand dark:group-hover:text-brand-light transition-colors">
                    {user ? user.name : "Demo User"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    {user ? (user.role || 'User') : "Guest"}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-light to-primary-500 flex items-center justify-center text-white font-bold ring-2 ring-white dark:ring-slate-800 shadow-md">
                  {user ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : "DU"}
                </div>
              </div>
              
              {isProfileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700/50 sm:hidden">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{user ? user.name : 'Demo User'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user ? user.email : 'demo@insightflow.com'}</p>
                  </div>
                  <div className="hidden sm:block p-4 border-b border-slate-100 dark:border-slate-700/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user ? user.email : 'demo@insightflow.com'}</p>
                  </div>
                  <div className="py-1">
                    <button 
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate('/app/settings');
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-brand dark:hover:text-brand-light flex items-center gap-2 transition-colors"
                    >
                      <User className="w-4 h-4" /> Profile & Settings
                    </button>
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </header>

        {/* Main scrollable area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -2 }}
                transition={{ duration: 0.1 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
