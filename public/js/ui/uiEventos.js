// public/js/ui/uiEventos.js

// Este JS solo usa el HTML, solo recibe los datos y los acomoda en la pantalla

// IMPORTS
import { formatearFecha } from '../utils/utilidades.js';

// Variable global dentro del módulo para almacenar las facultades descargadas
let todasLasFacultades = [];

/**
 * Rellena los select de actividades en el formulario
 * @param {Array} actividades - Lista de actividades
 */
export function poblarSelectActividades(actividades) {
    const select = document.getElementById('evento-actividad');
    if (!select) return;
    
    select.innerHTML = '<option value="">Ninguna (crear nueva)</option>';
    actividades.forEach(act => {
        select.innerHTML += `<option value="${act.id}">${act.nombre}</option>`;
    });
}

/**
 * Rellena el div de checkboxes de las UNIDADES/CAMPUS
 * @param {Array} campus - Lista de campus (Ej: Otay, Mexicali, Ensenada, etc.)
 */
export function poblarCheckboxesCampus(campus) { 
    const container = document.getElementById('campus-checkbox');
    if (!container) return;
    
    // --- CORRECCIÓN: ELIMINAMOS EL FILTRO ---
    // Antes filtrábamos por 'tijuana', 'valle', etc. Ahora usamos 'campus' directo.
    
    if (!campus || campus.length === 0) {
        container.innerHTML = '<p style="color: red; font-weight: bold;">No hay Unidades Académicas registradas.</p>';
        return;
    }

    container.innerHTML = '';
    
    // ESTILOS (Grid responsive)
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
    
    // RENDERIZAR TODOS LOS CAMPUS
    campus.forEach(c => {
        container.innerHTML += `
        <label style="display: flex; align-items: center; padding: 8px; cursor: pointer; border-radius: 3px;">
            <input type="checkbox" name="campus[]" value="${c.id}" style="margin-right: 10px;">
            <span style="font-weight: 500;">${c.nombre}</span> 
            <span style="color: #666; margin-left: 5px; font-size: 0.9em;">(${c.codigo || ''})</span>
        </label>
        `;
    });
}

/**
 * Guarda la lista original de facultades y muestra el mensaje inicial.
 * @param {Array} facultades - Lista completa de facultades.
 */
export function poblarCheckboxesFacultades(facultades) {
    todasLasFacultades = facultades; // Guardamos en memoria
    
    const container = document.getElementById('facultades-checkbox');
    if (container) {
        // Mensaje inicial esperando selección de campus
        container.innerHTML = '<p style="color: #666; font-style: italic; padding: 15px; text-align: center;">Primero selecciona una o más Unidades Académicas arriba para ver sus facultades.</p>';
    }
}

/**
 * Función de FILTRADO DINÁMICO: Renderiza las facultades en el modal,
 * aplicando el filtro por campus seleccionado y manteniendo la selección anterior.
 * @param {Array} campusIds - Array de IDs de campus seleccionados (ej: ["1", "3"]).
 * @param {Array} [facultadesSeleccionadas=[]] - IDs de facultades que deben permanecer marcadas (al editar).
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
        // Verificar si debe estar marcado (útil al editar o al filtrar sin perder selección)
        // Se verifica tanto como número como string para asegurar compatibilidad
        const isChecked = facultadesSeleccionadas.includes(String(facultad.id)) || facultadesSeleccionadas.includes(facultad.id) ? 'checked' : '';
        
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
 * Muestra la lista de los eventos en el DOM (Tabla principal)
 * @param {Array} eventos - Lista de eventos
 */
