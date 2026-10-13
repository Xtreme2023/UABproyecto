import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';
import { 
  platosService, 
  menuDiaService 
} from '../lib/menu';
import { 
  UtensilsCrossed, 
  CalendarPlus, 
  Calendar, 
  ChefHat, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw 
} from 'lucide-react';

export default function CrearMenu() {
  const { isAdmin } = useAuth();

  // Pestaña activa para el administrador: 'menu' (Menú Semanal) o 'platos' (Catálogo de Platos)
  const [activeTab, setActiveTab] = useState('menu');

  // Estados de datos sincronizados con Supabase
  const [platos, setPlatos] = useState([]);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  // Estados de búsqueda / filtros
  const [searchPlato, setSearchPlato] = useState('');
  const [filterEstadoMenu, setFilterEstadoMenu] = useState('ALL');

  // Modal: Crear / Editar Plato
  const [isPlatoModalOpen, setIsPlatoModalOpen] = useState(false);
  const [editingPlato, setEditingPlato] = useState(null);
  const [platoFormData, setPlatoFormData] = useState({ nombre: '', descripcion: '' });
  const [platoFormSubmitting, setPlatoFormSubmitting] = useState(false);
  const [platoFormError, setPlatoFormError] = useState(null);

  // Modal: Eliminar Plato
  const [deletingPlato, setDeletingPlato] = useState(null);

  // Modal: Crear / Editar Menú del Día
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [menuFormData, setMenuFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    estado_publicacion: true, // boolean en la tabla menu_dia
    selectedPlatosIds: [],
  });
  const [menuFormSubmitting, setMenuFormSubmitting] = useState(false);
  const [menuFormError, setMenuFormError] = useState(null);

  // Modal: Eliminar Menú
  const [deletingMenu, setDeletingMenu] = useState(null);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Cargar platos y menús desde Supabase
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [platosData, menusData] = await Promise.all([
        platosService.getPlatos(),
        menuDiaService.getMenuDiasConPlatos(),
      ]);

      setPlatos(platosData || []);
      setMenus(menusData || []);
    } catch (err) {
      console.error('Error al cargar datos desde Supabase:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==========================================
  // LÓGICA DE PLATOS (Catálogo)
  // ==========================================
  const handleOpenCreatePlato = () => {
    setEditingPlato(null);
    setPlatoFormData({ nombre: '', descripcion: '' });
    setPlatoFormError(null);
    setIsPlatoModalOpen(true);
  };

  const handleOpenEditPlato = (plato) => {
    setEditingPlato(plato);
    setPlatoFormData({ nombre: plato.nombre, descripcion: plato.descripcion || '' });
    setPlatoFormError(null);
    setIsPlatoModalOpen(true);
  };

  const handleSavePlato = async (e) => {
    e.preventDefault();
    if (!platoFormData.nombre.trim()) {
      setPlatoFormError('El nombre del plato es obligatorio.');
      return;
    }

    setPlatoFormSubmitting(true);
    setPlatoFormError(null);

    try {
      if (editingPlato) {
        await platosService.updatePlato(editingPlato.id_plato, {
          nombre: platoFormData.nombre.trim(),
          descripcion: platoFormData.descripcion.trim(),
        });
        showToast(`Plato "${platoFormData.nombre}" actualizado.`);
      } else {
        await platosService.createPlato({
          nombre: platoFormData.nombre.trim(),
          descripcion: platoFormData.descripcion.trim(),
        });
        showToast(`Plato "${platoFormData.nombre}" creado exitosamente.`);
      }

      setIsPlatoModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Error al guardar plato:', err);
      setPlatoFormError(err.message || 'Error al guardar el plato.');
    } finally {
      setPlatoFormSubmitting(false);
    }
  };

  const handleDeletePlatoConfirm = async () => {
    if (!deletingPlato) return;

    try {
      await platosService.deletePlato(deletingPlato.id_plato);
      showToast(`Plato "${deletingPlato.nombre}" eliminado.`);
      setDeletingPlato(null);
      await loadData();
    } catch (err) {
      console.error('Error al eliminar plato:', err);
      showToast('Error al eliminar plato: ' + (err.message || 'Error desconocido'));
    }
  };

  const filteredPlatos = useMemo(() => {
    return platos.filter((p) => {
      const q = searchPlato.toLowerCase();
      return (
        p.nombre?.toLowerCase().includes(q) ||
        p.descripcion?.toLowerCase().includes(q)
      );
    });
  }, [platos, searchPlato]);

  // ==========================================
  // LÓGICA DE MENÚ DEL DÍA (Relación N:M)
  // ==========================================
  const handleOpenCreateMenu = () => {
    setEditingMenu(null);
    setMenuFormData({
      fecha: new Date().toISOString().split('T')[0],
      estado_publicacion: true,
      selectedPlatosIds: [],
    });
    setMenuFormError(null);
    setIsMenuModalOpen(true);
  };

  const handleOpenEditMenu = (menu) => {
    setEditingMenu(menu);
    const estadoBool = menu.estado_publicacion === true || menu.estado_publicacion === 'Publicado';
    setMenuFormData({
      fecha: menu.fecha || new Date().toISOString().split('T')[0],
      estado_publicacion: estadoBool,
      selectedPlatosIds: (menu.platos || []).map((p) => p.id_plato),
    });
    setMenuFormError(null);
    setIsMenuModalOpen(true);
  };

  const togglePlatoSelection = (id_plato) => {
    setMenuFormData((prev) => {
      const exists = prev.selectedPlatosIds.includes(id_plato);
      return {
        ...prev,
        selectedPlatosIds: exists
          ? prev.selectedPlatosIds.filter((id) => id !== id_plato)
          : [...prev.selectedPlatosIds, id_plato],
      };
    });
  };

  const handleSaveMenu = async (e) => {
    e.preventDefault();
    if (!menuFormData.fecha) {
      setMenuFormError('Debe seleccionar una fecha para el menú.');
      return;
    }

    if (!menuFormData.selectedPlatosIds || menuFormData.selectedPlatosIds.length === 0) {
      setMenuFormError('Debe seleccionar al menos un plato para asociarlo al menú del día.');
      return;
    }

    setMenuFormSubmitting(true);
    setMenuFormError(null);

    try {
      // Flujo atómico N:M:
      // 1. Crea o actualiza menu_dia primero en la base de datos con estado_publicacion booleano.
      // 2. Obtiene el id_menu real resultante.
      // 3. Inserta registros en menu_plato compartiendo dicho id_menu con cada id_plato seleccionado.
      await menuDiaService.guardarMenuCompleto({
        id_menu: editingMenu?.id_menu,
        fecha: menuFormData.fecha,
        estado_publicacion: Boolean(menuFormData.estado_publicacion),
        platosIds: menuFormData.selectedPlatosIds,
      });

      showToast(`Menú del ${menuFormData.fecha} guardado exitosamente.`);
      setIsMenuModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Error al guardar menú:', err);
      setMenuFormError(err.message || 'Error al guardar el menú en la base de datos.');
    } finally {
      setMenuFormSubmitting(false);
    }
  };

  const handleDeleteMenuConfirm = async () => {
    if (!deletingMenu) return;

    try {
      await menuDiaService.deleteMenu(deletingMenu.id_menu);
      showToast(`Menú del ${deletingMenu.fecha} eliminado.`);
      setDeletingMenu(null);
      await loadData();
    } catch (err) {
      console.error('Error al eliminar menú:', err);
      showToast('Error al eliminar menú: ' + (err.message || 'Error desconocido'));
    }
  };

  const filteredMenus = useMemo(() => {
    let list = [...menus];
    if (!isAdmin) {
      // Para empleados (HU5): solo menús publicados
      list = list.filter((m) => m.estado_publicacion === true || m.estado_publicacion === 'Publicado');
    } else if (filterEstadoMenu !== 'ALL') {
      const matchBool = filterEstadoMenu === 'Publicado';
      list = list.filter((m) => {
        const isPub = m.estado_publicacion === true || m.estado_publicacion === 'Publicado';
        return isPub === matchBool;
      });
    }

    return list.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  }, [menus, isAdmin, filterEstadoMenu]);

  const formatDiaSemana = (fechaStr) => {
    if (!fechaStr) return '';
    try {
      const partes = fechaStr.split('-');
      if (partes.length === 3) {
        const d = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
        return d.toLocaleDateString('es-ES', { weekday: 'long' });
      }
      return '';
    } catch {
      return '';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-3 border border-slate-700 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {isAdmin ? 'Gestión de Menú y Platos' : 'Menú Semanal de Almuerzos'}
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">
                {isAdmin
                  ? 'Administra el catálogo de platos y programa los menús del día con sus platos vinculados.'
                  : 'Consulta el menú planificado de la semana para decidir tu reserva con anticipación.'}
              </p>
            </div>
          </div>
        </div>

        {/* Acciones principales de Administrador */}
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleOpenCreatePlato}
              className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-4 py-2.5 rounded-xl transition active:scale-95 text-sm border border-slate-200 shadow-xs"
            >
              <Plus className="w-4 h-4 text-slate-600" />
              <span>Nuevo Plato</span>
            </button>

            <button
              onClick={handleOpenCreateMenu}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-md transition transform active:scale-95 text-sm"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>Programar Menú</span>
            </button>
          </div>
        )}
      </div>

      {/* Pestañas para el Administrador */}
      {isAdmin && (
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-1">
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
              activeTab === 'menu'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Programación de Menú ({menus.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('platos')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
              activeTab === 'platos'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>Catálogo de Platos ({platos.length})</span>
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECCIÓN 1: VISTA DE PROGRAMACIÓN DE MENÚ (Semanal / Diario) */}
      {/* ======================================================== */}
      {activeTab === 'menu' && (
        <div className="space-y-6">
          {isAdmin && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-700">Filtrar por estado:</span>
                <select
                  value={filterEstadoMenu}
                  onChange={(e) => setFilterEstadoMenu(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="ALL">Todos los estados</option>
                  <option value="Publicado">Publicados</option>
                  <option value="Borrador">Borradores</option>
                </select>
              </div>

              <button
                onClick={loadData}
                disabled={loading}
                className="flex items-center space-x-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Actualizar Menús</span>
              </button>
            </div>
          )}

          {/* HU5: Menú no disponible para empleados */}
          {!isAdmin && filteredMenus.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Menú no disponible</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                  Actualmente no hay un menú publicado para la fecha solicitada. Por favor consulta más tarde.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ChefHat className="w-5 h-5 text-blue-200" />
                  <h3 className="font-bold text-lg">
                    {isAdmin ? 'Calendario de Menú del Día' : 'Menú Semanal Disponible'}
                  </h3>
                </div>
                <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">
                  {filteredMenus.length} {filteredMenus.length === 1 ? 'menú' : 'menús'}
                </span>
              </div>

              {filteredMenus.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No hay menús registrados aún.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Haz clic en "Programar Menú" para crear el menú del día y asociar los platos disponibles.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-blue-50/70 border-b border-blue-100 text-blue-900 text-xs uppercase font-bold tracking-wider">
                        <th className="py-3.5 px-6">Fecha</th>
                        <th className="py-3.5 px-6">Día</th>
                        <th className="py-3.5 px-6">Platos Asignados</th>
                        <th className="py-3.5 px-6 text-center">Estado</th>
                        {isAdmin && <th className="py-3.5 px-6 text-right">Acciones</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                      {filteredMenus.map((item) => {
                        const diaNombre = formatDiaSemana(item.fecha);
                        const isPublicado = item.estado_publicacion === true || item.estado_publicacion === 'Publicado';

                        return (
                          <tr key={item.id_menu} className="hover:bg-slate-50 transition">
                            <td className="py-4 px-6 font-mono font-medium text-slate-700 whitespace-nowrap">
                              {item.fecha.slice(0, 10).split('-').reverse().join('-')}
                            </td>
                            <td className="py-4 px-6 font-semibold text-slate-800 capitalize whitespace-nowrap">
                              {diaNombre || 'Día programado'}
                            </td>
                            <td className="py-4 px-6">
                              {item.platos && item.platos.length > 0 ? (
                                <div className="space-y-1.5">
                                  {item.platos.map((plato) => (
                                    <div
                                      key={plato.id_plato}
                                      className="inline-flex items-center mr-2 mb-1 bg-blue-50 border border-blue-200 text-blue-900 text-xs px-2.5 py-1 rounded-lg"
                                    >
                                      <ChefHat className="w-3.5 h-3.5 text-blue-600 mr-1.5 flex-shrink-0" />
                                      <span className="font-semibold">{plato.nombre}</span>
                                      {plato.descripcion && (
                                        <span className="text-slate-500 ml-1 text-[11px] truncate max-w-xs hidden sm:inline">
                                          — {plato.descripcion}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">
                                  Sin platos asignados
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                  isPublicado
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                    : 'bg-amber-100 text-amber-800 border-amber-200'
                                }`}
                              >
                                {isPublicado ? 'Publicado' : 'Borrador'}
                              </span>
                            </td>
                            {isAdmin && (
                              <td className="py-4 px-6 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    onClick={() => handleOpenEditMenu(item)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                    title="Editar menú"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setDeletingMenu(item)}
                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                    title="Eliminar menú"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SECCIÓN 2: CATÁLOGO Y CREACIÓN DE PLATOS (Exclusivo Admin) */}
      {/* ======================================================== */}
      {isAdmin && activeTab === 'platos' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar plato por nombre o descripción..."
                value={searchPlato}
                onChange={(e) => setSearchPlato(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
              <span className="text-xs text-slate-500 font-medium">
                {filteredPlatos.length} platos en catálogo
              </span>
              <button
                onClick={handleOpenCreatePlato}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-sm shadow-sm transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Plato</span>
              </button>
            </div>
          </div>

          {filteredPlatos.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-500 space-y-3">
              <ChefHat className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700">No se encontraron platos en el catálogo.</p>
              <p className="text-xs text-slate-400">
                {searchPlato
                  ? 'Intenta con otro término de búsqueda.'
                  : 'Crea tu primer plato para poder asignarlo a los menús.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPlatos.map((plato) => (
                <div
                  key={plato.id_plato}
                  className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/90 hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                          <ChefHat className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-slate-900 text-base leading-tight">
                          {plato.nombre}
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                        ID: {plato.id_plato}
                      </span>
                    </div>

                    <p className="text-slate-600 text-xs leading-relaxed pl-1 pt-1">
                      {plato.descripcion || 'Sin descripción detallada.'}
                    </p>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleOpenEditPlato(plato)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-semibold flex items-center space-x-1 transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => setDeletingPlato(plato)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center space-x-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: CREAR / EDITAR PLATO (Uso del Modal General)   */}
      {/* ======================================================== */}
      <Modal
        isOpen={isPlatoModalOpen}
        onClose={() => setIsPlatoModalOpen(false)}
        title={editingPlato ? 'Editar Plato' : 'Nuevo Plato'}
        subtitle="Registra las opciones gastronómicas para los menús"
        icon={ChefHat}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSavePlato} className="space-y-4">
          {platoFormError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{platoFormError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nombre del Plato <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={platoFormData.nombre}
              onChange={(e) => setPlatoFormData({ ...platoFormData, nombre: e.target.value })}
              placeholder="Ej. Pollo a la plancha con puré"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Descripción / Ingredientes
            </label>
            <textarea
              rows={3}
              value={platoFormData.descripcion}
              onChange={(e) => setPlatoFormData({ ...platoFormData, descripcion: e.target.value })}
              placeholder="Ej. Pechuga de pollo marinada, con arroz y ensalada fresca."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsPlatoModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={platoFormSubmitting}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md transition disabled:opacity-50"
            >
              {platoFormSubmitting ? 'Guardando...' : editingPlato ? 'Guardar Cambios' : 'Crear Plato'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: CONFIRMAR ELIMINACIÓN DE PLATO                  */}
      {/* ======================================================== */}
      <Modal
        isOpen={Boolean(deletingPlato)}
        onClose={() => setDeletingPlato(null)}
        title="¿Eliminar este plato?"
        subtitle="Esta acción quitará el plato de los menús asociados"
        icon={Trash2}
        maxWidth="max-w-md"
        footer={
          <div className="flex items-center space-x-3 w-full justify-end">
            <button
              type="button"
              onClick={() => setDeletingPlato(null)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDeletePlatoConfirm}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
            >
              Eliminar Definitivamente
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          ¿Estás seguro de que deseas eliminar el plato <strong>"{deletingPlato?.nombre}"</strong>?
          Se desvinculará automáticamente de las tablas del menú.
        </p>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: PROGRAMAR / EDITAR MENÚ DEL DÍA (Relación N:M)  */}
      {/* ======================================================== */}
      <Modal
        isOpen={isMenuModalOpen}
        onClose={() => setIsMenuModalOpen(false)}
        title={editingMenu ? 'Editar Menú del Día' : 'Programar Menú del Día'}
        subtitle="Asocia uno o varios platos a una fecha"
        icon={CalendarPlus}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveMenu} className="space-y-4">
          {menuFormError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{menuFormError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Fecha del Menú <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={menuFormData.fecha}
                onChange={(e) => setMenuFormData({ ...menuFormData, fecha: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Estado de Publicación
              </label>
              <select
                value={menuFormData.estado_publicacion ? 'true' : 'false'}
                onChange={(e) => setMenuFormData({ ...menuFormData, estado_publicacion: e.target.value === 'true' })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="true">Publicado (Visible a empleados)</option>
                <option value="false">Borrador (No visible)</option>
              </select>
            </div>
          </div>

          {/* Selección de platos para la relación N:M */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Platos Disponibles en el Menú ({menuFormData.selectedPlatosIds.length} seleccionados)
              </label>
              {/* <span className="text-[11px] text-blue-600 font-semibold">
                Relación N:M (menu_plato)
              </span> */}
            </div>

            {platos.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                Aún no tienes platos en el catálogo. Por favor crea platos primero en la pestaña "Catálogo de Platos".
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                {platos.map((plato) => {
                  const isChecked = menuFormData.selectedPlatosIds.includes(plato.id_plato);
                  return (
                    <div
                      key={plato.id_plato}
                      onClick={() => togglePlatoSelection(plato.id_plato)}
                      className={`flex items-start space-x-3 p-2.5 rounded-xl border cursor-pointer transition ${
                        isChecked
                          ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Manejado por onClick del contenedor
                        className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 pointer-events-none"
                      />
                      <div className="flex-1 text-xs">
                        <p className="font-bold">{plato.nombre}</p>
                        {plato.descripcion && (
                          <p className="text-slate-500 text-[11px] mt-0.5 line-clamp-1">
                            {plato.descripcion}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsMenuModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={menuFormSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-md transition disabled:opacity-50"
            >
              {menuFormSubmitting ? 'Guardando...' : editingMenu ? 'Actualizar Menú' : 'Guardar Menú'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 4: CONFIRMAR ELIMINACIÓN DE MENÚ                   */}
      {/* ======================================================== */}
      <Modal
        isOpen={Boolean(deletingMenu)}
        onClose={() => setDeletingMenu(null)}
        title="¿Eliminar menú del día?"
        subtitle="Esta acción desvinculará los platos asociados a esta fecha"
        icon={Trash2}
        maxWidth="max-w-md"
        footer={
          <div className="flex items-center space-x-3 w-full justify-end">
            <button
              type="button"
              onClick={() => setDeletingMenu(null)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDeleteMenuConfirm}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
            >
              Eliminar Menú
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          ¿Estás seguro de que deseas eliminar el menú programado para el{' '}
          <strong>{deletingMenu?.fecha}</strong>?
        </p>
      </Modal>
    </div>
  );
}
