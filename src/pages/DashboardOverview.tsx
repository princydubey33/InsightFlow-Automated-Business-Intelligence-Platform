import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, DollarSign, ShoppingCart, Users, RefreshCcw } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell, ComposedChart, Line
} from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import AnimatedCount from '../components/AnimatedCount';
import { useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { authFetch } from '../utils/api';

const COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#f43f5e'];

const container: any = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.01
    }
  }
};

const item: any = {
  hidden: { opacity: 0, y: 2 },
  show: { opacity: 1, y: 0, transition: { duration: 0.1, ease: 'easeOut' } }
};

export default function DashboardOverview() {
  const [dateRange, setDateRange] = useState('30 Days');
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === 'dark';
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  React.useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        let datasetId = location.state?.datasetId;

        if (!datasetId) {
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

        const response = await authFetch(`${API_BASE_URL}/api/datasets/${datasetId}/analytics`);
        if (!response.ok) throw new Error('Failed to fetch analytics data.');
        const data = await response.json();
        setAnalyticsData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [location.state]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 dark:text-slate-400">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-rose-500 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-100 dark:border-rose-500/20 p-6">
        <span className="font-medium">{error}</span>
      </div>
    );
  }

  if (!analyticsData) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Overview</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">Welcome back{user?.name ? ', ' + user.name : ''}! Here's your data at a glance.</p>
        </div>
        <div className="flex glass-panel p-1 border-white/60 dark:border-slate-800/80">
          {['Today', '7 Days', '30 Days', '90 Days'].map((range) => (
            <motion.button
              
              
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                dateRange === range 
                  ? 'bg-white dark:bg-slate-800 text-brand dark:text-brand-light shadow-sm ring-1 ring-slate-100 dark:ring-slate-700' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-800/50'
              }`}
            >
              {range}
            </motion.button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div variants={item}   className="glass-panel p-6 cursor-pointer">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Total Revenue</p>
              <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                {analyticsData.totalRevenue !== null ? (
                  <AnimatedCount value={analyticsData.totalRevenue} formatter={(v) => `₹${v.toLocaleString()}`} />
                ) : (
                  <span className="text-slate-400 text-lg">N/A</span>
                )}
              </h3>
            </div>
            <div className="w-12 h-12 bg-white/80 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-brand dark:text-brand-light shadow-sm border border-white dark:border-slate-700">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </motion.div>

        <motion.div variants={item}   className="glass-panel p-6 cursor-pointer">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Orders</p>
              <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                {analyticsData.totalOrders !== null ? (
                  <AnimatedCount value={analyticsData.totalOrders} formatter={(v) => v.toLocaleString()} />
                ) : (
                  <span className="text-slate-400 text-lg">N/A</span>
                )}
              </h3>
            </div>
            <div className="w-12 h-12 bg-white/80 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-primary-500 dark:text-primary-400 shadow-sm border border-white dark:border-slate-700">
              <ShoppingCart className="w-6 h-6" />
            </div>
          </div>
        </motion.div>

        <motion.div variants={item}   className="glass-panel p-6 cursor-pointer">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Quantity</p>
              <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                {analyticsData.totalQuantity !== null ? (
                  <AnimatedCount value={analyticsData.totalQuantity} formatter={(v) => v.toLocaleString()} />
                ) : (
                  <span className="text-slate-400 text-lg">N/A</span>
                )}
              </h3>
            </div>
            <div className="w-12 h-12 bg-white/80 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-amber-500 shadow-sm border border-white dark:border-slate-700">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </motion.div>

        <motion.div variants={item}   className="glass-panel p-6 cursor-pointer">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Returns</p>
              <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                {analyticsData.totalReturns !== null ? (
                  <AnimatedCount value={analyticsData.totalReturns} formatter={(v) => v.toLocaleString()} />
                ) : (
                  <span className="text-slate-400 text-lg">N/A</span>
                )}
              </h3>
            </div>
            <div className="w-12 h-12 bg-white/80 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-accent shadow-sm border border-white dark:border-slate-700">
              <RefreshCcw className="w-6 h-6" />
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Charts */}
      {(() => {
        const filterData = (dataArray: any[]) => {
          if (!dataArray || !Array.isArray(dataArray)) return [];
          const length = dataArray.length;
          if (dateRange === 'Today') return dataArray.slice(Math.max(0, length - 1));
          if (dateRange === '7 Days') return dataArray.slice(Math.max(0, length - 7));
          if (dateRange === '30 Days') return dataArray.slice(Math.max(0, length - 30));
          if (dateRange === '90 Days') return dataArray.slice(Math.max(0, length - 90));
          return dataArray;
        };

        const filteredRevenue = filterData(analyticsData.revenueByDate);
        const filteredOrdersVsReturns = filterData(analyticsData.ordersVsReturnsByDate);

        return (
          <motion.div 
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6"
          >
        <motion.div  transition={{ duration: 0.1 }} className="lg:col-span-2 glass-panel p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Revenue Growth</h3>
            <button className="text-sm font-semibold text-brand dark:text-brand-light hover:text-brand-dark dark:hover:text-white">View Report &rarr;</button>
          </div>
          <div className="h-80">
            {filteredRevenue && filteredRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredRevenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={isDark ? 0.6 : 0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.4)"} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12, fontWeight: 500}} dy={10} minTickGap={30} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12, fontWeight: 500}} dx={-10} tickFormatter={(val) => `₹${val/1000}k`} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.8)', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
                      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255,255,255,0.9)', 
                      backdropFilter: 'blur(8px)' 
                    }}
                    itemStyle={{ color: isDark ? '#f1f5f9' : '#1e293b', fontWeight: 700 }}
                    labelStyle={{ color: isDark ? '#94a3b8' : '#64748b' }}
                    formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
                No date data available
              </div>
            )}
          </div>
        </motion.div>

        <motion.div  transition={{ duration: 0.1 }} className="glass-panel p-6">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">Orders vs Returns</h3>
          <div className="h-80 flex flex-col items-center justify-center">
            {filteredOrdersVsReturns && filteredOrdersVsReturns.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={filteredOrdersVsReturns} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.4)"} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12, fontWeight: 500}} dy={10} minTickGap={30} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12, fontWeight: 500}} dx={-10} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.8)', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
                      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255,255,255,0.9)' 
                    }}
                    itemStyle={{ color: isDark ? '#f1f5f9' : '#1e293b' }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontWeight: 500, fontSize: '13px', color: isDark ? '#cbd5e1' : '#475569' }} />
                  <Bar dataKey="orders" name="Orders" fill="#14b8a6" radius={[4, 4, 0, 0]} barSize={20} />
                  <Line type="monotone" dataKey="returns" name="Returns" stroke="#f43f5e" strokeWidth={3} dot={{r: 4}} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
                No data available
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
        );
      })()}
    </div>
  );
}
