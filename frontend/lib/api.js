import axios from 'axios';
import useStore from '../store/useStore';

/** Default when NEXT_PUBLIC_API_URL is unset — must match backend (see frontend/.env.local). */
function resolveBaseURL() {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv.trim().replace(/\/+$/, '');
  }
  return 'http://localhost:5000/api';
}

const api = axios.create({
  baseURL: resolveBaseURL(),
  timeout: 30000,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  isRefreshing = false;
  failedQueue = [];
};

api.interceptors.request.use((config) => {
  const store = useStore.getState();

  if (store.accessToken) {
    config.headers.Authorization = `Bearer ${store.accessToken}`;
  }
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    const url = originalRequest.url || '';
    const status = error.response?.status;
    const errorCode = error.response?.data?.code;
    const errorMessage = error.response?.data?.message || '';

    // Wrong password / registration errors — do not attempt token refresh
    const isAuthCall =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh');

    if (status === 401 && isAuthCall) {
      return Promise.reject(error);
    }

    const store = useStore.getState();

    if (
      status === 403 &&
      (errorCode === 'EMAIL_NOT_VERIFIED' || /verify your email/i.test(errorMessage))
    ) {
      store.logout();
      return Promise.reject(error);
    }

    if (status === 401 && !originalRequest._retry) {
      // No refresh token means session is not recoverable; avoid refresh loop/noisy 401s.
      if (!store.refreshToken) {
        store.logout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await api.post(
          '/auth/refresh',
          { refreshToken: store.refreshToken },
          { timeout: 15000 }
        );

        const { accessToken } = response.data.data;

        const tokenExpiry = Date.now() + 15 * 60 * 1000;
        store.setAccessToken(accessToken, tokenExpiry);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (err) {
        store.logout();
        processQueue(err);

        return Promise.reject(err);
      }
    }

    if (error.response?.status === 401 && originalRequest._retry) {
      const isAuthEndpoint =
        originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register');

      if (!isAuthEndpoint) {
        store.logout();
      }
    }

    return Promise.reject(error);
  }
);

export default api;
