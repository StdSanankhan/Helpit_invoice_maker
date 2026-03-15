/**
 * Central API configuration.
 * Unified Deployment: In production, the API and Frontend share the same domain.
 */
const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1');

// In production, use relative paths to the same domain
// In development, use VITE_API_URL or fallback to localhost:8000
const rawUrl = import.meta.env.VITE_API_URL || (isProduction ? window.location.origin : 'http://localhost:8000');
export const API_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;

console.log('--- API CONFIGURATION ---');
console.log('App Domain:', window.location.hostname);
console.log('Production Mode:', isProduction);
console.log('Final API_URL:', API_URL);
console.log('-------------------------');

export const api = (path) => `${API_URL}${path}`;
