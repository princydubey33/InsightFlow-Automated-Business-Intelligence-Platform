import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, ComposedChart
} from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle, DollarSign, ShoppingCart, Hash, RefreshCcw, TrendingUp } from 'lucide-react';
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

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function AnalyticsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  useEffect(() => {
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
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
        <p className="text-slate-500 dark:text-slate-400">Crunching numbers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-rose-500 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-100 dark:border-rose-500/20 p-6">
        <AlertTriangle className="w-6 h-6 mr-3" />
        <span className="font-medium">{error}</span>
      </div>
    );
  }

  if (!analyticsData) return null;

  const tooltipStyle = {
    borderRadius: '12px',
    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(8px)'
  };
  
  const tooltipItemStyle = { color: isDark ? '#f1f5f9' : '#1e293b', fontWeight: 600 };
  const tooltipLabelStyle = { color: isDark ? '#94a3b8' : '#64748b', marginBottom: '4px' };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics Deep Dive</h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Explore real KPIs and interactive charts from your active dataset.</p>
      </div>

      {/* KPI Cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        
        {/* Total Revenue */}
        <motion.div variants={item} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <DollarSign className="w-16 h-16 text-brand" />
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1 z-10">Total Revenue</p>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 z-10">
            {analyticsData.totalRevenue !== null ? (
              <AnimatedCount value={analyticsData.totalRevenue} formatter={(v) => `₹${v.toLocaleString()}`} />
            ) : (
              <span className="text-slate-400 text-lg">N/A</span>
            )}
          </h3>
        </motion.div>

        {/* Total Orders */}
        <motion.div variants={item} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ShoppingCart className="w-16 h-16 text-emerald-500" />
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1 z-10">Total Orders</p>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 z-10">
            {analyticsData.totalOrders !== null ? (
              <AnimatedCount value={analyticsData.totalOrders} formatter={(v) => v.toLocaleString()} />
            ) : (
              <span className="text-slate-400 text-lg">N/A</span>
            )}
          </h3>
        </motion.div>

        {/* Total Quantity */}
        <motion.div variants={item} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Hash className="w-16 h-16 text-amber-500" />
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1 z-10">Total Quantity</p>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 z-10">
            {analyticsData.totalQuantity !== null ? (
              <AnimatedCount value={analyticsData.totalQuantity} formatter={(v) => v.toLocaleString()} />
            ) : (
              <span className="text-slate-400 text-lg">N/A</span>
            )}
          </h3>
        </motion.div>

        {/* Average Order Value */}
        <motion.div variants={item} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp className="w-16 h-16 text-indigo-500" />
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1 z-10">Avg Order Value</p>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 z-10">
            {analyticsData.averageOrderValue !== null ? (
              <AnimatedCount value={analyticsData.averageOrderValue} formatter={(v) => `₹${v.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} />
            ) : (
              <span className="text-slate-400 text-lg">N/A</span>
            )}
          </h3>
        </motion.div>

        {/* Total Returns */}
        <motion.div variants={item} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <RefreshCcw className="w-16 h-16 text-rose-500" />
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1 z-10">Total Returns</p>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 z-10">
            {analyticsData.totalReturns !== null ? (
              <AnimatedCount value={analyticsData.totalReturns} formatter={(v) => v.toLocaleString()} />
            ) : (
              <span className="text-slate-400 text-lg">N/A</span>
            )}
          </h3>
        </motion.div>

      </motion.div>

      {/* Charts Row 1 */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue Trend */}
        <motion.div variants={item} className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Revenue Growth</h3>
          <div className="h-80">
            {analyticsData.revenueByDate && analyticsData.revenueByDate.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData.revenueByDate} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={isDark ? 0.6 : 0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.1)" : "#f3f4f6"} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#6b7280', fontSize: 12}} dy={10} minTickGap={30} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#6b7280', fontSize: 12}} dx={-10} tickFormatter={(val) => `₹${val/1000}k`} />
                  <Tooltip 
                    contentStyle={tooltipStyle}
                    itemStyle={tooltipItemStyle}
                    labelStyle={tooltipLabelStyle}
                    formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
                No date data available
              </div>
            )}
          </div>
        </motion.div>

        {/* Revenue by Category */}
        <motion.div variants={item} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Revenue by Category</h3>
          <div className="h-80 flex flex-col items-center justify-center">
            {analyticsData.revenueByCategory && analyticsData.revenueByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analyticsData.revenueByCategory}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {analyticsData.revenueByCategory.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={tooltipStyle}
                    itemStyle={tooltipItemStyle}
                    formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Revenue']}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: isDark ? '#cbd5e1' : '#475569' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
                No category data available
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Orders vs Returns Row */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 gap-6 mt-6">
        <motion.div variants={item} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Orders vs Returns</h3>
          <div className="h-80 flex flex-col items-center justify-center">
            {analyticsData.ordersVsReturnsByDate && analyticsData.ordersVsReturnsByDate.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={analyticsData.ordersVsReturnsByDate} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.1)" : "#f3f4f6"} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#6b7280', fontSize: 12}} dy={10} minTickGap={30} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#6b7280', fontSize: 12}} dx={-10} />
                  <Tooltip 
                    contentStyle={tooltipStyle}
                    itemStyle={tooltipItemStyle}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '13px', color: isDark ? '#cbd5e1' : '#475569' }} />
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

      {/* Charts Row 2 */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Revenue by Product */}
        <motion.div variants={item} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Top 5 Products by Revenue</h3>
          <div className="h-80">
            {analyticsData.top5Products && analyticsData.top5Products.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.top5Products} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isDark ? "rgba(255,255,255,0.1)" : "#f3f4f6"} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#6b7280', fontSize: 12}} tickFormatter={(val) => `₹${val/1000}k`} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#6b7280', fontSize: 12, fontWeight: 500}} dx={-10} width={80} />
                  <Tooltip 
                    cursor={{fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'}}
                    contentStyle={tooltipStyle}
                    itemStyle={tooltipItemStyle}
                    formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24}>
                    {analyticsData.top5Products.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
               <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
                 No product data available
               </div>
            )}
          </div>
        </motion.div>

        {/* Revenue by City */}
        <motion.div variants={item} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Top 5 Cities by Revenue</h3>
          <div className="h-80">
            {analyticsData.top5Cities && analyticsData.top5Cities.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.top5Cities} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.1)" : "#f3f4f6"} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#6b7280', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#6b7280', fontSize: 12}} dx={-10} tickFormatter={(val) => `₹${val/1000}k`} />
                  <Tooltip 
                    cursor={{fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'}}
                    contentStyle={tooltipStyle}
                    itemStyle={tooltipItemStyle}
                    formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32}>
                     {analyticsData.top5Cities.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
               <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
                 No city data available
               </div>
            )}
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
