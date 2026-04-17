import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,           // Short-lived token for API requests
      refreshToken: null,          // Long-lived token to refresh access token
      tokenExpiry: null,           // When access token expires (timestamp)
      unreadCount: 0,

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

      logout: () => set({
        user: null,
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null,
        unreadCount: 0
      }),

      // Update access token when refreshed
      setAccessToken: (accessToken, tokenExpiry) => set({
        accessToken,
        tokenExpiry
      }),

      setUnreadCount: (count) => set({ unreadCount: count }),

      updateUser: (updates) => set((state) => ({
        user: { ...state.user, ...updates }
      })),
    }),
    {
      name: 'campus-storage', // key in localStorage
    }
  )
);

export default useStore;
