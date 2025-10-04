import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../lib/api';
import { formatDateTime } from '../lib/utils';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EventsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.getAll().then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: eventsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Evento excluído');
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Agenda</h1>
          <p className="text-gray-600">Seus compromissos e lembretes</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-5 h-5" />
          Novo Evento
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <ul className="divide-y">
          {events.map((event) => (
            <li key={event.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{event.title}</h3>
                <p className="text-sm text-gray-600">{formatDateTime(event.starts_at)}</p>
                <p className="text-xs text-gray-500">
                  Lembrete: {event.remind_minutes} min antes
                </p>
              </div>
              <button
                onClick={() => deleteMutation.mutate(event.id)}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
          {events.length === 0 && (
            <li className="p-8 text-center text-gray-500">Nenhum evento agendado</li>
          )}
        </ul>
      </div>

      {showForm && (
        <EventForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ['events'] });
          }}
        />
      )}
    </div>
  );
}

function EventForm({ onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    title: '',
    starts_at: '',
    remind_minutes: 60,
  });

  const createMutation = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => {
      toast.success('Evento criado');
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Novo Evento</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Título</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Data e Hora</label>
            <input
              type="datetime-local"
              required
              value={formData.starts_at}
              onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Lembrete (minutos antes)</label>
            <input
              type="number"
              value={formData.remind_minutes}
              onChange={(e) =>
                setFormData({ ...formData, remind_minutes: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700"
            >
              Criar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
