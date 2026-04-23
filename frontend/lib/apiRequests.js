import api from './api';

// ============================================
// UPLOAD
// ============================================

export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  try {
    const response = await api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

// ============================================
// REQUEST API CALLS
// ============================================

export const createRequest = async (refModel, refId, seatsRequested = 1, message = '') => {
  try {
    const response = await api.post('/requests', {
      refModel,
      refId,
      seatsRequested,
      message,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const getMyRequests = async (role = null, status = null, context = null) => {
  try {
    const params = {};
    if (role) params.role = role;
    if (status) params.status = status;
    if (context) params.context = context;

    const response = await api.get('/requests', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const closeRequest = async (requestId) => {
  try {
    const response = await api.post(`/requests/${requestId}/close`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const getRequestById = async (requestId) => {
  try {
    const response = await api.get(`/requests/${requestId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const approveRequest = async (requestId) => {
  try {
    const response = await api.post(`/requests/${requestId}/approve`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const declineRequest = async (requestId, declineReason = '') => {
  try {
    const response = await api.post(`/requests/${requestId}/decline`, {
      declineReason,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const withdrawRequest = async (requestId) => {
  try {
    const response = await api.post(`/requests/${requestId}/withdraw`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const acceptChatRequest = async (requestId) => {
  try {
    const response = await api.post(`/requests/${requestId}/accept-chat`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const closeChat = async (requestId) => {
  try {
    const response = await api.post(`/requests/${requestId}/close-chat`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const getRequestsForResource = async (refModel, refId) => {
  try {
    const response = await api.get(`/requests/resource/${refModel}/${refId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

// ============================================
// CHAT API CALLS
// ============================================

export const sendMessage = async (requestId, content, messageType = 'text', attachment = null) => {
  try {
    const response = await api.post('/chat/messages', {
      requestId,
      content,
      messageType,
      attachment,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const getMessages = async (requestId) => {
  try {
    const response = await api.get(`/chat/messages/${requestId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const markMessageAsRead = async (messageId) => {
  try {
    const response = await api.post(`/chat/messages/${messageId}/read`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const getUnreadCount = async () => {
  try {
    const response = await api.get('/chat/unread/count');
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const getActiveChats = async () => {
  try {
    const response = await api.get('/chat/active/chats');
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const hideNotification = async (notificationId) => {
  try {
    const response = await api.patch(`/notifications/${notificationId}/hide`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const resolveNotificationTarget = async (notificationId) => {
  try {
    const response = await api.get(`/notifications/${notificationId}/target`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

// ============================================
// MARKETPLACE API CALLS
// ============================================

export const markListingCompleted = async (listingId) => {
  try {
    const response = await api.post(`/marketplace/listings/${listingId}/completed`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

// ============================================
// RIDES API CALLS
// ============================================

export const markRideCompleted = async (rideId) => {
  try {
    const response = await api.post(`/rides/${rideId}/completed`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const leaveRide = async (rideId) => {
  try {
    const response = await api.post(`/rides/${rideId}/leave`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const hidePassengerRide = async (rideId) => {
  try {
    const response = await api.post(`/rides/${rideId}/hide`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

// ============================================
// NOTES (Phase 1)
// ============================================

export const fetchNotes = async (params = {}) => {
  try {
    const response = await api.get('/notes', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const searchNotes = async (params = {}) => {
  try {
    const response = await api.get('/notes/search', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const fetchNoteById = async (noteId) => {
  try {
    const response = await api.get(`/notes/${noteId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const uploadNotesFile = async (formData) => {
  try {
    const response = await api.post('/upload/notes', formData, { timeout: 120000 });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

// ============================================
// BORROW
// ============================================

export const fetchBorrowItems = async (params = {}) => {
  try {
    const response = await api.get('/borrow', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const createBorrowItem = async (payload) => {
  try {
    const response = await api.post('/borrow', payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

// ============================================
// LOST & FOUND
// ============================================

export const fetchLostnFoundItems = async (params = {}) => {
  try {
    const response = await api.get('/lostnfound', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const fetchLostnFoundItemById = async (itemId) => {
  try {
    const response = await api.get(`/lostnfound/${itemId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const createLostnFoundItem = async (payload) => {
  try {
    const response = await api.post('/lostnfound', payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const createNote = async (payload) => {
  try {
    const response = await api.post('/notes', payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const deleteNote = async (noteId) => {
  try {
    const response = await api.delete(`/notes/${noteId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const downloadNote = async (noteId) => {
  try {
    const response = await api.post(`/notes/${noteId}/download`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const addNoteBookmark = async (noteId) => {
  try {
    const response = await api.post(`/notes/${noteId}/bookmark`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const removeNoteBookmark = async (noteId) => {
  try {
    const response = await api.delete(`/notes/${noteId}/bookmark`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const fetchBookmarkedNotes = async () => {
  try {
    const response = await api.get('/notes/bookmarks');
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const fetchMyNotes = async (params = {}) => {
  try {
    const response = await api.get('/notes/mine', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const fetchMyNoteStats = async () => {
  try {
    const response = await api.get('/notes/mine/stats');
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const submitNoteReview = async (noteId, payload) => {
  try {
    const response = await api.post(`/notes/${noteId}/review`, payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const fetchNoteReviews = async (noteId) => {
  try {
    const response = await api.get(`/notes/${noteId}/reviews`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const reportNote = async (noteId, payload) => {
  try {
    const response = await api.post(`/notes/${noteId}/report`, payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

// ============================================
// TUTORS (Phase 1)
// ============================================

export const fetchTutors = async (params = {}) => {
  try {
    const response = await api.get('/tutors', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const fetchTutorById = async (tutorId) => {
  try {
    const response = await api.get(`/tutors/${tutorId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const fetchTutorReviews = async (tutorId) => {
  try {
    const response = await api.get(`/tutors/${tutorId}/reviews`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const createTutorProfile = async (payload) => {
  try {
    const response = await api.post('/tutors', payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const updateTutorProfile = async (tutorProfileId, payload) => {
  try {
    const response = await api.patch(`/tutors/${tutorProfileId}`, payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const fetchMyTutorProfile = async () => {
  try {
    const response = await api.get('/tutors/mine');
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const fetchTutorEarnings = async (tutorId) => {
  try {
    const response = await api.get(`/tutors/${tutorId}/earnings`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

// ============================================
// BOOKINGS (Phase 2)
// ============================================

export const createBooking = async (payload) => {
  try {
    const response = await api.post('/bookings', payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const fetchMyBookings = async () => {
  try {
    const response = await api.get('/bookings/mine');
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const fetchTutorBookings = async () => {
  try {
    const response = await api.get('/bookings/tutor');
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const acceptBooking = async (bookingId) => {
  try {
    const response = await api.post(`/bookings/${bookingId}/accept`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const rejectBooking = async (bookingId, payload = {}) => {
  try {
    const response = await api.post(`/bookings/${bookingId}/reject`, payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const cancelBooking = async (bookingId) => {
  try {
    const response = await api.post(`/bookings/${bookingId}/cancel`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const completeBooking = async (bookingId) => {
  try {
    const response = await api.post(`/bookings/${bookingId}/complete`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const submitBookingReview = async (bookingId, payload) => {
  try {
    const response = await api.post(`/bookings/${bookingId}/review`, payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const uploadPaymentProof = async (bookingId, payload) => {
  try {
    const response = await api.post(`/bookings/${bookingId}/payment-proof`, payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const approvePayment = async (bookingId) => {
  try {
    const response = await api.post(`/bookings/${bookingId}/approve-payment`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const rejectPaymentProof = async (bookingId, payload = {}) => {
  try {
    const response = await api.post(`/bookings/${bookingId}/reject-payment`, payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const deleteBooking = async (bookingId, payload = {}) => {
  try {
    const response = await api.delete(`/bookings/${bookingId}`, { data: payload });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};
