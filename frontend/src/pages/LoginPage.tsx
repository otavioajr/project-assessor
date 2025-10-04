import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [userId, setUserId] = useState('');
  const { login } = useAuth();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) {
      toast.error('Informe um ID de usuário');
      return;
    }
    login(userId);
    toast.success('Login realizado!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2">Assessor Financeiro</h1>
        <p className="text-gray-600 text-center mb-8">Entre para gerenciar suas finanças</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID de Usuário (temporário)
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Digite seu UUID"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use o UUID do banco de dados ou crie um novo usuário via WhatsApp
            </p>
          </div>
          
          <button
            type="submit"
            className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Entrar
          </button>
        </form>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Nota:</strong> Em produção, use Supabase Auth com OTP via e-mail ou WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
}
