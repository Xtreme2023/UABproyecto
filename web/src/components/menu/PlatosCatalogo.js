import React, { useState, useMemo } from 'react';
import Modal from '../Modal';
import { platosService } from '../../lib/menu';
import { 
  ChefHat, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  UtensilsCrossed, 
  AlertCircle 
} from 'lucide-react';

export default function PlatosCatalogo({
  platos = [],
  onRefresh,
  showToast,
}) {
  const [searchPlato, setSearchPlato] = useState('');

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlato, setEditingPlato] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const [deletingPlato, setDeletingPlato] = useState(null);

  const handleOpenCreate = () => {
    setEditingPlato(null);
    setFormData({ nombre: '', descripcion: '' });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plato) => {
    setEditingPlato(plato);
    setFormData({ nombre: plato.nombre, descripcion: plato.descripcion || '' });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      setFormError('El nombre del plato es obligatorio.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      if (editingPlato) {
        await platosService.updatePlato(editingPlato.id_plato, {
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion.trim(),
        });
        showToast?.(`Plato "${formData.nombre}" actualizado.`);
      } else {
        await platosService.createPlato({
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion.trim(),
        });
        showToast?.(`Plato "${formData.nombre}" agregado al catálogo.`);
      }

      setIsModalOpen(false);
      await onRefresh?.();
    } catch (err) {
      console.error('Error al guardar plato:', err);
      setFormError(err.message || 'Error al guardar plato.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPlato) return;
    try {
      await platosService.deletePlato(deletingPlato.id_plato);
      showToast?.(`Plato "${deletingPlato.nombre}" eliminado.`);
      setDeletingPlato(null);
      await onRefresh?.();
    } catch (err) {
      console.error('Error al eliminar plato:', err);
      alert('Error al eliminar plato: ' + (err.message || 'Error desconocido'));
    }
  };

  const filteredPlatos = useMemo(() => {
    if (!searchPlato.trim()) return platos;
    const q = searchPlato.toLowerCase();
    return platos.filter(
      (p) => p.nombre?.toLowerCase().includes(q) || p.descripcion?.toLowerCase().includes(q)
    );
  }, [platos, searchPlato]);

  return (
    <div className="space-y-6">
      {/* Barra de Acciones y Búsqueda */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchPlato}
            onChange={(e) => setSearchPlato(e.target.value)}
            placeholder="Buscar plato por nombre o ingredientes..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-md transition transform active:scale-95 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Plato al Catálogo</span>
        </button>
      </div>

      {/* Grid de Platos */}
      {filteredPlatos.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
          <ChefHat className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-700">No se encontraron platos</h3>
          <p className="text-xs text-slate-400 mt-1">
            {searchPlato ? 'No hay coincidencias con tu búsqueda.' : 'Aún no has registrado platos en el catálogo.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlatos.map((plato) => (
            <div
              key={plato.id_plato}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <UtensilsCrossed className="w-5 h-5" />
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(plato)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Editar plato"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingPlato(plato)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Eliminar plato"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h4 className="text-base font-bold text-slate-900 mt-3">{plato.nombre}</h4>
                <p className="text-xs text-slate-500 mt-1 line-clamp-3">
                  {plato.descripcion || 'Sin descripción detallada.'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Catálogo general</span>
                <span className="font-mono">ID: #{plato.id_plato}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Crear / Editar Plato (reutiliza Modal.js) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlato ? 'Editar Plato' : 'Nuevo Plato'}
        subtitle="Administra los detalles de la comida para el catálogo institucional"
        icon={ChefHat}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nombre del Plato *
            </label>
            <input
              type="text"
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej. Pollo a la plancha con guarnición"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Descripción / Ingredientes (Opcional)
            </label>
            <textarea
              rows={3}
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Ej. Incluye ensalada mixta fresca, arroz primavera y postre del día."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md transition disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : editingPlato ? 'Actualizar Plato' : 'Guardar Plato'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Confirmar Eliminación (reutiliza Modal.js) */}
      <Modal
        isOpen={Boolean(deletingPlato)}
        onClose={() => setDeletingPlato(null)}
        title="¿Eliminar plato del catálogo?"
        subtitle="Esta acción desvinculará el plato de los menús en los que esté asignado"
        icon={Trash2}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            ¿Estás seguro de que deseas eliminar permanentemente el plato{' '}
            <strong>"{deletingPlato?.nombre}"</strong>?
          </p>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setDeletingPlato(null)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
            >
              Sí, Eliminar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
