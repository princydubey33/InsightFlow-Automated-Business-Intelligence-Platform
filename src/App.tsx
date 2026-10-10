import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardLayout from './components/DashboardLayout';
import DashboardOverview from './pages/DashboardOverview';
import UploadDataPage from './pages/UploadDataPage';
import DataQualityPage from './pages/DataQualityPage';
import AnalyticsPage from './pages/AnalyticsPage';
import InsightsPage from './pages/InsightsPage';
import ReportsPage from './pages/ReportsPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';

import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 2 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -2 }}
    transition={{ duration: 0.1, ease: 'easeOut' }}
    className="h-full w-full"
  >
    {children}
  </motion.div>
);

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><LandingPage /></PageWrapper>} />
        <Route path="/login" element={<PageWrapper><LoginPage /></PageWrapper>} />
        <Route path="/signup" element={<PageWrapper><SignupPage /></PageWrapper>} />
        <Route path="/reset-password" element={<PageWrapper><ResetPasswordPage /></PageWrapper>} />
        
        <Route path="/app" element={<PageWrapper><DashboardLayout /></PageWrapper>}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardOverview />} />
          <Route path="upload" element={<UploadDataPage />} />
          <Route path="quality" element={<DataQualityPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="insights" element={<InsightsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <AnimatedRoutes />
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
