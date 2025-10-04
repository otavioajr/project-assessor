import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format as dateFnsFormat } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string | Date, format = 'dd/MM/yyyy'): string {
  return dateFnsFormat(new Date(date), format, { locale: ptBR });
}

export function formatDateTime(date: string | Date): string {
  return dateFnsFormat(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}
