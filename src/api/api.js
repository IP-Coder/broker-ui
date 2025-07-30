import axios from 'axios';

/**
 * Centralized Axios instance with baseURL, JSON headers, and auth interceptor.
 */
const api = axios.create({
  baseURL: 'https://api.binaryprofunding.net/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
