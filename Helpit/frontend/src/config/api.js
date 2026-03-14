/**
 * Central API configuration.
 * In development: reads from .env (VITE_API_URL=http://localhost:8000)
 * In production:  reads from Vercel environment variables
 */
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = (path) => `${API_URL}${path}`;
