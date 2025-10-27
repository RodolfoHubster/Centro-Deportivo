// js/ui/uiEventos.js


// Este JS solo usa el HTML, solo recibe los datos y los acomoda en la pantalla

// IMPORTS

import { formatearFecha } from '../utils/utilidades.js';

/**
 * Rellena los select de campus en el formulario
 * @param {Array} campus - Lista campus
 * 
 */

export function poblarSelectCampus(campus) {
    const select = document.getElementById('evento-campus');
    select.innerHTML = '<option value="">Seleccionar campus...</option>'
    campus.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
    });
}

/**
 * Rellena los select de actividades en el formulario
 * @param {Array} actividades - Lista de actividades
 */

export function poblarSelectActividades(actividades) {
    const select = document.getElementById('evento-actividad');
    select.innerHTML = '<option value="">Ninguna (crear nueva)</option>';
    actividades.forEach(act => {
        select.innerHTML += `<option value="${act.id}">${act.nombre}</option>`;
    });
}

/**
 * Rellena el div de checkboxes de las facultades
 * @param {Array} facultades - Lista facultades
 */

export function poblarCheckboxesFacultades(facultades) {
    const container = document.getElementById('facultades-checkbox');
    container.innerHTML = '';
    facultades.forEach(facultad => {
        container.innerHTML += `
        <label style="display: flex; align-items: center; padding: 8px; cursor: pointer; border-radius: 3px;">
                <input type="checkbox" name="facultades[]" value="${facultad.id}" style="margin-right: 10px;">
                <span style="font-weight: 500;">${facultad.nombre}</span> 
                <span style="color: #666; margin-left: 5px;">(${facultad.siglas})</span>
            </label>
            `;
    });
}

/**
 * Muestra la lista de los eventos en el DOM
 * @param {Array} eventos - Lista de eventos
 */

export function mostrarEventos(eventos) {
    const container = document.getElementById('lista-eventos');

    if (!eventos || eventos.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">No hay eventos registrados</p>';
        return;
    }

    container.innerHTML = '';
    eventos.forEach(evento => {
        const cupoTexto = evento.cupo_maximo
        ? `${evento.registros_actuales || 0} / ${evento.cupo_maximo}`
        : `${evento.registros_actuales || 0} (Sin límite)`;

        const cupoColor = evento.cupo_maximo && evento.registros_actuales >= evento.cupo_maximo
        ? '#dc3545'
        : '#28a745';

        container.innerHTML += `
        <div class="evento-card" style="background: white; padding: 20px; margin: 15px 0; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); border-left: 4px solid #003366;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <h3 style="margin: 0 0 10px 0; color: #003366;">${evento.nombre}</h3>
                        <p style="margin: 5px 0; color: #666;">${evento.descripcion || 'Sin descripción'}</p>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-top: 15px;">
                            <div><strong>Fechas:</strong><br>${formatearFecha(evento.fecha_inicio)} - ${formatearFecha(evento.fecha_termino)}</div>
                            <div><strong>Lugar:</strong><br>${evento.lugar}</div>
                            <div><strong>Campus:</strong><br>${evento.campus_nombre || 'N/A'}</div>
                            <div><strong>Tipo:</strong><br>${evento.tipo_actividad || 'N/A'}</div>
                            <div><strong>Categoría:</strong><br>${evento.categoria_deporte || 'N/A'}</div>
                            <div><strong>Cupo:</strong><br><span style="color: ${cupoColor}; font-weight: bold;">${cupoTexto}</span></div>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 10px; margin-left: 20px;">
                        <button data-action="editar" data-id="${evento.id}" style="padding: 8px 15px; background: #ffc107; color: #333; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; white-space: nowrap;">Editar</button>
                        <button data-action="eliminar" data-id="${evento.id}" data-nombre="${evento.nombre.replace(/"/g, '&quot;')}" style="padding: 8px 15px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; white-space: nowrap;">Eliminar</button>
                        <button data-action="qr" data-id="${evento.id}" style="padding: 8px 15px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; white-space: nowrap;">Ver QR</button>
                    </div>
                </div>
            </div>
        `;
    })
}

/**
 * Rellena el formulario del modal con los datos de un evento
 * @param {object} evento - Datos del evento
 */

export function poblarFormularioParaEditar(evento) {
    document.getElementById('tituloModal').textContent = 'Editar Evento';
    document.getElementById('evento-id').value = evento.id;
    document.getElementById('evento-nombre').value = evento.nombre;
    document.getElementById('evento-descripcion').value = evento.descripcion || '';
    document.getElementById('evento-fecha-inicio').value = evento.fecha_inicio;
    document.getElementById('evento-fecha-termino').value = evento.fecha_termino;
    document.getElementById('evento-lugar').value = evento.lugar;
    document.getElementById('evento-campus').value = evento.campus_id || '';
    document.getElementById('evento-ubicacion-tipo').value = evento.ubicacion_tipo || '';
    document.getElementById('evento-tipo-registro').value = evento.tipo_registro || 'Individual';
    document.getElementById('evento-categoria').value = evento.categoria_deporte || '';
    document.getElementById('evento-tipo-actividad').value = evento.tipo_actividad || '';
    document.getElementById('evento-actividad').value = evento.id_actividad || '';
    document.getElementById('evento-cupo-maximo').value = evento.cupo_maximo || '';

}

/**
 * Resetea y prepara el modal para crear un nuevo evento.
 */
export function prepararModalParaCrear() {
    document.getElementById('tituloModal').textContent = 'Crear Nuevo Evento';
    document.getElementById('formEvento').reset(); //
    document.getElementById('evento-id').value = '';
    document.querySelectorAll('input[name="facultades[]"]').forEach(cb => cb.checked = false);
    document.getElementById('modalEvento').style.display = 'block';
}

/**
 * Cierra el modal de evento.
 */
export function cerrarModal() {
    document.getElementById('modalEvento').style.display = 'none';
}

/**
 * Arregla el bug de tu script de auto-crecimiento y lo activa.
 * (Corregí el nombre de la función y la llamada).
 */
export function inicializarTextareaAutoGrow() {
    const autoGrowTextarea = document.querySelector("#evento-descripcion");

    function autoGrow() { // El nombre correcto es 'autoGrow'
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    }

    if (autoGrowTextarea) {
        autoGrowTextarea.addEventListener('input', autoGrow); // Llama a 'autoGrow'
        
        // No es necesario llamarlo al inicio si el formulario siempre está vacío
        // autoGrow.call(autoGrowTextarea); 
    } else {
        console.error("No se pudo encontrar el textarea #evento-descripcion");
    }
}