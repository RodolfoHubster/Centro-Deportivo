// js/ui/uiEventos.js


// Este JS solo usa el HTML, solo recibe los datos y los acomoda en la pantalla

// IMPORTS

import { formatearFecha } from '../utils/utilidades.js';

let todasLasFacultades = [];

/**
 * Rellena los select de campus en el formulario (MODAL)
 * @param {Array} campus - Lista campus
 * */

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
 * Rellena el div de checkboxes de las UNIDADES/CAMPUS
 * @param {Array} campus - Lista de campus (Ej: Otay, Mexicali, etc.)
 */
export function poblarCheckboxesCampus(campus) { 
    const container = document.getElementById('campus-checkbox');
    if (!container) return;
    
    // Convertir a minúsculas para una búsqueda sin distinción de mayúsculas
    const filtroBusqueda = ['tijuana', 'valle', 'palmas']; 

    // 1. FILTRAR CAMPUS: Solo Tijuana y Valle de las Palmas
    const campusFiltrado = campus.filter(c => {
        const nombre = (c.nombre || '').toLowerCase();
        const codigo = (c.codigo || '').toLowerCase();
        
        // Retorna true si el nombre o el código incluye 'tijuana' O 'valle'/'palmas'
        return filtroBusqueda.some(term => nombre.includes(term) || codigo.includes(term));
    });

    if (!campusFiltrado || campusFiltrado.length === 0) {
        container.innerHTML = '<p style="color: red; font-weight: bold;">Error: No se pudo cargar la lista filtrada de Campus/Unidades.</p>';
        return;
    }

    container.innerHTML = '';
    
    // 2. APLICAR ESTILO DE CUADRO Y SCROLL (replicando estilos de facultades)
    container.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 10px;
        max-height: 180px;
        overflow-y: auto;
        padding: 10px;
        border: 1px solid #eee;
        border-radius: 6px;
        background: #f9f9f9;
    `;
    
    campusFiltrado.forEach(c => {
        container.innerHTML += `
        <label style="display: flex; align-items: center; padding: 8px; cursor: pointer; border-radius: 3px;">
                <input type="checkbox" name="campus[]" value="${c.id}" style="margin-right: 10px;">
                <span style="font-weight: 500;">${c.nombre}</span> 
                <span style="color: #666; margin-left: 5px;">(${c.codigo || 'N/A'})</span>
            </label>
            `;
    });
}


/**
 * Guarda la lista original de facultades y la usa para el llenado inicial.
 * @param {Array} facultades - Lista completa de facultades.
 */
export function poblarCheckboxesFacultades(facultades) {
    todasLasFacultades = facultades;
    // NO llenar automáticamente, dejar vacío hasta que se seleccione un campus
    const container = document.getElementById('facultades-checkbox');
    if (container) {
        container.innerHTML = '<p style="color: #666; font-style: italic; padding: 15px; text-align: center;">Primero selecciona una o más Unidades Académicas para ver sus facultades.</p>';
    }
}

/**
 * Función de FILTRADO DINÁMICO: Renderiza las facultades en el modal,
 * aplicando el filtro por campus seleccionado y manteniendo la selección anterior.
 * @param {Array} campusIds - Array de IDs de campus seleccionados (ej: [1, 3]).
 * @param {Array} [facultadesSeleccionadas=[]] - IDs de facultades que deben permanecer marcadas (al editar o cambiar filtro).
 */
export function renderizarFacultadesFiltradas(campusIds, facultadesSeleccionadas = []) { 
    const container = document.getElementById('facultades-checkbox');
    if (!container) return;
    
    if (todasLasFacultades.length === 0) {
        container.innerHTML = '<p style="color: red; font-weight: bold;">Error: No se pudo cargar la lista de Facultades.</p>';
        return;
    }
    
    // Si NO hay campus seleccionados, mostrar mensaje
    if (!campusIds || campusIds.length === 0) {
        container.innerHTML = '<p style="color: #666; font-style: italic; padding: 15px; text-align: center;">Selecciona una o más Unidades Académicas arriba para ver sus facultades.</p>';
        return;
    }

    // Filtrar facultades por los campus seleccionados
    let facultadesMostrar = todasLasFacultades.filter(f => 
        campusIds.includes(String(f.campus_id))
    );

    if (facultadesMostrar.length === 0) {
        container.innerHTML = '<p style="color: #003366; font-style: italic; padding: 10px;">No hay facultades asociadas a las unidades seleccionadas.</p>';
        return;
    }

    container.innerHTML = '';
    
    container.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 10px;
        max-height: 180px;
        overflow-y: auto;
        padding: 10px;
        border: 1px solid #eee;
        border-radius: 6px;
        background: #f9f9f9;
    `;

    facultadesMostrar.forEach(facultad => {
        const isChecked = facultadesSeleccionadas.includes(String(facultad.id)) ? 'checked' : '';
        
        container.innerHTML += `
            <label style="display: flex; align-items: center; padding: 8px; cursor: pointer; border-radius: 3px;">
                <input type="checkbox" name="facultades[]" value="${facultad.id}" ${isChecked} style="margin-right: 10px;">
                <span style="font-weight: 500;">${facultad.nombre}</span> 
                <span style="color: #666; margin-left: 5px;">(${facultad.siglas})</span>
            </label>
        `;
    });
}

