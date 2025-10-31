// js/services/apiEventos.js

//  Este js solo interactua con los PHP, no usa los HTML. Retorna los datos


/**
@returns {object}
*/
export async function verificarSesion() {
    const response = await fetch('../../php/admin/verificarSesion.php');
    const data = await response.json();
    if (!data.loggedin) {
        throw new Error(data.mensaje || 'No hay sesión activa');
    }
    return data;
}

/**
 * 
 * @returns {Array}
 */

export async function cargarCampus() {
    try {
        const response = await fetch('../../php/public/obtenerCampus.php');
        const data = await response.json();
        return (data.success && data.campus) ? data.campus : [];
     } catch (error) {
        console.error('Fatal error cargando campus: ', error);
        return [];
     }
}

/** Carga lista de actividades
 * @returns {Array}
 */

export async function cargarActividades() {
    try {
        const response = await fetch('../../php/public/obtenerActividades.php');
        const data = await response.json();
        return (data.success && data.actividades) ? data.actividades : [];
    } catch (error) {
        console.error('Error cargando actividades', error);
        return [];
    }
}

/**
 *  Carga lista de facultades
 * @returns {Array}
 */

export async function cargarFacultades() {
    try {
        const response = await fetch('../../php/public/obtenerFacultades.php');
        const data = await response.json();
        return (data.success && data.facultades) ? data.facultades : [];
    } catch (error) {
        console.error('Error cargando facultades: ', error);
        return [];
    }
}

/**
 * Carga lista de eventos
 * @returns {Array}
 */

export async function cargarEventos() {
    try {
        const response = await fetch('../../php/public/obtenerEventos.php');
        const data = await response.json();
        return (data.success && data.eventos) ? data.eventos : [];
    } catch (error) {
        console.error('Error cargando eventos:', error);
        return [];
    }
}

/**
 * Obtiene los datos de un evento en especial para editarlo
 * @param {number} id -ID evento
 * @returns {object} Datos del evento
 */

export async function obtenerEventoParaEditar(id) {
    const eventos = await cargarEventos();
    const evento = eventos.find(e => e.id == id);
    if (evento) {
        return evento;
    }
    throw new Error(`Evento con id ${id} no encontrado`);
}

/**
 * Envia el formulario para crear o editar un evento
 * @param {FormData} formData - Datos del formulario
 * @param {boolean} modoEdicion - True si edita, false si crea
 * @returns {object} Respuesta al JSON del servidor
 */

export async function guardarEvento(formData, modoEdicion) {
    const url = modoEdicion
        ? '../../php/admin/editarEvento.php/'
        : '../../php/admin/crearEvento.php/';

    const response = await fetch(url, {
        method: 'POST',
        body: formData
    });
    return await response.json();
}

/**
 * Envia la peticion para eliminar un evento
 * @param {number} id - id del evento a eliminar
 * @returns {object} - respuesta JSON del servidor
 */

export async function eliminarEvento(id) {
    const formData = new FormData();
    formData.append('id', id);

    const response = await fetch('../../php/admin/eliminarEvento.php', {
        method: 'POST',
        body: formData
    });
    return await response.json();
}
