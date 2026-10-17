import { supabase } from './supabaseClient';

/**
 * Servicio para la gestión de Platos
 * Tabla: plato (id_plato, nombre, descripcion)
 */
export class Platos {
  async createPlato(platoData) {
    const { data, error } = await supabase
      .from('plato')
      .insert(platoData)
      .select();
    if (error) throw error;
    return data;
  }

  async updatePlato(id_plato, updateData) {
    const { data, error } = await supabase
      .from('plato')
      .update(updateData)
      .eq('id_plato', id_plato)
      .select();

    if (error) throw error;
    return data;
  }

  async deletePlato(id_plato) {
    // 1. Eliminar relaciones en la tabla pivote menu_plato para evitar violación de FK
    await supabase
      .from('menu_plato')
      .delete()
      .eq('id_plato', id_plato);

    // 2. Eliminar el plato
    const { error } = await supabase
      .from('plato')
      .delete()
      .eq('id_plato', id_plato);

    if (error) throw error;
    return true;
  }

  async getPlatos() {
    const { data, error } = await supabase
      .from('plato')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getPlatoById(id_plato) {
    const { data, error } = await supabase
      .from('plato')
      .select('*')
      .eq('id_plato', id_plato)
      .single();

    if (error) throw error;
    return data;
  }
}

/**
 * Servicio para la gestión del Menú del Día y la relación N:M con Platos
 * Tabla: menu_dia (id_menu, estado_publicacion [boolean], fecha)
 * Tabla: menu_plato (id_menuplato, id_plato, id_menu)
 */
export class MenuDia {
  async getMenuDias() {
    const { data, error } = await supabase
      .from('menu_dia')
      .select('*')
      .order('fecha', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async getMenuDiaById(id_menu) {
    const { data, error } = await supabase
      .from('menu_dia')
      .select('*')
      .eq('id_menu', id_menu)
      .single();
    if (error) throw error;
    return data;
  }

  async getMenuDiaByFecha(fecha) {
    const { data, error } = await supabase
      .from('menu_dia')
      .select('*')
      .eq('fecha', fecha)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async createMenu(menuData) {
    const estadoBool = typeof menuData.estado_publicacion === 'boolean'
      ? menuData.estado_publicacion
      : (menuData.estado_publicacion === 'Publicado' || menuData.estado_publicacion === true);

    const { data, error } = await supabase
      .from('menu_dia')
      .insert({
        fecha: menuData.fecha,
        estado_publicacion: estadoBool,
      })
      .select();
    if (error) throw error;
    return data;
  }

  async updateMenu(id_menu, updateData) {
    const payload = { ...updateData };
    if ('estado_publicacion' in payload) {
      payload.estado_publicacion = typeof payload.estado_publicacion === 'boolean'
        ? payload.estado_publicacion
        : (payload.estado_publicacion === 'Publicado' || payload.estado_publicacion === true);
    }

    const { data, error } = await supabase
      .from('menu_dia')
      .update(payload)
      .eq('id_menu', id_menu)
      .select();
    if (error) throw error;
    return data;
  }

  async deleteMenu(id_menu) {
    // 1. Eliminar primero de la tabla pivote menu_plato (evita violación de FK menu_plato_id_menu_fkey)
    await supabase
      .from('menu_plato')
      .delete()
      .eq('id_menu', id_menu);

    // 2. Eliminar de menu_dia
    const { error } = await supabase
      .from('menu_dia')
      .delete()
      .eq('id_menu', id_menu);
    if (error) throw error;
    return true;
  }

  /**
   * Guarda o actualiza un menu_dia y crea sus relaciones N:M en menu_plato:
   * 1. Crea o actualiza el registro en menu_dia.
   * 2. Obtiene el id_menu real generado por la base de datos.
   * 3. Crea múltiples filas en menu_plato compartiendo el mismo id_menu pero con cada id_plato.
   */
  async guardarMenuCompleto({ id_menu, fecha, estado_publicacion, platosIds = [] }) {
    const estadoBool = typeof estado_publicacion === 'boolean'
      ? estado_publicacion
      : (estado_publicacion === 'Publicado' || estado_publicacion === true);

    let targetMenuId = id_menu;

    // Si no se proporcionó id_menu, verificar si ya existe un menu_dia para la fecha seleccionada
    if (!targetMenuId && fecha) {
      const { data: existingMenu, error: checkErr } = await supabase
        .from('menu_dia')
        .select('id_menu')
        .eq('fecha', fecha)
        .maybeSingle();

      if (!checkErr && existingMenu?.id_menu) {
        targetMenuId = existingMenu.id_menu;
      }
    }

    let menuResult = null;

    if (targetMenuId) {
      // Actualizar el menú existente
      const { data, error } = await supabase
        .from('menu_dia')
        .update({
          fecha,
          estado_publicacion: estadoBool,
        })
        .eq('id_menu', targetMenuId)
        .select()
        .single();

      if (error) throw error;
      menuResult = data;
    } else {
      // Crear un nuevo menu_dia primero
      const { data, error } = await supabase
        .from('menu_dia')
        .insert({
          fecha,
          estado_publicacion: estadoBool,
        })
        .select()
        .single();

      if (error) throw error;
      menuResult = data;
      targetMenuId = data.id_menu;
    }

    if (!targetMenuId) {
      throw new Error('No se pudo obtener el identificador (id_menu) del menú del día.');
    }

    // Sincronizar las relaciones N:M en menu_plato
    // 1. Eliminar registros anteriores con este id_menu
    const { error: delMpError } = await supabase
      .from('menu_plato')
      .delete()
      .eq('id_menu', targetMenuId);

    if (delMpError) throw delMpError;

    // 2. Insertar una fila en menu_plato por cada plato seleccionado con el id_menu obtenido
    if (platosIds && platosIds.length > 0) {
      const pivotRows = platosIds.map((id_plato) => ({
        id_menu: targetMenuId,
        id_plato: Number(id_plato),
      }));

      const { error: insMpError } = await supabase
        .from('menu_plato')
        .insert(pivotRows);

      if (insMpError) throw insMpError;
    }

    return menuResult;
  }

  /**
   * Guarda el menú completo de una semana en una sola llamada atómica mediante la función Supabase RPC
   * @param {Array<{ fecha: string, estado_publicacion: boolean, platos_ids: number[] }>} dias
   */
  async guardarMenuSemanal(dias) {
    if (!dias || dias.length === 0) {
      throw new Error('Debe proporcionar al menos un día para el menú semanal.');
    }

    // 1. Invocar la función RPC creada en Supabase (con p_dias)
    let lastError = null;
    try {
      const { data, error } = await supabase.rpc('guardar_menu_semanal', {
        p_dias: dias,
      });

      if (!error) return data;
      lastError = error;
    } catch (rpcErr) {
      lastError = rpcErr;
    }

    // 2. Intento secundario si el parámetro de la función se declaró como 'dias'
    try {
      const { data, error } = await supabase.rpc('guardar_menu_semanal', {
        dias: dias,
      });

      if (!error) return data;
      lastError = error;
    } catch (rpcErr2) {
      lastError = rpcErr2;
    }

    // 3. Fallback cliente si no se pudo ejecutar el RPC
    console.warn('Ejecutando guardado de respaldo cliente:', lastError?.message);
    for (const dia of dias) {
      await this.guardarMenuCompleto({
        fecha: dia.fecha,
        estado_publicacion: dia.estado_publicacion,
        platosIds: dia.platos_ids || [],
      });
    }

    return { success: true, message: 'Menú semanal guardado exitosamente' };
  }

  /**
   * Obtiene todos los menú_dia junto con los platos asociados (relación N:M)
   */
  async getMenuDiasConPlatos() {
    const { data: menus, error: menusErr } = await supabase
      .from('menu_dia')
      .select('*')
      .order('fecha', { ascending: true });

    if (menusErr) throw menusErr;
    if (!menus || menus.length === 0) return [];

    // Obtener los platos y las relaciones existentes
    const [menuPlatosRes, platosRes] = await Promise.all([
      supabase.from('menu_plato').select('*'),
      supabase.from('plato').select('*'),
    ]);

    const platosMap = new Map((platosRes.data || []).map((p) => [p.id_plato, p]));
    const relaciones = menuPlatosRes.data || [];

    return menus.map((menu) => {
      const platosAsociados = relaciones
        .filter((rel) => rel.id_menu === menu.id_menu)
        .map((rel) => platosMap.get(rel.id_plato))
        .filter(Boolean);

      return {
        ...menu,
        platos: platosAsociados,
      };
    });
  }
}

/**
 * Servicio para la tabla pivote menu_plato
 * Tabla: menu_plato (id_menuplato, id_plato, id_menu)
 */
export class MenuPlato {
  async getMenuPlatos() {
    const { data, error } = await supabase
      .from('menu_plato')
      .select('*');
    if (error) throw error;
    return data || [];
  }

  async getPlatosByMenuId(id_menu) {
    const { data, error } = await supabase
      .from('menu_plato')
      .select('*, plato(*)')
      .eq('id_menu', id_menu);
    if (error) throw error;
    return data || [];
  }

  async createMenuPlato(menuPlatoData) {
    const { data, error } = await supabase
      .from('menu_plato')
      .insert(menuPlatoData)
      .select();
    if (error) throw error;
    return data;
  }

  async updateMenuPlato(id_menuplato, updateData) {
    const { data, error } = await supabase
      .from('menu_plato')
      .update(updateData)
      .eq('id_menuplato', id_menuplato)
      .select();
    if (error) throw error;
    return data;
  }

  async deleteMenuPlato(id_menuplato) {
    const { error } = await supabase
      .from('menu_plato')
      .delete()
      .eq('id_menuplato', id_menuplato);
    if (error) throw error;
    return true;
  }

  async deleteByMenuId(id_menu) {
    const { error } = await supabase
      .from('menu_plato')
      .delete()
      .eq('id_menu', id_menu);
    if (error) throw error;
    return true;
  }

  /**
   * Sincroniza los platos asignados a un menú del día específico (N:M)
   * Crea varios registros con el mismo id_menu pero diferente id_plato.
   */
  async asociarPlatosAMenu(id_menu, platosIds = []) {
    if (!id_menu) {
      throw new Error('id_menu es requerido para asociar platos en menu_plato.');
    }

    // 1. Eliminar asociaciones previas
    const { error: delError } = await supabase
      .from('menu_plato')
      .delete()
      .eq('id_menu', id_menu);

    if (delError) throw delError;

    if (!platosIds || platosIds.length === 0) {
      return [];
    }

    // 2. Insertar las nuevas asociaciones: una por cada plato con el mismo id_menu
    const records = platosIds.map((id_plato) => ({
      id_menu: id_menu,
      id_plato: Number(id_plato),
    }));

    const { data, error } = await supabase
      .from('menu_plato')
      .insert(records)
      .select();

    if (error) throw error;
    return data;
  }
}

// Instancias exportadas para conveniencia
export const platosService = new Platos();
export const menuDiaService = new MenuDia();
export const menuPlatoService = new MenuPlato();