export function mostrarEventos(eventos) {
    const container = document.getElementById('lista-eventos');

    if (!eventos || eventos.length === 0) {
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

        // Botones base
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

        let botonPrincipal = ''; 
        let botonEditar = '';
        let botonVerQR = '';
        let etiquetaFinalizado = ''; 

        if (evento.activo == 1) { 
            botonPrincipal = `<button data-action="finalizar" data-id="${evento.id}" data-nombre="${evento.nombre.replace(/"/g, '&quot;')}" style="padding: 8px 15px; background: #ec945dff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; white-space: nowrap;">Finalizar</button>`;
            botonEditar = `<button data-action="editar" data-id="${evento.id}" style="padding: 8px 15px; background: #ffc107; color: #333; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; white-space: nowrap;">Editar</button>`;
            botonVerQR = `<button data-action="qr" data-id="${evento.id}" style="padding: 8px 15px; background: #777272ff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; white-space: nowrap;">Ver QR</button>`;

        } else { 
            botonPrincipal = `<button data-action="reactivar" data-id="${evento.id}" style="padding: 8px 15px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; white-space: nowrap;">Activar</button>`;
            etiquetaFinalizado = `<span style="padding: 3px 8px; background: #6c757d; color: white; border-radius: 4px; font-weight: bold; white-space: nowrap; text-align: center; font-size: 0.9rem; margin-left: 10px;">FINALIZADO</span>`;
            botonEditar = ''; 
            botonVerQR = '';
        }
        
        container.innerHTML += `
        <div class="evento-card-admin" data-id="${evento.id}">
            <div class="evento-layout">
                
                <div class="evento-info">
                    <h3 style="margin: 0 0 10px 0; color: #003366; display: flex; align-items: center;">
                        ${evento.nombre} 
                        ${etiquetaFinalizado} 
                    </h3>
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

                <div class="evento-acciones">
                    ${botonPrincipal} 
                    ${botonEditar} 
                    ${botonEliminarHTML} 
                    ${botonVerQR} 
                    ${botonParticipantesHTML} 
                </div>

            </div>
        </div>
        `;
    });
}

/**
 * Rellena el formulario del modal con los datos de un evento (MODO EDITAR)
 * @param {object} evento - Datos del evento
 * @param {string} periodoActivoNombre - Nombre del periodo activo
 */
export function poblarFormularioParaEditar(evento, periodoActivoNombre) {
    document.getElementById('tituloModal').textContent = 'Editar Evento';
    
    // Campos básicos
    document.getElementById('evento-id').value = evento.id;
    document.getElementById('evento-nombre').value = evento.nombre;
    document.getElementById('evento-descripcion').value = evento.descripcion || '';
    document.getElementById('evento-fecha-inicio').value = evento.fecha_inicio;
    document.getElementById('evento-fecha-termino').value = evento.fecha_termino;
    document.getElementById('evento-lugar').value = evento.lugar;
    document.getElementById('evento-ubicacion-tipo').value = evento.ubicacion_tipo || '';
    document.getElementById('evento-tipo-registro').value = evento.tipo_registro || 'Individual';
    document.getElementById('evento-categoria').value = evento.categoria_deporte || '';
    document.getElementById('evento-tipo-actividad').value = evento.tipo_actividad || '';
    document.getElementById('evento-actividad').value = evento.id_actividad || '';
    document.getElementById('evento-cupo-maximo').value = evento.cupo_maximo || '';
    document.getElementById('evento-integrantes-min').value = evento.integrantes_min || '';
    document.getElementById('evento-integrantes-max').value = evento.integrantes_max || '';
    
    const periodoMostrar = evento.periodo || periodoActivoNombre || 'Sin Asignar';
    document.getElementById('evento-periodo').value = periodoMostrar;
    
    mostrarCamposEquipo(evento.tipo_registro);

    // === LÓGICA DE CAMPUS Y FACULTADES ===
    
    // 1. Marcar los Campus (Unidades)
    // Asumiendo que el evento tiene un campo 'campus_id' (único)
    const campusId = String(evento.campus_id);
    const campusCheckboxes = document.querySelectorAll('input[name="campus[]"]');
    let campusSeleccionados = [];

    campusCheckboxes.forEach(cb => {
        if (cb.value === campusId) {
            cb.checked = true;
            campusSeleccionados.push(cb.value);
        } else {
            cb.checked = false;
        }
    });

    // 2. Obtener los IDs de facultades guardadas
    // El backend devuelve 'facultades_ids' como string "1,5,8"
    let facultadesGuardadas = [];
    if (evento.facultades_ids) {
        facultadesGuardadas = String(evento.facultades_ids).split(',');
    }

    // 3. Ejecutar el filtro visual y marcar las facultades guardadas
    renderizarFacultadesFiltradas(campusSeleccionados, facultadesGuardadas);
}

