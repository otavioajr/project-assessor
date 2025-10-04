import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { privacyApi } from '../lib/api';
import { Download, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PrivacyPage() {
  const [deleteToken, setDeleteToken] = useState('');

  const exportMutation = useMutation({
    mutationFn: (format: 'csv' | 'pdf') => privacyApi.exportData(format),
    onSuccess: (response, format) => {
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meus-dados.${format}`;
      a.click();
      toast.success('Dados exportados');
    },
  });

  const requestDeleteMutation = useMutation({
    mutationFn: privacyApi.requestDelete,
    onSuccess: (data) => {
      setDeleteToken(data.data.token);
      toast.success('Token gerado');
    },
  });

  const confirmDeleteMutation = useMutation({
    mutationFn: privacyApi.confirmDelete,
    onSuccess: () => {
      toast.success('Conta excluída');
      setTimeout(() => {
        localStorage.clear();
        window.location.reload();
      }, 2000);
    },
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Privacidade (LGPD)</h1>

      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Exportar Dados</h2>
          <div className="flex gap-2">
            <button
              onClick={() => exportMutation.mutate('csv')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              CSV
            </button>
            <button
              onClick={() => exportMutation.mutate('pdf')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              PDF
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4 text-red-600">Excluir Conta</h2>
          {!deleteToken ? (
            <button
              onClick={() => requestDeleteMutation.mutate()}
              className="bg-red-600 text-white px-4 py-2 rounded-lg"
            >
              Solicitar Exclusão
            </button>
          ) : (
            <div>
              <p className="mb-2">Token: {deleteToken}</p>
              <button
                onClick={() => confirmDeleteMutation.mutate(deleteToken)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg"
              >
                Confirmar Exclusão
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
