// public/js/ui/uiEventos.js

// Este JS solo usa el HTML, solo recibe los datos y los acomoda en la pantalla

// IMPORTS
import { formatearFecha } from '../utils/utilidades.js';

// Variable global dentro del módulo para almacenar las facultades descargadas
let todasLasFacultades = [];
let todasLasCarreras = [];

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
    
    // ESTILOS DELEGADOS AL CSS EXTERNO
    
    // RENDERIZAR TODOS LOS CAMPUS
    campus.forEach(c => {
        const codigoHTML = (c.codigo && String(c.codigo).toLowerCase() !== 'null') ? `<span class="siglas">${c.codigo}</span>` : '';
        container.innerHTML += `
        <label class="checkbox-item">
            <input type="checkbox" name="campus[]" value="${c.id}">
            <span class="nombre">${c.nombre}</span> 
            ${codigoHTML}
        </label>
        `;
    });
}

/**
 * Guarda la lista original de facultades y muestra el mensaje inicial.
 * @param {Array} facultades - Lista completa de facultades.
 */
export function poblarCheckboxesFacultades(facultades, carreras = []) {
    todasLasFacultades = facultades; // Guardamos en memoria
    todasLasCarreras = carreras;
    
    const container = document.getElementById('facultades-checkbox');
    if (container) {
        // Mensaje inicial esperando selección de campus
        container.innerHTML = '<p style="grid-column: 1 / -1; width: 100%; color: #666; font-style: italic; padding: 15px; text-align: center;">Primero selecciona una o más Unidades Académicas arriba para ver sus facultades.</p>';
    }
}

/**
 * Función de FILTRADO DINÁMICO: Renderiza las facultades en el modal,
 * aplicando el filtro por campus seleccionado y manteniendo la selección anterior.
 * Para Pausas Activas implementa el flujo: Facultad (checkbox) → Carreras (checkboxes) → Cupos.
 * @param {Array} campusIds - Array de IDs de campus seleccionados.
 * @param {Array} [facultadesSeleccionadas=[]] - IDs de facultades que deben permanecer marcadas (al editar).
 * @param {Object} [cuposGuardados={}] - Mapa { carrera_id: { hombres, mujeres } } con valores al editar.
 * @param {Array} [carrerasSeleccionadas=[]] - IDs de carreras que deben permanecer marcadas (al editar).
 */
