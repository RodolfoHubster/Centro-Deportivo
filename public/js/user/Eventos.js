/* js/user/Eventos.js - VERSIÓN FINAL UNIFICADA (Eventos + Torneos + Filtros + Paginación) */

let todosLosEventosPublicos = [];
let paginaActualEventos = 1;
let registrosPorPaginaEventos = 6;
let modoTorneos = false;

document.addEventListener("DOMContentLoaded", () => {
    // 1. Detección de la página (Eventos o Torneos)
    const path = window.location.pathname.toLowerCase();
    if (path.includes('torneos')) {
        modoTorneos = true;
        console.log("Modo: Torneos activos");
    } else {
        modoTorneos = false;
        console.log("Modo: Eventos generales");
    }

    // 2. Cargar los eventos de la base de datos
    cargarEventosBaseDatos();
    
    // 3. Activar los botones de filtro y paginación
    configurarListenersFiltrosYPaginacion();
});

// --- OBTENCIÓN DE DATOS ---
async function cargarEventosBaseDatos() {
    const contenedorEventos = document.getElementById('lista-eventos');
    if (contenedorEventos) {
        contenedorEventos.innerHTML = `<div style="text-align: center; width: 100%; padding: 40px;"><p>Cargando información...</p></div>`;
    }

    try {
        const respuesta = await fetch('../php/public/obtenerEventos.php');
        if (!respuesta.ok) throw new Error('Error en la red');
        const data = await respuesta.json();
        
        // Ajuste dependiendo de cómo responda tu PHP (array directo o dentro de .eventos)
        let eventosObtenidos = Array.isArray(data) ? data : (data.eventos || []);

        // Guardamos los eventos que coincidan con la página actual (Torneo o No Torneo) y que estén activos
        todosLosEventosPublicos = eventosObtenidos.filter(e => {
            if (e.activo != 1) return false;
            if (modoTorneos && e.tipo_actividad !== 'Torneo') return false;
            if (!modoTorneos && e.tipo_actividad === 'Torneo') return false;
            return true;
        });

        aplicarFiltrosPublicos(); // Dibujamos por primera vez
    } catch (error) {
        console.error('Error:', error);
        if (contenedorEventos) {
            contenedorEventos.innerHTML = `<div style="text-align: center; color: red; padding: 20px;"><p>Error al cargar los datos. Por favor intenta más tarde.</p></div>`;
        }
    }
}

// --- CONFIGURACIÓN DE LOS BOTONES DE LA INTERFAZ ---
function configurarListenersFiltrosYPaginacion() {
    const filtrosIDs = ['filtro-buscar-publico', 'filtro-campus-publico', 'filtro-categoria-publico'];
    
    filtrosIDs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => {
            paginaActualEventos = 1; // Si filtran, regresamos a página 1
            aplicarFiltrosPublicos();
        });
    });

    const btnLimpiar = document.getElementById('btnLimpiarFiltrosPublico');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            document.getElementById('filtro-buscar-publico').value = '';
            document.getElementById('filtro-campus-publico').value = '';
            document.getElementById('filtro-categoria-publico').value = '';
            paginaActualEventos = 1;
            aplicarFiltrosPublicos();
        });
    }

    // Paginación
    const selectLimite = document.getElementById('limiteRegistros');
    const btnPrev = document.getElementById('btnPrevPage');
    const btnNext = document.getElementById('btnNextPage');

    if (selectLimite) {
        selectLimite.addEventListener('change', (e) => {
            registrosPorPaginaEventos = parseInt(e.target.value);
            paginaActualEventos = 1;
            aplicarFiltrosPublicos();
        });
    }
    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            if (paginaActualEventos > 1) {
                paginaActualEventos--;
                aplicarFiltrosPublicos();
            }
        });
    }
    if (btnNext) {
        btnNext.addEventListener('click', () => {
            paginaActualEventos++;
            aplicarFiltrosPublicos();
        });
    }
}

