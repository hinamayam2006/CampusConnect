import axios from 'axios';
import useStore from '../store/useStore';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  isRefreshing = false;
  failedQueue = [];
};

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  // Get token directly from store
  const store = useStore.getState();

  if (store.accessToken) {
    config.headers.Authorization = `Bearer ${store.accessToken}`;
  }
  return config;
});

// Handle expired/invalid tokens globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const store = useStore.getState();

    // If already trying to refresh, queue the request
    if (error.response?.status === 401 && !originalRequest._retry) {

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh token
        const response = await api.post('/api/auth/refresh', {
          refreshToken: store.refreshToken
        });

        const { accessToken } = response.data.data;

        // Update store with new access token
        // Token expiry is 15 minutes from now
        const tokenExpiry = Date.now() + (15 * 60 * 1000);
        store.setAccessToken(accessToken, tokenExpiry);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        return api(originalRequest);

      } catch (err) {
        // Refresh failed, logout and redirect
        store.logout();
        processQueue(err);

        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }

        return Promise.reject(err);
      }
    }

    // Only redirect on 401 if it's NOT a login/register request
    // and refresh already attempted
    if (error.response?.status === 401 && originalRequest._retry) {
      const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
                            originalRequest.url?.includes('/auth/register');

      if (!isAuthEndpoint) {
        store.logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
