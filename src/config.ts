const getBaseUrl = () => {
  let url = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://insightflow-backend-im3q.onrender.com' : 'http://127.0.0.1:8000');
  url = url.replace(/\/+$/, '');
  if (url.endsWith('/api')) {
    url = url.substring(0, url.length - 4);
  }
  return url;
};

export const API_BASE_URL = getBaseUrl();