// --- MOTOR DE BÚSQUEDA Y PAGINACIÓN ---
function aplicarFiltrosPublicos() {
    const elBuscar = document.getElementById('filtro-buscar-publico');
    const elCampus = document.getElementById('filtro-campus-publico');
    const elCategoria = document.getElementById('filtro-categoria-publico');

    const busqueda = elBuscar ? elBuscar.value.toLowerCase() : '';
    const campus = elCampus ? elCampus.value : '';
    const categoria = elCategoria ? elCategoria.value : '';

    const eventosFiltrados = todosLosEventosPublicos.filter(evento => {
        // Filtro Categoría
        if (categoria && evento.categoria_deporte !== categoria && evento.tipo_actividad !== categoria) return false;
        
        // Filtro Campus
        if (campus && !String(evento.campus_nombre || evento.campus_id).includes(campus)) return false;

        // Filtro Búsqueda
        if (busqueda) {
            const nombre = String(evento.nombre || '').toLowerCase();
            const lugar = String(evento.lugar || '').toLowerCase();
            const descripcion = String(evento.descripcion || '').toLowerCase();
            if (!nombre.includes(busqueda) && !lugar.includes(busqueda) && !descripcion.includes(busqueda)) return false;
        }
        return true;
    });

    // Cálculos de paginación
    const totalPaginas = Math.ceil(eventosFiltrados.length / registrosPorPaginaEventos) || 1;
    if (paginaActualEventos > totalPaginas) paginaActualEventos = totalPaginas;

    const infoPaginacion = document.getElementById('infoPaginacion');
    if (infoPaginacion) infoPaginacion.textContent = `Página ${paginaActualEventos} de ${totalPaginas} (Total: ${eventosFiltrados.length})`;
    
    const btnPrev = document.getElementById('btnPrevPage');
    if (btnPrev) btnPrev.disabled = (paginaActualEventos === 1);
    
    const btnNext = document.getElementById('btnNextPage');
    if (btnNext) btnNext.disabled = (paginaActualEventos >= totalPaginas);

    const inicio = (paginaActualEventos - 1) * registrosPorPaginaEventos;
    const fin = inicio + registrosPorPaginaEventos;
    const eventosPagina = eventosFiltrados.slice(inicio, fin);

    mostrarEventos(eventosPagina);
}

// --- DIBUJADO DE LAS TARJETAS (Usando tu diseño original) ---
function mostrarEventos(eventos) {
    let contenedor = document.getElementById('lista-eventos'); // Asegúrate que tu div tenga este ID en el HTML
    
    if (!contenedor) {
        const main = document.querySelector("main");
        contenedor = document.createElement('div');
        contenedor.id = 'lista-eventos';
        contenedor.className = 'eventos-container';
        if (main) main.appendChild(contenedor);
    }

    contenedor.innerHTML = ''; // Limpiamos la tabla

    if (eventos.length === 0) {
        contenedor.innerHTML = `
            <div style="text-align: center; grid-column: 1 / -1; width: 100%; padding: 40px; background-color: #f9f9f9; border-radius: 8px;">
                <p style="font-size: 1.2rem; color: #666; margin-bottom: 10px;">No hay eventos/torneos disponibles con estos filtros.</p>
            </div>
        `;
        return;
    }

    eventos.forEach(evento => {
        const tarjeta = document.createElement("div");
        tarjeta.className = "evento-card";
        tarjeta.style.cssText = "position: relative !important;"; 

        tarjeta.setAttribute('data-evento-id', evento.id);
        tarjeta.setAttribute('data-tipo-registro', evento.tipo_registro || 'Individual');
        tarjeta.setAttribute('data-integrantes-min', evento.integrantes_min || 1);
        tarjeta.setAttribute('data-integrantes-max', evento.integrantes_max || 0);

        let badgeHTML = '';
        let llenoTotal = false; 
        let equiposLlenos = false; 
        
        const cupoMaximo = parseInt(evento.cupo_maximo, 10) || 0;
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

        tarjeta.innerHTML = `
            <button onclick="toggleEventoCompleto(this, event)" style="
                position: absolute !important; top: 15px !important; right: 15px !important;
                width: 30px !important; height: 30px !important; background: transparent !important;
                border: none !important; box-shadow: none !important; font-size: 1.5rem !important;
                color: #555 !important; cursor: pointer !important; z-index: 100 !important;
                padding: 0 !important; margin: 0 !important; display: flex !important;
                align-items: center !important; justify-content: center !important;
                transition: transform 0.3s ease !important; outline: none !important;">
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

    if (typeof agregarBotonesInscripcion === 'function') {
        agregarBotonesInscripcion();
    }
}

function formatearFecha(fecha) {
    if (!fecha) return 'No definida';
    const fechaObj = new Date(fecha + 'T00:00:00');
    return fechaObj.toLocaleDateString('es-MX', { 
        day: 'numeric', month: 'short', year: 'numeric' 
    });
}

// Lógica para desplegar la tarjeta
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