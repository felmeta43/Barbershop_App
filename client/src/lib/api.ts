import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
    }
    return Promise.reject(err);
  }
);

export default api;

export const servicesApi = {
  getAll: () => api.get('/services').then((r) => r.data),
  create: (data: any) => api.post('/services', data).then((r) => r.data),
  update: (id: string, data: any) => api.put(`/services/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/services/${id}`).then((r) => r.data),
};

export const barbersApi = {
  getAll: () => api.get('/barbers').then((r) => r.data),
  create: (data: any) => api.post('/barbers', data).then((r) => r.data),
  update: (id: string, data: any) => api.put(`/barbers/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/barbers/${id}`).then((r) => r.data),
};

export const appointmentsApi = {
  create: (data: any) => api.post('/appointments', data).then((r) => r.data),
  getAll: (params?: any) => api.get('/appointments', { params }).then((r) => r.data),
  getById: (id: string) => api.get(`/appointments/${id}`).then((r) => r.data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/appointments/${id}/status`, { status }).then((r) => r.data),
  checkAvailability: (date: string, barberId?: string) =>
    api.get('/appointments/check/availability', { params: { date, barber_id: barberId } }).then((r) => r.data),
};

export const queueApi = {
  getToday: () => api.get('/queue/today').then((r) => r.data),
  getStats: () => api.get('/queue/stats').then((r) => r.data),
  call: (id: string) => api.patch(`/queue/${id}/call`).then((r) => r.data),
  serve: (id: string) => api.patch(`/queue/${id}/serve`).then((r) => r.data),
  skip: (id: string) => api.patch(`/queue/${id}/skip`).then((r) => r.data),
};

export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }).then((r) => r.data),
};

export const paymentApi = {
  initialize: (appointmentId: string, email?: string) =>
    api.post('/payment/initialize', { appointment_id: appointmentId, email }).then((r) => r.data),
  verify: (txRef: string) => api.get(`/payment/verify/${txRef}`).then((r) => r.data),
};

export const settingsApi = {
  get: () => api.get('/settings').then((r) => r.data),
  update: (data: any) => api.put('/settings', data).then((r) => r.data),
};
