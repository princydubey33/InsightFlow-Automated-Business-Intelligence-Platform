import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Database, TrendingUp, Zap, ArrowRight } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { motion } from 'framer-motion';

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.015,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 2 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.1, ease: 'easeOut' }
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-transparent overflow-hidden text-slate-800 dark:text-slate-200 relative">
      
      {/* Subtle animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <motion.div 
          className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-brand/10 dark:bg-brand/20 blur-[120px]"
          animate={{ 
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 0.50, repeat: 0, ease: "linear" }}
        />
        <motion.div 
          className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-primary-500/10 dark:bg-primary-500/20 blur-[100px]"
          animate={{ 
            x: [0, -40, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 15, repeat: 0, ease: "linear" }}
        />
      </div>

      {/* Navbar */}
      <motion.nav 
        initial={{ y: -2, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="fixed top-4 left-0 right-0 mx-auto w-[95%] max-w-7xl glass-nav rounded-2xl z-50 shadow-sm"
      >
        <div className="px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-brand to-primary-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand/20">
              <BarChart3 className="text-white w-5 h-5" />
            </div>
            <span className="text-2xl font-bold text-gradient tracking-tight">InsightFlow</span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <ThemeToggle />
            <Link to="/login" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-brand dark:hover:text-brand-light transition-colors">Log in</Link>
            <Link to="/signup" className="text-sm font-bold bg-brand text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full hover:bg-brand-dark transition-all shadow-lg shadow-brand/30 hover:shadow-brand/40">
              Get Started
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="pt-40 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center relative"
      >
        <h1 className="text-6xl sm:text-7xl lg:text-8xl font-extrabold text-slate-800 dark:text-white tracking-tight mb-8 leading-tight">
          <div className="flex flex-wrap justify-center gap-x-3 sm:gap-x-5 mb-2 sm:mb-4">
            {"Turn Raw Data Into".split(' ').map((word, i) => (
              <motion.span 
                key={i}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.1, type: "spring", bounce: 0.4 }}
              >
                {word}
              </motion.span>
            ))}
          </div>
          <motion.span 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1, backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ 
              opacity: { duration: 0.6, delay: 0.6 },
              scale: { type: "spring", bounce: 0.5, delay: 0.6 },
              backgroundPosition: { duration: 5, repeat: 0, ease: 'linear' } 
            }}
            className="text-transparent bg-clip-text bg-gradient-to-r from-brand via-primary-500 to-accent block"
            style={{ backgroundSize: '200% auto' }}
          >
            Business Decisions.
          </motion.span>
        </h1>
        
        <motion.p variants={itemVariants} className="max-w-2xl mx-auto text-xl text-slate-600 dark:text-slate-400 mb-10 font-medium">
          Automated data cleaning, smart analytics, interactive dashboards, and AI-powered insights. Upload your CSV/Excel and let InsightFlow do the rest.
        </motion.p>
        
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <motion.div   className="w-full sm:w-auto">
            <Link to="/signup" className="w-full sm:w-auto px-10 py-4 bg-slate-900 dark:bg-brand text-white rounded-full font-bold text-lg hover:bg-slate-800 dark:hover:bg-brand-dark transition-all shadow-xl hover:shadow-2xl flex items-center justify-center gap-2">
              Get Started <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
          <motion.div   className="w-full sm:w-auto">
            <Link to="/app" className="w-full sm:w-auto px-10 py-4 glass-panel text-slate-900 dark:text-white rounded-full font-bold text-lg hover:bg-white/80 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
              View Demo
            </Link>
          </motion.div>
        </motion.div>

        {/* Dashboard Preview Mockup */}
        <motion.div 
          variants={itemVariants} 
          
          transition={{ duration: 0, repeat: 0, ease: 'easeInOut' }}
          className="mt-20 relative mx-auto max-w-5xl"
        >
          <div className="rounded-3xl glass-panel p-2 shadow-2xl">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-inner aspect-video flex items-center justify-center relative">
               <div className="relative w-full h-full bg-slate-50 dark:bg-slate-900 flex">
                 {/* Sidebar Mock */}
                 <div className="w-48 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-4">
                   <div className="flex items-center gap-2 mb-4">
                     <div className="w-6 h-6 bg-brand rounded-md"></div>
                     <div className="h-4 w-20 bg-slate-800 dark:bg-slate-200 rounded"></div>
                   </div>
                   <div className="h-8 bg-brand/10 rounded-lg w-full"></div>
                   <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg w-full"></div>
                   <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg w-full"></div>
                   <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg w-full"></div>
                 </div>
                 
                 {/* Main Content Mock */}
                 <div className="flex-1 p-6 flex flex-col gap-6">
                   {/* Topbar */}
                   <div className="flex justify-between items-center w-full">
                      <div className="text-xl font-bold text-slate-800 dark:text-slate-100">Dashboard Overview</div>
                      <div className="flex gap-2 items-center">
                        <div className="h-8 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full"></div>
                        <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                      </div>
                   </div>
                   
                   {/* KPI Cards */}
                   <div className="grid grid-cols-4 gap-4 w-full">
                     {[
                       { title: 'Total Revenue', value: '₹12.45L', color: 'text-brand dark:text-brand-light' },
                       { title: 'Total Orders', value: '8,421', color: 'text-teal-500' },
                       { title: 'Customers', value: '3,284', color: 'text-amber-500' },
                       { title: 'Return Rate', value: '7.2%', color: 'text-rose-500' }
                     ].map((kpi, i) => (
                       <div key={i} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-4 flex flex-col justify-between">
                         <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{kpi.title}</div>
                         <div className={`text-2xl font-bold ${kpi.color} mt-2`}>{kpi.value}</div>
                       </div>
                     ))}
                   </div>
                   
                   {/* Charts Area */}
                   <div className="flex-1 flex gap-4 w-full">
                     <div className="flex-[2] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-5 flex flex-col">
                       <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4">Revenue Trend</div>
                       <div className="flex-1 w-full bg-gradient-to-t from-brand/20 dark:from-brand/40 to-transparent rounded-lg border-b-2 border-brand relative">
                          <svg className="absolute bottom-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                             <path d="M0,100 C20,80 40,90 60,40 C80,10 90,30 100,0 L100,100 L0,100 Z" fill="rgba(99, 102, 241, 0.1)" />
                             <path d="M0,100 C20,80 40,90 60,40 C80,10 90,30 100,0" fill="none" stroke="#6366f1" strokeWidth="2" />
                          </svg>
                       </div>
                     </div>
                     <div className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-5 flex flex-col">
                       <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4">Recent Insights</div>
                       <div className="space-y-3">
                         {[1,2,3].map(i => (
                           <div key={i} className="flex gap-2 items-center bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                             <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                             <div className="h-2 w-full bg-slate-300 dark:bg-slate-700 rounded"></div>
                           </div>
                         ))}
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Features Section */}
      <div className="py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl font-extrabold text-slate-800 dark:text-white mb-6">Everything you need to understand your data</h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">InsightFlow handles the heavy lifting so you can focus on making decisions.</p>
          </motion.div>
          
          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.015 } }
            }}
          >
            {[
              { icon: Database, title: "Automated Cleaning", desc: "Instantly detect and fix missing values, duplicates, and anomalies." },
              { icon: TrendingUp, title: "Smart Analytics", desc: "Uncover hidden patterns with advanced statistical models." },
              { icon: BarChart3, title: "Interactive Dashboards", desc: "Beautiful, responsive charts that bring your data to life." },
              { icon: Zap, title: "AI-Powered Insights", desc: "Get plain-English explanations of what's happening and why." }
            ].map((feature, i) => (
              <motion.div 
                key={i} 
                variants={itemVariants}
                
                className="glass-panel p-8 shadow-sm hover:shadow-xl transition-shadow duration-300"
              >
                <motion.div 
                  
                  transition={{ duration: 3, repeat: 0, ease: "easeInOut", delay: i * 0.2 }}
                  className="w-14 h-14 bg-gradient-to-br from-brand/20 dark:from-brand/30 to-primary-500/20 rounded-2xl flex items-center justify-center mb-6 text-brand border border-white dark:border-slate-700"
                >
                  <feature.icon className="w-7 h-7" />
                </motion.div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3 tracking-tight">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