export function renderizarFacultadesFiltradas(campusIds, facultadesSeleccionadas = [], cuposGuardados = {}, carrerasSeleccionadas = []) {
    const container = document.getElementById('facultades-checkbox');
    if (!container) return;

    if (todasLasFacultades.length === 0) {
        container.innerHTML = '<p style="color:red;font-weight:bold;">Error: No se pudo cargar la lista de Facultades.</p>';
        return;
    }

    if (!campusIds || campusIds.length === 0) {
        container.innerHTML = '<p style="color:#666;font-style:italic;padding:15px;text-align:center;">Selecciona una o más Unidades Académicas arriba para ver sus facultades.</p>';
        return;
    }

    const facultadesMostrar = todasLasFacultades.filter(f => campusIds.includes(String(f.campus_id)));

    if (facultadesMostrar.length === 0) {
        container.innerHTML = '<p style="color:#003366;font-style:italic;padding:10px;">No hay facultades asociadas a las unidades seleccionadas.</p>';
        return;
    }

    const tipoCreacionInput = document.getElementById('tipo_creacion');
    const esPausaActiva = tipoCreacionInput && tipoCreacionInput.value === 'pausa_activa';

    container.innerHTML = '';

    if (esPausaActiva) {
        // ─── MODO PAUSA ACTIVA: Acordeón cascada ──────────────────────────────
        container.style.cssText = `
            display: flex !important;
            flex-direction: column !important;
            gap: 6px !important;
            max-height: 480px !important;
            overflow-y: auto !important;
            padding: 8px !important;
            border: 1px solid #dde3ed !important;
            border-radius: 8px !important;
            background: #f4f7fb !important;
        `;

        facultadesMostrar.forEach(facultad => {
            const facId = facultad.id;
            const facChecked = facultadesSeleccionadas.includes(String(facId)) || facultadesSeleccionadas.includes(facId);
            const carrerasFacultad = todasLasCarreras.filter(c => c.facultad_id == facId);

            // ── 1. Crear la tarjeta de facultad ──────────────────────────────
            const facCard = document.createElement('div');
            facCard.style.cssText = `
                background:#fff;
                border:1px solid ${facChecked ? '#a8c8f8' : '#dde3ed'};
                border-radius:8px;
                overflow:hidden;
                flex: none;
                transition:border-color 0.2s, height 0.2s;
            `;

            // ── 2. Header de la facultad ──────────────────────────────────────
            // IMPORTANTE: el checkbox NO está dentro del <label> para evitar
            // el bug de doble-toggle que tiene el navegador.
            const headerEl = document.createElement('div');
            headerEl.style.cssText = `
                display:flex;
                align-items:center;
                gap:10px;
                padding:10px 14px;
                cursor:pointer;
                background:${facChecked ? '#e8f1fd' : '#fff'};
                border-bottom:${facChecked ? '1px solid #c8dcfa' : '1px solid transparent'};
                user-select:none;
                transition:background 0.2s;
            `;
            headerEl.innerHTML = `
                <input type="checkbox"
                       name="facultades[]"
                       value="${facId}"
                       class="chk-fac"
                       data-fac-id="${facId}"
                       ${facChecked ? 'checked' : ''}
                       style="width:17px;height:17px;cursor:pointer;flex-shrink:0;"
                       onclick="event.stopPropagation()">
                <span style="font-weight:600;font-size:0.95em;color:#1a3a5c;flex:1;">${facultad.nombre}</span>
                <span style="color:#7a9cc8;font-size:0.8em;margin-right:4px;">(${facultad.siglas})</span>
                <span class="fac-chevron" style="font-size:0.85em;color:#7a9cc8;transition:transform 0.2s;transform:${facChecked ? 'rotate(180deg)' : 'rotate(0deg)'};">▼</span>
            `;
            facCard.appendChild(headerEl);

            // ── 3. Cuerpo de carreras (colapsable) ────────────────────────────
            const bodyEl = document.createElement('div');
            bodyEl.id = `carreras-fac-${facId}`;
            bodyEl.style.cssText = `
                display:${facChecked ? 'flex' : 'none'};
                flex-direction:column;
                gap:6px;
                padding:${facChecked ? '10px 14px' : '0 14px'};
                background:#fbfcff;
            `;

            if (carrerasFacultad.length > 0) {
                carrerasFacultad.forEach(carrera => {
                    const carId = carrera.id;
                    const nombreCarrera = carrera.nombre_completo || carrera.nombre;
                    const carChecked = carrerasSeleccionadas.includes(String(carId)) || carrerasSeleccionadas.includes(carId);
                    const cupoH = cuposGuardados[carId] ? cuposGuardados[carId].hombres : '';
                    const cupoM = cuposGuardados[carId] ? cuposGuardados[carId].mujeres : '';

                    const carRow = document.createElement('div');
                    carRow.className = 'car-row-pausa';
                    carRow.style.cssText = `
                        border:1px solid ${carChecked ? '#b3d1fa' : '#e5eaf2'};
                        border-radius:6px;
                        background:${carChecked ? '#f0f7ff' : '#fff'};
                        overflow:hidden;
                        transition:border-color 0.2s,background 0.2s;
                    `;
                    carRow.innerHTML = `
                        <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:pointer;"
                             onclick="event.stopPropagation()">
                            <input type="checkbox"
                                   class="chk-car"
                                   name="carreras_habilitadas[]"
                                   value="${carId}"
                                   data-car-id="${carId}"
                                   ${carChecked ? 'checked' : ''}
                                   style="width:15px;height:15px;cursor:pointer;flex-shrink:0;"
                                   onclick="event.stopPropagation()">
                            <span style="font-size:0.88em;color:#2d4a6e;flex:1;">${nombreCarrera}</span>
                        </div>
                        <div id="cupos-car-${carId}"
                             style="display:${carChecked ? 'flex' : 'none'};gap:12px;padding:6px 10px 10px 33px;flex-wrap:wrap;background:#e8f1fd;border-top:1px solid #c8dcfa;">
                            <label style="display:flex;flex-direction:column;gap:3px;font-size:0.78em;font-weight:600;color:#3a5a8c;">
                                <span>♀ Mujeres</span>
                                <input type="number"
                                       name="cupos[${carId}][mujeres]"
                                       value="${cupoM}"
                                       placeholder="0" min="0"
                                       ${carChecked ? '' : 'disabled'}
                                       style="width:72px;padding:5px 7px;border:1px solid #a8c8f8;border-radius:5px;font-size:1em;text-align:center;">
                            </label>
                            <label style="display:flex;flex-direction:column;gap:3px;font-size:0.78em;font-weight:600;color:#3a5a8c;">
                                <span>♂ Hombres</span>
                                <input type="number"
                                       name="cupos[${carId}][hombres]"
                                       value="${cupoH}"
                                       placeholder="0" min="0"
                                       ${carChecked ? '' : 'disabled'}
                                       style="width:72px;padding:5px 7px;border:1px solid #a8c8f8;border-radius:5px;font-size:1em;text-align:center;">
                            </label>
                        </div>
                    `;
                    bodyEl.appendChild(carRow);
                });
            } else {
                bodyEl.innerHTML = '<p style="font-size:0.82em;color:#aaa;padding:4px 0;">No hay carreras registradas en esta facultad.</p>';
            }

            facCard.appendChild(bodyEl);
            container.appendChild(facCard);

            // ── 4. Evento: TOGGLE del header (click en el div del header) ─────
            // Clic en el área del header (no en el checkbox) → solo colapsa/expande
            headerEl.addEventListener('click', () => {
                const isOpen = bodyEl.style.display !== 'none';
                if (isOpen) {
                    bodyEl.style.display = 'none';
                    bodyEl.style.padding = '0 14px';
                    headerEl.querySelector('.fac-chevron').style.transform = 'rotate(0deg)';
                } else {
                    bodyEl.style.display = 'flex';
                    bodyEl.style.padding = '10px 14px';
                    headerEl.querySelector('.fac-chevron').style.transform = 'rotate(180deg)';
                }
            });

            // ── 5. Evento: CHECKBOX de facultad ───────────────────────────────
            const chkFac = headerEl.querySelector('.chk-fac');
            chkFac.addEventListener('change', () => {
                if (chkFac.checked) {
                    // Marcar → expandir y resaltar
                    bodyEl.style.display = 'flex';
                    bodyEl.style.padding = '10px 14px';
                    headerEl.style.background = '#e8f1fd';
                    headerEl.style.borderBottom = '1px solid #c8dcfa';
                    facCard.style.borderColor = '#a8c8f8';
                    headerEl.querySelector('.fac-chevron').style.transform = 'rotate(180deg)';
                } else {
                    // Desmarcar → colapsar y limpiar todas las carreras
                    bodyEl.style.display = 'none';
                    bodyEl.style.padding = '0 14px';
                    headerEl.style.background = '#fff';
                    headerEl.style.borderBottom = '1px solid transparent';
                    facCard.style.borderColor = '#dde3ed';
                    headerEl.querySelector('.fac-chevron').style.transform = 'rotate(0deg)';

                    bodyEl.querySelectorAll('.chk-car').forEach(cChk => {
                        cChk.checked = false;
                        const cuposDiv = bodyEl.querySelector(`#cupos-car-${cChk.dataset.carId}`);
                        if (cuposDiv) {
                            cuposDiv.style.display = 'none';
                            cuposDiv.querySelectorAll('input[type="number"]').forEach(i => { i.disabled = true; i.value = ''; });
                        }
                        const carRowEl = cChk.closest('.car-row-pausa');
                        if (carRowEl) { carRowEl.style.borderColor = '#e5eaf2'; carRowEl.style.background = '#fff'; }
                    });
                }
            });

            // ── 6. Evento: CHECKBOX de cada carrera ───────────────────────────
            bodyEl.querySelectorAll('.chk-car').forEach(chkCar => {
                chkCar.addEventListener('change', () => {
                    const carId = chkCar.dataset.carId;
                    const cuposDiv = document.getElementById(`cupos-car-${carId}`);
                    const carRowEl = chkCar.closest('.car-row-pausa');

                    if (chkCar.checked) {
                        if (cuposDiv) {
                            cuposDiv.style.display = 'flex';
                            cuposDiv.querySelectorAll('input[type="number"]').forEach(i => i.disabled = false);
                        }
                        if (carRowEl) { carRowEl.style.borderColor = '#b3d1fa'; carRowEl.style.background = '#f0f7ff'; }
                    } else {
                        if (cuposDiv) {
                            cuposDiv.style.display = 'none';
                            cuposDiv.querySelectorAll('input[type="number"]').forEach(i => { i.disabled = true; i.value = ''; });
                        }
                        if (carRowEl) { carRowEl.style.borderColor = '#e5eaf2'; carRowEl.style.background = '#fff'; }
                    }
                });
            });
        });

    } else {
        // ─── MODO EVENTO NORMAL: grid compacto ────────────────────────────────
        container.style.cssText = `
            display: grid !important;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)) !important;
            gap: 10px !important;
            max-height: 180px !important;
            overflow-y: auto !important;
            padding: 10px !important;
            border: 1px solid #eee !important;
            border-radius: 6px !important;
            background: #f9f9f9 !important;
        `;
        facultadesMostrar.forEach(facultad => {
            const isChecked = facultadesSeleccionadas.includes(String(facultad.id)) || facultadesSeleccionadas.includes(facultad.id) ? 'checked' : '';
            container.innerHTML += `
                <label style="display:flex;align-items:center;padding:8px;cursor:pointer;border-radius:3px;">
                    <input type="checkbox" name="facultades[]" value="${facultad.id}" ${isChecked} style="margin-right:10px;">
                    <span style="font-weight:500;">${facultad.nombre}</span>
                    <span style="color:#666;margin-left:5px;">(${facultad.siglas})</span>
                </label>
            `;
        });
    }
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
        const botonEvidenciasHTML = `<a href="subir-evidencia.html?id=${evento.id}" class="btn-participantes" style="display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 8px 15px; background-color: #17a2b8; color: white; text-decoration: none; border-radius: 5px; font-size: 13.3333px; font-weight: bold; border: none; cursor: pointer; transition: background 0.2s; white-space: nowrap; font-family: Arial;">
                                <i class="fas fa-camera"></i> Evidencias
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
                    
                    <button class="btn-expandir-tarjeta">
                        <span>Mostrar más detalles y acciones</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>

                    <div class="evento-detalles-extra">
                        <p style="margin: 15px 0 5px 0; color: #666;">${evento.descripcion || 'Sin descripción'}</p>
                        
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
                </div>

                <div class="evento-acciones">
                    ${botonPrincipal} 
                    ${botonEditar} 
                    ${botonEvidenciasHTML} ${botonEliminarHTML}
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

    // 2. LÓGICA DE DÍAS DE JUEGO (Limpiar y marcar)
    const todosLosChecksDias = document.querySelectorAll('input[name="dias_juego[]"]');
    todosLosChecksDias.forEach(check => check.checked = false);

    // Marcar los días si existen (ahora funciona para Individual y Por equipos)
    if (evento.dias_juego) {
        const diasSeleccionados = String(evento.dias_juego).split(',');
        diasSeleccionados.forEach(dia => {
            const checkbox = document.querySelector(`input[name="dias_juego[]"][value="${dia.trim()}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }

    mostrarCamposEquipo(evento.tipo_registro);

    // Establecer tipo_creacion ANTES de llamar renderizarFacultadesFiltradas
    // para que la función sepa si debe renderizar el modo Pausa Activa.
    const inputTipoCreacionEdit = document.getElementById('tipo_creacion');
    if (inputTipoCreacionEdit) inputTipoCreacionEdit.value = evento.tipo_creacion || 'evento';

    // === LÓGICA DE CAMPUS Y FACULTADES ===

    // 1. Marcar los Campus (Unidades)
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

    // 2. Para eventos normales: usar facultades_ids del evento
    // Para pausas activas: cargar cupos guardados desde el backend
    if (evento.tipo_creacion === 'pausa_activa') {
        // Cargar cupos de carreras habilitadas para pre-poblar el modal
        fetch(`../../php/admin/obtenerCuposPausaActiva.php?evento_id=${evento.id}`)
            .then(r => r.json())
            .then(data => {
                const cuposGuardados    = data.success ? data.cupos        : {};
                const carrerasIds       = data.success ? data.carrerasIds  : [];
                const facultadesIds     = data.success ? data.facultadesIds.map(String) : [];
                renderizarFacultadesFiltradas(campusSeleccionados, facultadesIds, cuposGuardados, carrerasIds.map(String));
            })
            .catch(() => {
                renderizarFacultadesFiltradas(campusSeleccionados, [], {}, []);
            });
    } else {
        let facultadesGuardadas = [];
        if (evento.facultades_ids) {
            facultadesGuardadas = String(evento.facultades_ids).split(',');
        }
        renderizarFacultadesFiltradas(campusSeleccionados, facultadesGuardadas);
    }
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
        containerFacultades.innerHTML = '<p style="grid-column: 1 / -1; width: 100%; color: #666; font-style: italic; padding: 15px; text-align: center;">Primero selecciona una o más Unidades Académicas arriba para ver sus facultades.</p>';
    }
    
    // Limpiar barra de búsqueda de facultades
    const searchFacultad = document.getElementById('buscar-facultad-modal');
    if (searchFacultad) searchFacultad.value = '';

    document.getElementById('modalEvento').style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Bloquear scroll de fondo
    capturarEstadoFormulario();
}

/**
 * Cierra el modal de evento.
 * @param {boolean} forzar - Si es true, ignora los cambios sin guardar (ej. al guardar con éxito)
 */
export function cerrarModal(forzar = false) {
    if (forzar !== true) {
        const form = document.getElementById('formEvento');
        if (form) {
            const estadoActual = new URLSearchParams(new FormData(form)).toString();
            if (estadoActual !== estadoFormularioInicial) {
                if (!confirm('¿Seguro que quieres salir? Hay datos que no se han guardado.')) {
                    return; // Detener el cierre del modal
                }
            }
        }
    }
    document.getElementById('modalEvento').style.display = 'none';
    document.body.style.overflow = ''; // Restaurar scroll de fondo
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