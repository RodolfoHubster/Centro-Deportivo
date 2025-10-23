/**
 * Eventos.js - ACTUALIZADO
 * Incluye nuevos campos: campus, tipo_registro, categoria_deporte, etc.
 */

document.addEventListener("DOMContentLoaded", () => {
    cargarEventos();
    
    const params = new URLSearchParams(window.location.search);
    const eventoId = params.get('id_evento');

    if (eventoId) {
        // Si viene de un QR, mostrar el formulario
        mostrarFormularioInscripcion(eventoId);
        // Scroll al evento después de que carguen
        setTimeout(() => {
            const tarjeta = document.querySelector(`[data-evento-id="${eventoId}"]`);
            if(tarjeta) tarjeta.scrollIntoView({behavior: "smooth", block: "center"});
        }, 500);
    }
});

function cargarEventos(filtros = {}) {
    const main = document.querySelector("main");
    
    // Mostrar mensaje de carga
    main.innerHTML = '<p style="text-align: center;">Cargando eventos...</p>';
    
    // Construir URL con filtros
    let url = "../Back-End-PHP/obtenerEventos.php";
    const params = new URLSearchParams();
    
    // Aplicar filtros si existen
    if (filtros.tipo) params.append('tipo', filtros.tipo);
    if (filtros.campus_id) params.append('campus_id', filtros.campus_id);
    if (filtros.categoria) params.append('categoria', filtros.categoria);
    if (filtros.tipo_actividad) params.append('tipo_actividad', filtros.tipo_actividad);
    
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.eventos.length > 0) {
                mostrarEventos(data.eventos);
            } else {
                main.innerHTML = '<p style="text-align: center;">No hay eventos disponibles con los filtros seleccionados.</p>';
            }
        })
        .catch(error => {
            console.error("Error:", error);
            main.innerHTML = '<p style="text-align: center; color: red;">Error al cargar eventos.</p>';
        });
}

function mostrarEventos(eventos) {
    const main = document.querySelector("main");
    
    // Mantener el título y descripción
    const titulo = main.querySelector('h1');
    const descripcion = main.querySelector('p');
    
    main.innerHTML = "";
    
    if (titulo) main.appendChild(titulo);
    if (descripcion) main.appendChild(descripcion);
    
    eventos.forEach(evento => {
        const tarjeta = document.createElement("div");
        tarjeta.className = "evento-card";
        tarjeta.setAttribute('data-evento-id', evento.id);
        tarjeta.style.cursor = "pointer";
        tarjeta.style.border = "1px solid #ccc";
        tarjeta.style.borderRadius = "8px";
        tarjeta.style.padding = "15px";
        tarjeta.style.margin = "10px 0";
        tarjeta.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)";
        tarjeta.style.backgroundColor = "#f9f9f9";
        
        // Calcular cupo disponible
        let cupoInfo = '';
        if (evento.cupo_maximo) {
            const disponibles = evento.cupo_maximo - (evento.registros_actuales || 0);
            const cupoColor = disponibles > 0 ? '#28a745' : '#dc3545';
            cupoInfo = `
                <p><strong>Cupo:</strong> 
                    <span style="color: ${cupoColor}; font-weight: bold;">
                        ${disponibles > 0 ? `${disponibles} lugares disponibles` : 'CUPO LLENO'}
                    </span>
                </p>
            `;
        }
        
        // Información de campus (si existe)
        const campusInfo = evento.campus_nombre 
            ? `<p><strong>Campus:</strong> ${evento.campus_nombre}</p>` 
            : '';
        
        // Tipo de registro
        const tipoRegistroInfo = evento.tipo_registro 
            ? `<p><strong>Tipo de registro:</strong> ${evento.tipo_registro}</p>` 
            : '';
        
        // Categoría deportiva
        const categoriaInfo = evento.categoria_deporte 
            ? `<p><strong>Categoría:</strong> ${evento.categoria_deporte}</p>` 
            : '';
        
        // Tipo de actividad
        const tipoActividadInfo = evento.tipo_actividad 
            ? `<p><strong>Tipo:</strong> ${evento.tipo_actividad}</p>` 
            : '';
        
        tarjeta.innerHTML = `
            <h2>${evento.nombre}</h2>
            <p><strong>Descripción:</strong> ${evento.descripcion || 'Sin descripción'}</p>
            <p><strong>Fecha inicio:</strong> ${formatearFecha(evento.fecha_inicio)}</p>
            <p><strong>Fecha término:</strong> ${formatearFecha(evento.fecha_termino)}</p>
            <p><strong>Lugar:</strong> ${evento.lugar}</p>
            ${campusInfo}
            ${tipoActividadInfo}
            ${categoriaInfo}
            ${tipoRegistroInfo}
            ${cupoInfo}
            <p><strong>Actividad:</strong> ${evento.actividad || 'No especificada'}</p>
        `;
        
        main.appendChild(tarjeta);
    });
}

function formatearFecha(fecha) {
    if (!fecha) return 'No especificada';
    
    // Evitar conversión de zona horaria
    const fechaLocal = new Date(fecha + 'T00:00:00');
    const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
    return fechaLocal.toLocaleDateString('es-MX', opciones);
}

// Función auxiliar para filtrar eventos (llamada desde FiltrarEventos.js)
function aplicarFiltros() {
    const tipo = document.getElementById('tipoQuery')?.value || '';
    const campus = document.getElementById('filtro-campus')?.value || '';
    const categoria = document.getElementById('filtro-categoria')?.value || '';
    const tipoActividad = document.getElementById('filtro-tipo')?.value || '';
    
    cargarEventos({
        tipo: tipo,
        campus_id: campus,
        categoria: categoria,
        tipo_actividad: tipoActividad
    });
}