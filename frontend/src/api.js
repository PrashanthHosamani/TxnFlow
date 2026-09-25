import axios from 'axios';

// If VITE_API_URL is set, use it directly (e.g. production).
// In development, leave it empty — Vite's proxy in vite.config.js
// will forward all /api/* requests to the Django 'web' service internally.
const BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: BASE_URL,
});

export const uploadCSV = (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/api/jobs/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress) onProgress(Math.round((e.loaded * 100) / e.total));
    },
  });
};

export const getJobStatus = (jobId) =>
  api.get(`/api/jobs/${jobId}/status/`);

export const getJobResults = (jobId) =>
  api.get(`/api/jobs/${jobId}/results/`);

export const getJobSummary = (jobId) =>
  api.get(`/api/jobs/${jobId}/summary/`);

export const getJobs = () =>
  api.get('/api/jobs/');

export default api;
