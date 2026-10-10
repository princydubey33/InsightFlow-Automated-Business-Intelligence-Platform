export const authFetch = async (url: string, options: RequestInit = {}) => {
  const userStr = localStorage.getItem('insightflow_user');
  let userId = '';
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user && user.id) userId = user.id.toString();
    } catch(e) {}
  }
  
  const headers = {
    ...options.headers,
    ...(userId ? { 'X-User-Id': userId } : {})
  };
  
  return fetch(url, { ...options, headers });
};
