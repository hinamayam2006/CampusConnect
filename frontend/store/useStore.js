import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast from 'react-hot-toast';

const safePersistStorage = typeof window !== 'undefined'
  ? {
      getItem: (name) => {
        try {
          const value = window.localStorage.getItem(name);
          if (!value) return null;
          return JSON.parse(value);
        } catch {
          window.localStorage.removeItem(name);
          return null;
        }
      },
      setItem: (name, newValue) => {
        window.localStorage.setItem(name, JSON.stringify(newValue));
      },
      removeItem: (name) => {
        window.localStorage.removeItem(name);
      },
    }
  : undefined;

const useStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,           // Short-lived token for API requests
      refreshToken: null,          // Long-lived token to refresh access token
      tokenExpiry: null,           // When access token expires (timestamp)
      unreadCount: 0,
      pendingVerificationEmail: '',

      // ============================================
      // NOTES (Phase 1)
      // ============================================
      notes: [],
      currentNote: null,
      notesFilters: { q: '' },
      notesUploadStatus: 'idle', // idle | uploading | saving | done | error

      setNotes: (notes) => set({ notes }),
      setCurrentNote: (currentNote) => set({ currentNote }),
      setNotesFilters: (notesFilters) => set({ notesFilters }),
      setNotesUploadStatus: (notesUploadStatus) => set({ notesUploadStatus }),

      // ============================================
      // TUTORING (Phase 1)
      // ============================================
      tutors: [],
      currentTutor: null,
      myTutorProfile: null,

      setTutors: (tutors) => set({ tutors }),
      setCurrentTutor: (currentTutor) => set({ currentTutor }),
      setMyTutorProfile: (myTutorProfile) => set({ myTutorProfile }),

      // Set user and both tokens after login/register
      setUser: (user, accessToken, refreshToken, tokenExpiry) => set({
        user,
        accessToken,
        refreshToken,
        tokenExpiry
      }),

      setPendingVerificationEmail: (email) => set({ pendingVerificationEmail: email || '' }),
      clearPendingVerificationEmail: () => set({ pendingVerificationEmail: '' }),

      showToast: (type, message) => {
        if (!message) return;
        if (type === 'success') toast.success(message);
        else if (type === 'error') toast.error(message);
        else toast(message);
      },

      logout: () => set({
        user: null,
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null,
        unreadCount: 0,
        pendingVerificationEmail: ''
      }),

      // Update access token when refreshed
      setAccessToken: (accessToken, tokenExpiry) => set({
        accessToken,
        tokenExpiry
      }),

      setUnreadCount: (count) => set((state) => ({
        unreadCount: typeof count === 'function' ? count(state.unreadCount) : count,
      })),

      updateUser: (updates) => set((state) => ({
        user: { ...state.user, ...updates }
      })),
    }),
    {
      name: 'campus-storage', // key in localStorage
      storage: safePersistStorage,
    }
  )
);

export default useStore;