/**
 * Rellena el div de checkboxes de las facultades, aplicando filtros de Campus.
 * @param {Array} campusIds - Array de IDs de campus seleccionados (ej: [1, 3]).
 * @param {Array} [facultadesSeleccionadas=[]] - IDs de facultades que deben permanecer marcadas.
 */
export function recargarCheckboxesFacultades(campusIds, facultadesSeleccionadas = []) { // <--- Modificación de la función original
    const container = document.getElementById('facultades-checkbox');
    if (!container) return;
    
    // Si no hay facultades cargadas (error en carga inicial), salimos
    if (todasLasFacultades.length === 0) {
        container.innerHTML = '<p style="color: red; font-weight: bold;">Error: No se pudo cargar la lista de Facultades inicialmente.</p>';
        return;
    }
    
    let facultadesMostrar = todasLasFacultades;

    // Aplicar filtro si hay IDs de campus seleccionados
    if (campusIds && campusIds.length > 0) {
        // Filtramos las facultades cuyo campus_id esté en la lista de campusIds
        facultadesMostrar = todasLasFacultades.filter(f => 
            campusIds.includes(String(f.campus_id))
        );
    } 
    // Nota: Si campusIds está vacío, se muestran todas (comportamiento por defecto)

    if (facultadesMostrar.length === 0) {
         container.innerHTML = '<p style="color: #003366; font-style: italic; padding: 10px;">No hay facultades asociadas a las unidades seleccionadas.</p>';
         return;
    }

    container.innerHTML = '';
    facultadesMostrar.forEach(facultad => {
        // Determinar si el checkbox debe estar marcado (útil al editar)
        const isChecked = facultadesSeleccionadas.includes(String(facultad.id)) ? 'checked' : '';
        
        container.innerHTML += `
        <label style="display: flex; align-items: center; padding: 8px; cursor: pointer; border-radius: 3px;">
                <input type="checkbox" name="facultades[]" value="${facultad.id}" ${isChecked} style="margin-right: 10px;">
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

        // 1. Botones base (Eliminar y Participantes siempre visibles)
        const botonEliminarHTML = `<button data-action="eliminar" data-id="${evento.id}" data-nombre="${evento.nombre.replace(/"/g, '&quot;')}" style="padding: 8px 15px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; white-space: nowrap;">Eliminar</button>`;
        const botonParticipantesHTML = `<a href="ver-participantes.html?evento_id=${evento.id}" class="btn-participantes" style="display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 8px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-size: 13.3333px; font-weight: bold; border: none; cursor: pointer; transition: background 0.2s; white-space: nowrap; font-family: Arial;">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                <circle cx="9" cy="7" r="4"></circle>
                                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                            </svg>
                                            Participantes
                                        </a>`;

        // 2. Lógica condicional para los botones de estado/edición
        let botonPrincipal = ''; // Activar o Finalizar
        let botonEditar = '';
        let botonVerQR = '';
        let etiquetaFinalizado = ''; // <--- ETIQUETA NUEVA

        if (evento.activo == 1) { // Evento Activo: Finalizar, Editar, Ver QR
            botonPrincipal = `<button data-action="finalizar" data-id="${evento.id}" data-nombre="${evento.nombre.replace(/"/g, '&quot;')}" style="padding: 8px 15px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; white-space: nowrap;">Finalizar</button>`;
            botonEditar = `<button data-action="editar" data-id="${evento.id}" style="padding: 8px 15px; background: #ffc107; color: #333; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; white-space: nowrap;">Editar</button>`;
            botonVerQR = `<button data-action="qr" data-id="${evento.id}" style="padding: 8px 15px; background: #777272ff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; white-space: nowrap;">Ver QR</button>`;

        } else { // Evento Inactivo/Finalizado: Activar, Eliminar, Participantes
            // 1. Botón Activar (data-action="reactivar")
            botonPrincipal = `<button data-action="reactivar" data-id="${evento.id}" style="padding: 8px 15px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; white-space: nowrap;">Activar</button>`;
            // 2. Etiqueta FINALIZADO (junto al título)
            etiquetaFinalizado = `<span style="padding: 3px 8px; background: #6c757d; color: white; border-radius: 4px; font-weight: bold; white-space: nowrap; text-align: center; font-size: 0.9rem; margin-left: 10px;">FINALIZADO</span>`;
            // Los botones Editar y Ver QR se ocultan
            botonEditar = ''; 
            botonVerQR = '';
        }
        
        container.innerHTML += `
        <div class="evento-card" style="background: white; padding: 20px; margin: 15px 0; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); border-left: 4px solid #003366;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <h3 style="margin: 0 0 10px 0; color: #003366; display: flex; align-items: center;">
                            ${evento.nombre} 
                            ${etiquetaFinalizado} </h3>
                        <p style="margin: 5px 0; color: #666;">${evento.descripcion || 'Sin descripción'}</p>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-top: 15px;">
                            <div><strong>Fechas:</strong><br>${formatearFecha(evento.fecha_inicio)} - ${formatearFecha(evento.fecha_termino)}</div>
                            <div><strong>Lugar:</strong><br>${evento.lugar}</div>
                            <div><strong>Facultades:</strong><br>${evento.facultades_nombres || 'Abierto a todas'}</div>
                            <div><strong>Periodo:</strong><br>${evento.periodo || 'N/A'}</div>
                            <div><strong>Tipo:</strong><br>${evento.tipo_actividad || 'N/A'}</div>
                            <div><strong>Categoría:</strong><br>${evento.categoria_deporte || 'N/A'}</div>
                            <div><strong>Cupo:</strong><br><span style="color: ${cupoColor}; font-weight: bold;">${cupoTexto}</span></div>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 10px; margin-left: 20px;">
                        ${botonPrincipal} ${botonEditar}    ${botonEliminarHTML}  ${botonVerQR}     ${botonParticipantesHTML} </div>
                </div>
            </div>
        `;
    });
}

