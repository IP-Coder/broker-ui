import axios from 'axios';

const api = axios.create({
  baseURL: 'http://16.171.63.155/api', // Adjust if deployed elsewhere
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      // Handle unauthorized access, e.g., redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login'; // Adjust path as needed
    }
    return Promise.reject(error);
  }
);
export default api;
