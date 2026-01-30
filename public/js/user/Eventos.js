/* js/user/Eventos.js - VERSIÓN FINAL CONECTADA A BD */

// Variable global para filtros
let filtrosBase = {};

document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Detección robusta de la página (convierte a minúsculas y busca palabras clave)
    const path = window.location.pathname.toLowerCase();

    // Limpiamos los filtros base antes de asignar
    filtrosBase = {}; 

    if (path.includes('torneos.html')) {
        // Si la URL dice "torneos" (con o sin .html), mostramos SOLO torneos
        filtrosBase = { tipo_actividad: 'torneo' };
        console.log("Modo: Torneos activos"); // Debug para consola
    } else if (path.includes('eventos')) {
        // Si la URL dice "eventos", ocultamos los torneos
        filtrosBase = { excluir_tipo_actividad: 'torneo' };
        console.log("Modo: Eventos generales"); // Debug para consola
    }

    const selectCampus = document.getElementById('filtro-campus');
    
    // 2. Carga inicial
    aplicarFiltrosCampus();

    // 3. Escuchar cambios en el filtro
    if (selectCampus) {
        selectCampus.addEventListener('change', () => {
            aplicarFiltrosCampus();
        });
    }
});

function aplicarFiltrosCampus() {
    const select = document.getElementById('filtro-campus');
    const valorCampus = select ? select.value : '';
    
    // Mezclamos el filtro base con el campus seleccionado
    const filtrosFinales = { ...filtrosBase };

    if (valorCampus) {
        filtrosFinales.campus = valorCampus;
    }

    cargarEventos(filtrosFinales);
}

/**
 * Función principal para obtener datos del servidor
 */
