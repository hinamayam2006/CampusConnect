'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import useStore from '../store/useStore';
import { fetchMyTutorProfile } from '../lib/apiRequests';

const UserRoleContext = createContext();

/**
 * UserRoleProvider determines user capabilities based on their data.
 * Checks if user is authenticated and if they have a tutor profile.
 * This satisfies the Context API requirement and enables role-based UI.
 */
export const UserRoleProvider = ({ children }) => {
  const { user } = useStore();
  const [hasTutorProfile, setHasTutorProfile] = useState(false);
  const [tutorLoading, setTutorLoading] = useState(false);

  // Check if user has a tutor profile
  useEffect(() => {
    if (!user?._id) {
      setHasTutorProfile(false);
      return;
    }

    let isMounted = true;

    const checkTutorStatus = async () => {
      setTutorLoading(true);
      try {
        await fetchMyTutorProfile();
        if (isMounted) setHasTutorProfile(true);
      } catch {
        if (isMounted) setHasTutorProfile(false);
      } finally {
        if (isMounted) setTutorLoading(false);
      }
    };

    checkTutorStatus();

    return () => {
      isMounted = false;
    };
  }, [user?._id]);

  // Compute user capabilities
  const roles = useMemo(
    () => ({
      isAuthenticated: !!user?._id,
      isTutor: hasTutorProfile,
      canUploadNotes: !!user?._id, // All authenticated users can upload notes
      isLoadingRoles: tutorLoading,
    }),
    [user?._id, hasTutorProfile, tutorLoading]
  );

  return (
    <UserRoleContext.Provider value={roles}>
      {children}
    </UserRoleContext.Provider>
  );
};

export const useUserRoles = () => {
  const context = useContext(UserRoleContext);
  if (!context) {
    throw new Error('useUserRoles must be used inside UserRoleProvider');
  }
  return context;
};
