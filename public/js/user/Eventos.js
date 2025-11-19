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

    // Esto le dice al PHP que aplique los filtros de periodo activo y cupo lleno
    filtros.modo = 'usuario';
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

function mostrarEventos(eventos) {
    const main = document.querySelector("main");

    // Limpiar solo los eventos anteriores, no el título/descripción/filtros
    const tarjetasViejas = main.querySelectorAll('.evento-card');
    tarjetasViejas.forEach(tarjeta => tarjeta.remove());
    
    // Si no existe el contenedor, lo creamos
    let contenedor = document.getElementById('lista-eventos');
    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = 'lista-eventos';
        main.appendChild(contenedor);
    }

    eventos.forEach(evento => {
        const tarjeta = document.createElement("div");
        tarjeta.className = "evento-card";
        tarjeta.setAttribute('data-evento-id', evento.id);
        tarjeta.setAttribute('data-tipo-registro', evento.tipo_registro || 'Individual');
        tarjeta.setAttribute('data-integrantes-min', evento.integrantes_min || 8); 
        tarjeta.setAttribute('data-integrantes-max', evento.integrantes_max || 0);

        tarjeta.style.border = "1px solid #ccc";
        tarjeta.style.borderRadius = "8px";
        tarjeta.style.padding = "15px";
        tarjeta.style.margin = "10px 0";
        tarjeta.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)";
        tarjeta.style.backgroundColor = "#f9f9f9";

        // --- LÓGICA DE CUPO ---
        let cupoInfo = '';
        let lleno = false;
        
        const cupoMaximo = parseInt(evento.cupo_maximo, 10);
        const registrosActuales = parseInt(evento.registros_actuales, 10) || 0;

        if (cupoMaximo > 0) {
            const disponibles = cupoMaximo - registrosActuales;
            const cupoColor = disponibles > 0 ? '#28a745' : '#dc3545';
            cupoInfo = `
                <p><strong>Cupo:</strong> 
                    <span style="color: ${cupoColor}; font-weight: bold;">
                        ${disponibles > 0 ? `${registrosActuales} / ${cupoMaximo}` : 'CUPO LLENO'}
                    </span>
                </p>
            `;
            if (disponibles <= 0) {
                lleno = true;
            }
        } else {
            cupoInfo = `<p><strong>Cupo:</strong> ${registrosActuales} (Sin límite)</p>`;
        }

        // ===== ¡MARCAMOS LA TARJETA SI ESTÁ LLENA! =====
        if (lleno) {
            tarjeta.setAttribute('data-lleno', 'true');
        }

        // --- LÓGICA DE FACULTADES (CORREGIDO) ---
        const facultadInfo = evento.facultades_nombres
            ? `<p><strong>Facultades:</strong> ${evento.facultades_nombres}</p>` 
            : '<p><strong>Facultades:</strong> Abierto a todas</p>';

        // --- (Otros campos info) ---
        const tipoRegistroInfo = evento.tipo_registro 
            ? `<p><strong>Tipo de registro:</strong> ${evento.tipo_registro}</p>` 
            : '';
        const categoriaInfo = evento.categoria_deporte 
            ? `<p><strong>Categoría:</strong> ${evento.categoria_deporte}</p>` 
            : '';
        const tipoActividadInfo = evento.tipo_actividad 
            ? `<p><strong>Tipo:</strong> ${evento.tipo_actividad}</p>` 
            : '';

        // --- HTML de la tarjeta ---
        tarjeta.innerHTML = `
            <h2>${evento.nombre}</h2>
            <p><strong>Descripción:</strong> ${evento.descripcion || 'Sin descripción'}</p>
            <p><strong>Fecha inicio:</strong> ${formatearFecha(evento.fecha_inicio)}</p>
            <p><strong>Fecha término:</strong> ${formatearFecha(evento.fecha_termino)}</p>
            <p><strong>Lugar:</strong> ${evento.lugar}</p>
            ${facultadInfo} ${tipoActividadInfo}
            ${categoriaInfo}
            ${tipoRegistroInfo}
            ${cupoInfo}
            <p><strong>Actividad:</strong> ${evento.actividad || 'No especificada'}</p>
            
            <div class="card-actions"></div>
        `;

        contenedor.appendChild(tarjeta);
    });

    // Esta función SIEMPRE se llama
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