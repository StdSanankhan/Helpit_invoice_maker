/**
 * Central API configuration.
 * In development: reads from .env (VITE_API_URL=http://localhost:8000)
 * In production:  reads from Vercel environment variables
 */
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

console.log('--- API CONFIGURATION ---');
console.log('API_URL:', API_URL);
if (!import.meta.env.VITE_API_URL) {
    console.warn('VITE_API_URL is NOT set. Falling back to localhost.');
}
console.log('-------------------------');

export const api = (path) => `${API_URL}${path}`;
