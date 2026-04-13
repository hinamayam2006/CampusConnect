import api from './api';

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

export const rateUser = async (userId, score, comment = '', context = 'marketplace') => {
  try {
    const response = await api.post(`/users/${userId}/rate`, {
      score,
      comment,
      context,
    });
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