/**
 * Rellena el formulario del modal con los datos de un evento
 * @param {object} evento - Datos del evento
 * @param {string} periodoActivoNombre - Nombre del periodo activo (fallback)
 */

export function poblarFormularioParaEditar(evento,periodoActivoNombre) {
    document.getElementById('tituloModal').textContent = 'Editar Evento';
    document.getElementById('evento-id').value = evento.id;
    document.getElementById('evento-nombre').value = evento.nombre;
    document.getElementById('evento-descripcion').value = evento.descripcion || '';
    document.getElementById('evento-fecha-inicio').value = evento.fecha_inicio;
    document.getElementById('evento-fecha-termino').value = evento.fecha_termino;
    document.getElementById('evento-periodo').value = evento.periodo || '';
    document.getElementById('evento-lugar').value = evento.lugar;
    document.getElementById('evento-ubicacion-tipo').value = evento.ubicacion_tipo || '';
    document.getElementById('evento-tipo-registro').value = evento.tipo_registro || 'Individual';
    document.getElementById('evento-categoria').value = evento.categoria_deporte || '';
    document.getElementById('evento-tipo-actividad').value = evento.tipo_actividad || '';
    document.getElementById('evento-actividad').value = evento.id_actividad || '';
    document.getElementById('evento-cupo-maximo').value = evento.cupo_maximo || '';
    // --- AÑADE ESTAS LÍNEAS ---
    document.getElementById('evento-integrantes-min').value = evento.integrantes_min || '';
    document.getElementById('evento-integrantes-max').value = evento.integrantes_max || '';
    // Si el evento tiene periodo guardado, úsalo. Si no (es viejo/bug), usa el activo actual.
    const periodoMostrar = evento.periodo || periodoActivoNombre || 'Sin Asignar';
    document.getElementById('evento-periodo').value = periodoMostrar;
    // Muestra u oculta los campos según el tipo de registro del evento
    mostrarCamposEquipo(evento.tipo_registro);
    // --- FIN DE LÍNEAS AÑADIDAS ---

}

/**
 * Resetea y prepara el modal para crear un nuevo evento.
* @param {string} periodoActivoNombre - Nombre del periodo activo para pre-llenar
*/
export function prepararModalParaCrear(periodoActivoNombre) {
    document.getElementById('tituloModal').textContent = 'Crear Nuevo Evento';
    document.getElementById('formEvento').reset(); //
    document.getElementById('evento-id').value = '';
    document.getElementById('evento-periodo').value = periodoActivoNombre || 'Sin Periodo Activo';
    mostrarCamposEquipo('Individual'); // Oculta los campos por defecto

    // LIMPIAR CHECKBOXES DE CAMPUS
    document.querySelectorAll('input[name="campus[]"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[name="facultades[]"]').forEach(cb => cb.checked = false);

    // MOSTRAR MENSAJE INICIAL EN FACULTADES (vacío hasta seleccionar campus)
    const containerFacultades = document.getElementById('facultades-checkbox');
    if (containerFacultades) {
        containerFacultades.innerHTML = '<p style="color: #666; font-style: italic; padding: 15px; text-align: center;">Primero selecciona una o más Unidades Académicas arriba para ver sus facultades.</p>';
    }

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

/**
 * Rellena el select de facultades en el FILTRO del admin.
 * @param {Array} facultades - Lista de facultades
 */
export function poblarFiltroFacultades(facultades) {
    const select = document.getElementById('filtro-facultad-admin');
    if (!select) {
        console.warn("No se encontró el filtro de facultad 'filtro-facultad-admin'");
        return; 
    }

    // Guardar la opción "Todas" que ya está en el HTML
    const opcionDefault = select.querySelector('option[value=""]');
    select.innerHTML = ''; // Limpiar el select

    // Volver a poner la opción "Todas" al inicio
    if (opcionDefault) {
        select.appendChild(opcionDefault);
    }

    // Añadir las facultades de la base de datos
    facultades.forEach(fac => {
        select.innerHTML += `<option value="${fac.id}">${fac.nombre}</option>`;
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
// ...=========================================================