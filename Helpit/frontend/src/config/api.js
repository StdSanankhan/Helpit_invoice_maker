/**
 * Central API configuration.
 * In development: reads from .env (VITE_API_URL=http://localhost:8000)
 * In production:  reads from Vercel environment variables
 */
// Strip trailing slash if present to avoid double-slashes in paths
const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const API_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;

const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1');

console.log('--- API CONFIGURATION ---');
console.log('App Domain:', window.location.hostname);
console.log('API_URL:', API_URL);

if (isProduction && API_URL.includes('localhost')) {
    console.error('CRITICAL: App is running in PRODUCTION but API_URL is still pointing to LOCALHOST.');
    console.error('Please set VITE_API_URL in your Vercel/deployment settings.');
} else if (!import.meta.env.VITE_API_URL) {
    console.warn('VITE_API_URL is NOT set. Using default:', API_URL);
}
console.log('-------------------------');

export const api = (path) => `${API_URL}${path}`;
