// js/ui/uiEventos.js


// Este JS solo usa el HTML, solo recibe los datos y los acomoda en la pantalla

// IMPORTS

import { formatearFecha } from '../utils/utilidades.js';

/**
 * Rellena los select de campus en el formulario (MODAL)
 * @param {Array} campus - Lista campus
 * */

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
        // Mensaje más específico si no hay eventos que coincidan con el filtro
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px 0;">No se encontraron eventos que coincidan con los filtros.</p>';
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
                        <button data-action="qr" data-id="${evento.id}" style="padding: 8px 15px; background: #777272ff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; white-space: nowrap;">Ver QR</button>

                        <a href="ver-participantes.html?evento_id=${evento.id}" class="btn-participantes" style="display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 8px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-size: 13.3333px; font-weight: bold; border: none; cursor: pointer; transition: background 0.2s; white-space: nowrap; font-family: Arial;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            Participantes
                        </a>
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
    document.getElementById('evento-periodo').value = evento.periodo || '';
    document.getElementById('evento-lugar').value = evento.lugar;
    document.getElementById('evento-campus').value = evento.campus_id || '';
    document.getElementById('evento-ubicacion-tipo').value = evento.ubicacion_tipo || '';
    document.getElementById('evento-tipo-registro').value = evento.tipo_registro || 'Individual';
    document.getElementById('evento-categoria').value = evento.categoria_deporte || '';
    document.getElementById('evento-tipo-actividad').value = evento.tipo_actividad || '';
    document.getElementById('evento-actividad').value = evento.id_actividad || '';
    document.getElementById('evento-cupo-maximo').value = evento.cupo_maximo || '';
    // --- AÑADE ESTAS LÍNEAS ---
    document.getElementById('evento-integrantes-min').value = evento.integrantes_min || '';
    document.getElementById('evento-integrantes-max').value = evento.integrantes_max || '';

    // Muestra u oculta los campos según el tipo de registro del evento
    mostrarCamposEquipo(evento.tipo_registro);
    // --- FIN DE LÍNEAS AÑADIDAS ---

}

/**
 * Resetea y prepara el modal para crear un nuevo evento.
 */
export function prepararModalParaCrear() {
    document.getElementById('tituloModal').textContent = 'Crear Nuevo Evento';
    document.getElementById('formEvento').reset(); //
    document.getElementById('evento-id').value = '';
    mostrarCamposEquipo('Individual'); // Oculta los campos por defecto
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

// ==========================================================
// ***** NUEVA FUNCIÓN AÑADIDA PARA LOS FILTROS DE ADMIN *****
// ==========================================================

/**
 * Rellena el select de campus en el FILTRO del admin.
 * @param {Array} campus - Lista campus
 */
export function poblarFiltroCampus(campus) {
    const select = document.getElementById('filtro-campus-admin');
    if (!select) {
        console.warn("No se encontró el filtro de campus 'filtro-campus-admin'");
        return; 
    }

    // Guardar la opción "Todos" que ya está en el HTML
    const opcionDefault = select.querySelector('option[value=""]');
    select.innerHTML = ''; // Limpiar el select

    // Volver a poner la opción "Todos" al inicio
    if (opcionDefault) {
        select.appendChild(opcionDefault);
    }

    // Añadir los campus de la base de datos
    campus.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
    });
}

// ===================================
// =====   NUEVA FUNCIÓN AQUÍ   =====
// ===================================

/**
 * Rellena el select de "Periodo" en el FILTRO del admin,
 * basándose en los eventos cargados.
 * @param {Array} eventos - Lista de todos los eventos
 */
export function poblarFiltroPeriodos(eventos) {
    const select = document.getElementById('filtro-periodo-admin');
    if (!select) {
        console.warn("No se encontró el filtro de periodo 'filtro-periodo-admin'");
        return; 
    }

    // 1. Extraer todos los periodos (ej: ["2025-1", "2025-2", null, "2025-1"])
    const periodos = eventos.map(evento => evento.periodo);

    // 2. Obtener solo los valores únicos y filtrar nulos/vacíos
    const periodosUnicos = [...new Set(periodos)]
                            .filter(p => p) // Filtra null, undefined, ""
                            .sort();        // Ordena alfabéticamente

    // 3. Guardar la opción "Todos"
    const opcionDefault = select.querySelector('option[value=""]');
    select.innerHTML = ''; 
    if (opcionDefault) {
        select.appendChild(opcionDefault);
    }

    // 4. Añadir los periodos únicos de la base de datos
    periodosUnicos.forEach(p => {
        select.innerHTML += `<option value="${p}">${p}</option>`;
    });
}

/**
 * Muestra u oculta los campos de min/max integrantes en el modal de admin.
 * @param {string} tipoRegistro - El valor del select ('Individual' o 'Por equipos')
 */
export function mostrarCamposEquipo(tipoRegistro) {
    const camposEquipo = document.getElementById('campos-equipo-admin');
    const minInput = document.getElementById('evento-integrantes-min');
    const maxInput = document.getElementById('evento-integrantes-max');
    if (!camposEquipo || !minInput || !maxInput) return;

    if (tipoRegistro === 'Por equipos') {
        camposEquipo.style.display = 'block';
        minInput.required = true; // Hacerlos obligatorios si se muestran
        // maxInput puede ser opcional (sin límite)
    } else {
        camposEquipo.style.display = 'none';
        minInput.required = false; // Quitarles el 'required'
        maxInput.required = false;
        // Limpiar valores por si acaso
        minInput.value = '';
        maxInput.value = '';
    }
}