/**
 * Resetea y prepara el modal para crear un nuevo evento.
 */
export function prepararModalParaCrear(periodoActivoNombre) {
    document.getElementById('tituloModal').textContent = 'Crear Nuevo Evento';
    document.getElementById('formEvento').reset();
    document.getElementById('evento-id').value = '';
    document.getElementById('evento-periodo').value = periodoActivoNombre || 'Sin Periodo Activo';
    
    mostrarCamposEquipo('Individual'); 

    // LIMPIAR CHECKBOXES DE CAMPUS
    document.querySelectorAll('input[name="campus[]"]').forEach(cb => cb.checked = false);
    
    // LIMPIAR CHECKBOXES DE FACULTADES Y MOSTRAR MENSAJE
    const containerFacultades = document.getElementById('facultades-checkbox');
    if (containerFacultades) {
        containerFacultades.innerHTML = '<p style="color: #666; font-style: italic; padding: 15px; text-align: center;">Primero selecciona una o más Unidades Académicas arriba para ver sus facultades.</p>';
    }

    document.getElementById('modalEvento').style.display = 'flex';
}

/**
 * Cierra el modal de evento.
 */
export function cerrarModal() {
    document.getElementById('modalEvento').style.display = 'none';
}

/**
 * Inicializa el textarea de descripción para que crezca automáticamente.
 */
export function inicializarTextareaAutoGrow() {
    const autoGrowTextarea = document.querySelector("#evento-descripcion");

    function autoGrow() { 
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    }

    if (autoGrowTextarea) {
        autoGrowTextarea.addEventListener('input', autoGrow); 
    }
}

// ==========================================================
// ***** FILTROS DE ADMIN (Tabla Principal) *****
// ==========================================================

export function poblarFiltroCampus(campus) {
    const select = document.getElementById('filtro-campus-admin');
    if (!select) return; 

    const opcionDefault = select.querySelector('option[value=""]');
    select.innerHTML = ''; 

    if (opcionDefault) {
        select.appendChild(opcionDefault);
    }

    campus.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
    });
}

export function poblarFiltroFacultades(facultades) {
    const select = document.getElementById('filtro-facultad-admin');
    if (!select) return; 

    const opcionDefault = select.querySelector('option[value=""]');
    select.innerHTML = ''; 

    if (opcionDefault) {
        select.appendChild(opcionDefault);
    }

    facultades.forEach(fac => {
        select.innerHTML += `<option value="${fac.id}">${fac.nombre}</option>`;
    });
}

export function poblarFiltroPeriodos(eventos) {
    const select = document.getElementById('filtro-periodo-admin');
    if (!select) return; 

    const periodos = eventos.map(evento => evento.periodo);
    const periodosUnicos = [...new Set(periodos)].filter(p => p).sort();

    const opcionDefault = select.querySelector('option[value=""]');
    select.innerHTML = ''; 
    if (opcionDefault) {
        select.appendChild(opcionDefault);
    }

    periodosUnicos.forEach(p => {
        select.innerHTML += `<option value="${p}">${p}</option>`;
    });
}

/**
 * Muestra u oculta los campos de min/max integrantes.
 */
export function mostrarCamposEquipo(tipoRegistro) {
    const camposEquipo = document.getElementById('campos-equipo-admin');
    const minInput = document.getElementById('evento-integrantes-min');
    const maxInput = document.getElementById('evento-integrantes-max');
    if (!camposEquipo || !minInput || !maxInput) return;

    if (tipoRegistro === 'Por equipos') {
        camposEquipo.style.display = 'block';
        minInput.required = true; 
    } else {
        camposEquipo.style.display = 'none';
        minInput.required = false; 
        maxInput.required = false;
        minInput.value = '';
        maxInput.value = '';
    }
}