function cargarEventos(filtros = {}) {
    const contenedorEventos = document.getElementById('lista-eventos');
    if (!contenedorEventos) return;

    // Mostrar mensaje de carga
    contenedorEventos.innerHTML = `
        <div style="text-align: center; width: 100%; padding: 40px;">
            <p>Cargando eventos...</p>
        </div>
    `;

    // Construir URL con parámetros
    let url = "../php/public/obtenerEventos.php";
    const params = new URLSearchParams(filtros);
    const queryString = params.toString();
    
    if (queryString) {
        url += `?${queryString}`;
    }

    // --- CONEXIÓN REAL A LA BASE DE DATOS ---
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Error en la red al obtener eventos');
            }
            return response.json();
        })
        .then(data => {
            // Limpiamos el mensaje de carga
            contenedorEventos.innerHTML = '';

            if (data.success && Array.isArray(data.eventos) && data.eventos.length > 0) {
                mostrarEventos(data.eventos);
            } else {
                // Mensaje si no hay eventos en la BD para esos filtros
                contenedorEventos.innerHTML = `
                    <div style="text-align: center; width: 100%; padding: 40px; background-color: #f9f9f9; border-radius: 8px;">
                        <p style="font-size: 1.2rem; color: #666; margin-bottom: 10px;">
                            No hay eventos disponibles con estos filtros.
                        </p>
                        <small style="color: #999;">Intenta seleccionar "Todos los Campus" u otra categoría.</small>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            contenedorEventos.innerHTML = `
                <div style="text-align: center; color: red; padding: 20px;">
                    <p>Error al cargar los eventos. Por favor intenta más tarde.</p>
                </div>
            `;
        });
}

/**
 * Renderiza las tarjetas con el diseño aprobado (Botón en esquina + Toggle)
 */
function mostrarEventos(eventos) {
    const main = document.querySelector("main");
    let contenedor = document.getElementById('lista-eventos');
    
    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = 'lista-eventos';
        contenedor.className = 'eventos-container';
        main.appendChild(contenedor);
    }

    eventos.forEach(evento => {
        const tarjeta = document.createElement("div");
        tarjeta.className = "evento-card";
        
        // POSICIÓN RELATIVA OBLIGATORIA
        tarjeta.style.cssText = "position: relative !important;"; 

        // 1. ATRIBUTOS DATA (Para Inscripcion.js)
        tarjeta.setAttribute('data-evento-id', evento.id);
        tarjeta.setAttribute('data-tipo-registro', evento.tipo_registro || 'Individual');
        tarjeta.setAttribute('data-integrantes-min', evento.integrantes_min || 1);
        tarjeta.setAttribute('data-integrantes-max', evento.integrantes_max || 0);

        // 2. LÓGICA DE ESTADO (Badges)
        let badgeHTML = '';
        let llenoTotal = false; 
        let equiposLlenos = false; 
        
        const cupoMaximo = parseInt(evento.cupo_maximo, 10) || 0;
        // Usamos el campo calculado por el servidor si existe, sino 0
        const registrosActuales = parseInt(evento.registros_actuales, 10) || 0;
        const esPorEquipo = evento.tipo_registro === 'Por equipos';

        if (cupoMaximo > 0) {
            const disponibles = cupoMaximo - registrosActuales;
            if (disponibles <= 0) {
                if (esPorEquipo) {
                    equiposLlenos = true;
                    badgeHTML = `<span class="badge-status" style="color:#856404; background-color:#fff3cd; border: 1px solid #ffeeba;">Equipos Completos (Solo Unirse)</span>`;
                } else {
                    llenoTotal = true;
                    badgeHTML = `<span class="badge-status lleno">Cupo Lleno</span>`;
                }
            } else if (disponibles < 3) {
                badgeHTML = `<span class="badge-status" style="color:#856404; background-color:#fff3cd; border: 1px solid #ffeeba;">¡Últimos Lugares!</span>`;
            } else {
                badgeHTML = `<span class="badge-status disponible">Disponible (${disponibles})</span>`;
            }
        } else {
            badgeHTML = `<span class="badge-status disponible">Entrada Libre</span>`;
        }

        if (llenoTotal) tarjeta.setAttribute('data-lleno', 'true');
        if (equiposLlenos) tarjeta.setAttribute('data-equipos-llenos', 'true');

        const facultadInfo = evento.facultades_nombres
            ? `<div class="meta-row" style="margin-top: 8px;">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                 <span style="font-size: 0.9rem; color: #555; margin-left: 8px;"><strong>Facultad:</strong> ${evento.facultades_nombres}</span>
               </div>`
            : '';

        // 3. HTML BLINDADO (Botón Toggle + Contenido Oculto)
        tarjeta.innerHTML = `
            <button onclick="toggleEventoCompleto(this, event)" style="
                position: absolute !important;
                top: 15px !important;
                right: 15px !important;
                width: 30px !important; 
                height: 30px !important;
                background: transparent !important;
                border: none !important;
                box-shadow: none !important;
                font-size: 1.5rem !important;
                color: #555 !important;
                cursor: pointer !important;
                z-index: 100 !important;
                padding: 0 !important;
                margin: 0 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                transition: transform 0.3s ease !important;
                outline: none !important;">
                ▼
            </button>

            <div class="card-header" style="padding-right: 40px;">
                ${badgeHTML}
                <h2 style="margin-top: 5px;">${evento.nombre}</h2>
            </div>
            
            <div class="card-body">
                <div class="info-visible" style="margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; margin-bottom: 6px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#006633" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        <span style="font-size: 0.9rem; color: #444; margin-left: 8px;">
                            ${formatearFecha(evento.fecha_inicio)} - ${formatearFecha(evento.fecha_termino)}
                        </span>
                    </div>

                    <div style="display: flex; align-items: center; margin-bottom: 6px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#006633" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        <span style="font-size: 0.9rem; color: #444; margin-left: 8px;">${evento.lugar}</span>
                    </div>
                </div>

                <div class="evento-contenido-oculto" style="display: none; border-top: 1px solid #eee; padding-top: 15px; margin-top: 10px;">
                    <p class="description" style="margin-bottom: 15px; color: #333;">${evento.descripcion || 'Sin descripción disponible.'}</p>
                    
                    <div class="meta-extra">
                        ${facultadInfo}
                        <div style="display: flex; align-items: center; margin-top: 8px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                            <span style="font-size: 0.9rem; color: #555; margin-left: 8px;">
                                <strong>Tipo:</strong> ${evento.tipo_actividad || 'General'} 
                                ${evento.categoria_deporte ? `• ${evento.categoria_deporte}` : ''}
                            </span>
                        </div>
                    </div>

                    <div class="card-actions" style="margin-top: 20px;"></div>
                </div>
            </div>
        `;

        contenedor.appendChild(tarjeta);
    });

    // Reactivar funcionalidad de inscripciones si existe
    if (typeof agregarBotonesInscripcion === 'function') {
        agregarBotonesInscripcion();
    }
}

function formatearFecha(fecha) {
    if (!fecha) return 'No definida';
    // Crear fecha sin conversión de zona horaria (tratamos el string como local)
    const fechaObj = new Date(fecha + 'T00:00:00');
    return fechaObj.toLocaleDateString('es-MX', { 
        day: 'numeric', month: 'short', year: 'numeric' 
    });
}

// ==========================================
// FUNCIÓN DE TOGGLE (GLOBAL)
// ==========================================
window.toggleEventoCompleto = function(btn, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    const tarjeta = btn.closest('.evento-card');
    const contenido = tarjeta.querySelector('.evento-contenido-oculto');
    
    if (contenido.style.display === 'none') {
        contenido.style.display = 'block';
        btn.style.transform = 'rotate(180deg)';
    } else {
        contenido.style.display = 'none';
        btn.style.transform = 'rotate(0deg)';
    }
};