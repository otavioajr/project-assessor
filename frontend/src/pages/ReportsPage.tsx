import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ReportsPage() {
  const { data: monthly = [] } = useQuery({
    queryKey: ['monthly'],
    queryFn: () => reportsApi.getMonthly().then((r) => r.data),
  });

  const chartData = monthly.map((m) => ({
    month: new Date(m.month).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
    Receitas: m.income,
    Despesas: m.expense,
  }));

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Relatórios</h1>
      <p className="text-gray-600 mb-8">Análise financeira dos últimos meses</p>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Evolução Mensal</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="Receitas" fill="#10b981" />
            <Bar dataKey="Despesas" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Histórico Mensal</h2>
        <table className="w-full">
          <thead className="border-b">
            <tr>
              <th className="px-4 py-2 text-left">Mês</th>
              <th className="px-4 py-2 text-right">Receitas</th>
              <th className="px-4 py-2 text-right">Despesas</th>
              <th className="px-4 py-2 text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map((m, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2">
                  {new Date(m.month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </td>
                <td className="px-4 py-2 text-right text-green-600">{formatCurrency(m.income)}</td>
                <td className="px-4 py-2 text-right text-red-600">{formatCurrency(m.expense)}</td>
                <td className={`px-4 py-2 text-right font-semibold ${m.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(m.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
