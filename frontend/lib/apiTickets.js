import api from './api';

export const submitFeedback = async (data) => {
  return api.post('/tickets/feedback', data);
};

export const submitIssueReport = async (data) => {
  return api.post('/tickets/report', data);
};

export const fetchMyTickets = async () => {
  return api.get('/tickets/mine');
};
