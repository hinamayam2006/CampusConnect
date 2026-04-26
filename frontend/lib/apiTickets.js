import api from './api';

export const submitFeedback = async (data) => {
  const response = await api.post('/tickets/feedback', data);
  return response.data;
};

export const submitIssueReport = async (data) => {
  const response = await api.post('/tickets/report', data);
  return response.data;
};

export const fetchMyTickets = async () => {
  const response = await api.get('/tickets/mine');
  return response.data;
};
