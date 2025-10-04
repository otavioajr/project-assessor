import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar userId (temporário - substituir por Supabase Auth)
api.interceptors.request.use((config) => {
  const userId = localStorage.getItem('userId');
  if (userId) {
    config.headers['x-user-id'] = userId;
  }
  return config;
});

// Types
export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  category_id?: number;
  category_name?: string;
  category_kind?: 'expense' | 'income';
  occurred_at: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  user_id: string;
  name: string;
  kind: 'expense' | 'income';
  is_system: boolean;
  created_at: string;
}

export interface Event {
  id: string;
  user_id: string;
  title: string;
  starts_at: string;
  remind_minutes: number;
  reminded_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportSummary {
  period: { from: string; to: string };
  totals: {
    income: number;
    expense: number;
    balance: number;
    transactions: number;
  };
  byCategory: {
    category: string;
    kind: 'expense' | 'income';
    total: number;
    count: number;
  }[];
}

// API functions
export const transactionsApi = {
  getAll: (params?: { from?: string; to?: string }) =>
    api.get<Transaction[]>('/transactions', { params }),
  create: (data: Partial<Transaction>) => api.post<Transaction>('/transactions', data),
  update: (id: string, data: Partial<Transaction>) =>
    api.put<Transaction>(`/transactions/${id}`, data),
  delete: (id: string) => api.delete(`/transactions/${id}`),
};

export const categoriesApi = {
  getAll: () => api.get<Category[]>('/categories'),
  create: (data: { name: string; kind: 'expense' | 'income' }) =>
    api.post<Category>('/categories', data),
  update: (id: number, data: { name: string }) =>
    api.put<Category>(`/categories/${id}`, data),
  delete: (id: number) => api.delete(`/categories/${id}`),
};

export const eventsApi = {
  getAll: (params?: { from?: string; to?: string }) =>
    api.get<Event[]>('/events', { params }),
  create: (data: { title: string; starts_at: string; remind_minutes?: number }) =>
    api.post<Event>('/events', data),
  update: (id: string, data: Partial<Event>) => api.put<Event>(`/events/${id}`, data),
  delete: (id: string) => api.delete(`/events/${id}`),
};

export const reportsApi = {
  getSummary: (params?: { from?: string; to?: string }) =>
    api.get<ReportSummary>('/reports/summary', { params }),
  getMonthly: () =>
    api.get<{ month: string; income: number; expense: number; balance: number }[]>(
      '/reports/monthly'
    ),
};

export const privacyApi = {
  exportData: (format: 'csv' | 'pdf') =>
    api.post('/privacy/export', { format }, { responseType: 'blob' }),
  requestDelete: () => api.post<{ message: string; token: string }>('/privacy/delete'),
  confirmDelete: (token: string) => api.post('/privacy/delete/confirm', { token }),
};
