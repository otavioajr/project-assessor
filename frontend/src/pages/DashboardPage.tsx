import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { TrendingUp, TrendingDown, DollarSign, Receipt } from 'lucide-react';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export default function DashboardPage() {
  const from = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const to = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  const { data: summary, isLoading } = useQuery({
    queryKey: ['summary', from, to],
    queryFn: () => reportsApi.getSummary({ from, to }).then((r) => r.data),
  });

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  const cards = [
    {
      title: 'Receitas',
      value: summary?.totals.income || 0,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Despesas',
      value: summary?.totals.expense || 0,
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Saldo',
      value: summary?.totals.balance || 0,
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Transações',
      value: summary?.totals.transactions || 0,
      icon: Receipt,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      isCount: true,
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <p className="text-gray-600 mb-8">Resumo do mês atual</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card) => (
          <div key={card.title} className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600 text-sm font-medium">{card.title}</p>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <p className={`text-2xl font-bold ${card.color}`}>
              {card.isCount ? card.value : formatCurrency(card.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Gastos por Categoria</h2>
        <div className="space-y-3">
          {summary?.byCategory
            .filter((c) => c.kind === 'expense')
            .slice(0, 5)
            .map((cat) => (
              <div key={cat.category} className="flex items-center justify-between">
                <span className="text-gray-700">{cat.category}</span>
                <span className="font-semibold">{formatCurrency(cat.total)}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
