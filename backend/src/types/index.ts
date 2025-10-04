export interface User {
  id: string;
  wa_number: string;
  email?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  id: number;
  user_id: string;
  name: string;
  kind: 'expense' | 'income';
  created_at: Date;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  category_id?: number;
  occurred_at: Date;
  note?: string;
  raw_message?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Event {
  id: string;
  user_id: string;
  title: string;
  starts_at: Date;
  remind_minutes: number;
  reminded_at?: Date;
  raw_message?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  meta?: Record<string, any>;
  created_at: Date;
}

export interface ParsedMessage {
  type: 'transaction' | 'event' | 'query' | 'unknown';
  data?: {
    amount?: number;
    category?: string;
    date?: Date;
    note?: string;
    eventTitle?: string;
    eventTime?: Date;
  };
  confidence: number;
  reasoning?: string;
}

export interface WhatsAppMessage {
  message_id: string;
  from: string;
  timestamp: string;
  text: string;
  type: string;
}
