import api from './api';

export const fetchAdminAnalytics = async () => {
  try {
    const response = await api.get('/admin/analytics');
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const fetchAdminAuditLog = async (params = {}) => {
  try {
    const response = await api.get('/admin/audit-log', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const fetchAdminTickets = async (params = {}) => {
  try {
    const response = await api.get('/admin/tickets', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const fetchAdminUsers = async (params = {}) => {
  try {
    const response = await api.get('/admin/users', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const updateAdminUserRole = async (userId, role) => {
  try {
    const response = await api.patch(`/admin/users/${userId}/role`, { role });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const unsuspendAdminUser = async (userId) => {
  try {
    const response = await api.patch(`/admin/users/${userId}/unsuspend`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const updateAdminTicket = async (ticketId, payload) => {
  try {
    const response = await api.patch(`/admin/tickets/${ticketId}`, payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const deleteAdminContent = async (type, id) => {
  try {
    const response = await api.delete(`/admin/content/${type}/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const suspendAdminUser = async (userId, reason) => {
  try {
    const response = await api.patch(`/admin/users/${userId}/suspend`, { reason });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};
