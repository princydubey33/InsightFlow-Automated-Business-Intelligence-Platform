export const kpiData = {
  totalRevenue: '₹12.45L',
  orders: '8,421',
  customers: '3,284',
  returnRate: '7.2%',
};

export const revenueTrendData = [
  { name: 'Jan', value: 4000 },
  { name: 'Feb', value: 3000 },
  { name: 'Mar', value: 5000 },
  { name: 'Apr', value: 2780 },
  { name: 'May', value: 6890 },
  { name: 'Jun', value: 8390 },
  { name: 'Jul', value: 12450 },
];

export const categorySalesData = [
  { name: 'Electronics', value: 400 },
  { name: 'Clothing', value: 300 },
  { name: 'Home & Kitchen', value: 300 },
  { name: 'Books', value: 200 },
];

export const dataQualityIssues = [
  { id: 1, type: 'Missing Value', column: 'CustomerEmail', row: 42, severity: 'High', suggestedFix: 'Impute or Drop' },
  { id: 2, type: 'Invalid Format', column: 'PhoneNumber', row: 128, severity: 'Medium', suggestedFix: 'Format as +91-XXXXX' },
  { id: 3, type: 'Duplicate Row', column: 'All', row: 205, severity: 'Low', suggestedFix: 'Remove duplicate' },
  { id: 4, type: 'Outlier', column: 'OrderValue', row: 312, severity: 'Medium', suggestedFix: 'Review manually' },
];

export const insightsData = [
  {
    id: 1,
    title: 'Revenue decreased 14% this month.',
    description: 'Overall monthly revenue has seen a dip compared to the previous period.',
    severity: 'High',
    action: 'Investigate recent marketing campaigns and check for seasonal trends.'
  },
  {
    id: 2,
    title: 'Electronics contributed most to the revenue decline.',
    description: 'A 25% drop in electronics sales accounts for the majority of the overall decrease.',
    severity: 'High',
    action: 'Review inventory levels and competitor pricing for top-selling electronics.'
  },
  {
    id: 3,
    title: 'Returning customers decreased by 9%.',
    description: 'Retention rate has dropped slightly over the last 30 days.',
    severity: 'Medium',
    action: 'Launch a re-engagement email campaign with a special discount code.'
  },
  {
    id: 4,
    title: 'Product returns increased in Category X.',
    description: 'Clothing category is seeing a higher than normal return rate.',
    severity: 'Medium',
    action: 'Check sizing charts and quality of recent clothing shipments.'
  }
];

export const reportsData = [
  { id: 1, name: 'Q3 Financial Overview', date: '2026-10-01', type: 'Financial', status: 'Ready' },
  { id: 2, name: 'Customer Segmentation Analysis', date: '2026-09-28', type: 'Marketing', status: 'Ready' },
  { id: 3, name: 'Inventory Turnover', date: '2026-09-15', type: 'Operations', status: 'Ready' },
  { id: 4, name: 'Monthly Sales Report', date: '2026-09-01', type: 'Sales', status: 'Ready' },
];
