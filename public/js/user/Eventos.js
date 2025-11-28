/**
 * Eventos.js - ACTUALIZADO
 * Carga eventos basado en la página actual (Eventos o Torneos)
 * y maneja la lógica de filtros combinados.
 */

// Variable global para guardar el filtro base de la página (ej. solo torneos)
let filtrosBase = {};

document.addEventListener("DOMContentLoaded", () => {

    const pagina = window.location.pathname.split('/').pop();

    // 1. Definir el filtro base según la página
    if (pagina === 'torneos.html') {
        filtrosBase = { tipo_actividad: 'Torneo' };
    } else if (pagina === 'eventos.html') {
        // Muestra todo EXCEPTO torneos
        filtrosBase = { excluir_tipo_actividad: 'Torneo' };
    }

    // 2. Carga inicial de eventos con el filtro base
    cargarEventos(filtrosBase); 

    // 3. SE ELIMINÓ LA LÓGICA DEL QR DE AQUÍ
    // Inscripcion.js se encargará de esto.
});

/**
 * Función global para cargar y mostrar eventos
 * @param {object} filtros - Objeto con los filtros a aplicar (ej. {tipo_actividad: 'Torneo'})
 */
function cargarEventos(filtros = {}) {
    const main = document.querySelector("main");

    // Guardar el título y la descripción
    const titulo = main.querySelector('h1');
    const descripcion = main.querySelector('p');

    // Limpiar contenido anterior pero preservar título, descripción y filtros
    const pCargando = main.querySelector('p[style*="text-align: center"]');
    if (pCargando) pCargando.remove();
    
    const tarjetasViejas = main.querySelectorAll('.evento-card');
    tarjetasViejas.forEach(tarjeta => tarjeta.remove());
    
    // Mostrar mensaje de carga
    const cargandoEl = document.createElement('p');
    cargandoEl.style.textAlign = 'center';
    cargandoEl.textContent = 'Cargando...';
    main.appendChild(cargandoEl);


    // Construir URL con filtros
    let url = "../php/public/obtenerEventos.php";

    // Convertir el objeto de filtros en parámetros de URL
    const params = new URLSearchParams(filtros);

    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            // Limpiar solo el mensaje de carga
            cargandoEl.remove();

            if (data.success && data.eventos.length > 0) {
                mostrarEventos(data.eventos);
            } else {
                main.innerHTML += '<p style="text-align: center;">No hay eventos disponibles con los filtros seleccionados.</p>';
            }
        })
        .catch(error => {
            console.error("Error:", error);
            cargandoEl.remove();
            main.innerHTML += '<p style="text-align: center; color: red;">Error al cargar eventos.</p>';
        });
}

/* public/js/user/Eventos.js */

function mostrarEventos(eventos) {
    const main = document.querySelector("main");

    // Limpiar eventos anteriores
    const tarjetasViejas = main.querySelectorAll('.evento-card');
    tarjetasViejas.forEach(tarjeta => tarjeta.remove());
    
    // Crear o seleccionar contenedor
    let contenedor = document.getElementById('lista-eventos');
    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = 'lista-eventos';
        contenedor.className = 'eventos-container'; // Clase necesaria para el grid en CSS
        main.appendChild(contenedor);
    }

    eventos.forEach(evento => {
        const tarjeta = document.createElement("div");
        tarjeta.className = "evento-card";

        // ============================================================
        // 1. ATRIBUTOS CRÍTICOS (No eliminar, Inscripcion.js los requiere)
        // ============================================================
        tarjeta.setAttribute('data-evento-id', evento.id);
        tarjeta.setAttribute('data-tipo-registro', evento.tipo_registro || 'Individual');
        tarjeta.setAttribute('data-integrantes-min', evento.integrantes_min || 8); 
        tarjeta.setAttribute('data-integrantes-max', evento.integrantes_max || 0);
        
        // NOTA: Se eliminaron los estilos inline (tarjeta.style...) para que 
        // cards.css controle el diseño.

        // ============================================================
        // 2. LÓGICA DE ESTADO Y CUPO
        // ============================================================
        let badgeHTML = '';
        let lleno = false;
        
        const cupoMaximo = parseInt(evento.cupo_maximo, 10);
        const registrosActuales = parseInt(evento.registros_actuales, 10) || 0;

        if (cupoMaximo > 0) {
            const disponibles = cupoMaximo - registrosActuales;
            
            if (disponibles <= 0) {
                lleno = true;
                badgeHTML = `<span class="badge-status lleno">Cupo Lleno</span>`;
            } else if (disponibles < 3) {
                // Aviso de últimos lugares (Amarillo/Dorado)
                badgeHTML = `<span class="badge-status" style="color:#856404; background-color:#fff3cd; border: 1px solid #ffeeba;">¡Últimos Lugares!</span>`;
            } else {
                badgeHTML = `<span class="badge-status disponible">Disponible (${disponibles})</span>`;
            }
        } else {
            badgeHTML = `<span class="badge-status disponible">Entrada Libre</span>`;
        }

        // Marca para JS: Si está lleno, ponemos el atributo data-lleno
        if (lleno) {
            tarjeta.setAttribute('data-lleno', 'true');
        }

        // Lógica de facultades (Visualización)
        const facultadInfo = evento.facultades_nombres
            ? `<div class="meta-row" style="margin-top: 8px;">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                 <span style="font-size: 0.9rem; color: #555; margin-left: 8px;"><strong>Facultad:</strong> ${evento.facultades_nombres}</span>
               </div>`
            : '';

        // ============================================================
        // 3. HTML ESTRUCTURADO (Con iconos SVG)
        // ============================================================
        tarjeta.innerHTML = `
            <div class="card-header">
                ${badgeHTML}
                <h2>${evento.nombre}</h2>
            </div>
            
            <div class="card-body">
                <p class="description">${evento.descripcion || 'Sin descripción disponible.'}</p>
                
                <div class="meta-info" style="margin-top: 15px;">
                    <div style="display: flex; align-items: center; margin-bottom: 6px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#006633" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        <span style="font-size: 0.9rem; color: #444; margin-left: 8px;">${formatearFecha(evento.fecha_inicio)} - ${formatearFecha(evento.fecha_termino)}</span>
                    </div>

                    <div style="display: flex; align-items: center; margin-bottom: 6px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#006633" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        <span style="font-size: 0.9rem; color: #444; margin-left: 8px;">${evento.lugar}</span>
                    </div>
                    
                    ${facultadInfo}
                    
                    <div style="display: flex; align-items: center; margin-top: 8px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        <span style="font-size: 0.9rem; color: #555; margin-left: 8px;">
                            <strong>Tipo:</strong> ${evento.tipo_actividad || 'General'} 
                            ${evento.categoria_deporte ? `• ${evento.categoria_deporte}` : ''}
                        </span>
                    </div>
                </div>
            </div>

            <div class="card-actions"></div>
        `;

        contenedor.appendChild(tarjeta);
    });

    // Llamada necesaria para activar los botones
    if (typeof agregarBotonesInscripcion === 'function') {
        agregarBotonesInscripcion();
    }
}

function formatearFecha(fecha) {
    if (!fecha) return 'No especificada';

    // Evitar conversión de zona horaria
    const fechaLocal = new Date(fecha + 'T00:00:00');
    const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
    return fechaLocal.toLocaleDateString('es-MX', opciones);
}