document.addEventListener("DOMContentLoaded", () => {
    const selectElement = document.getElementById("tipoQuery"); 

    if (selectElement) { 
        poblarFiltroTipoActividad(selectElement); 
    }
});

/**
 * Puebla el <select> con los tipos de actividad correctos (del ENUM de la BD)
 * y configura el listener para filtrar.
 * * Esta función depende de 'filtrosBase' y 'cargarEventos'
 * definidas en 'Eventos.js'
 */
function poblarFiltroTipoActividad(selectElement) {

    // Estos son los valores del ENUM en tu tabla 'evento'
    const tipos = ['Torneo', 'Carrera', 'Exhibición', 'Taller'];

    // Detectar en qué página estamos para saber qué filtros base aplicar
    const pagina = window.location.pathname.split('/').pop();

    if (pagina === 'torneos.html') {
        selectElement.innerHTML = '<option value="">Todos los Torneos</option>';
    } else if (pagina === 'eventos.html') {
        selectElement.innerHTML = '<option value="">Todos los Eventos</option>';
    } else {
        selectElement.innerHTML = '<option value="">Todos</option>';
    }

    // Poblar el dropdown
    tipos.forEach(tipo => {
        // Si estamos en 'torneos.html', solo mostrar 'Torneo'
        if (pagina === 'torneos.html' && tipo !== 'Torneo') {
            return; // saltar
        }
        // Si estamos en 'eventos.html', NO mostrar 'Torneo'
        if (pagina === 'eventos.html' && tipo === 'Torneo') {
            return; // saltar
        }

        const option = document.createElement("option");
        option.value = tipo;
        option.textContent = tipo;
        selectElement.appendChild(option); 
    });

    // Event listener
    selectElement.addEventListener("change", (e) => { 
        const tipoSeleccionado = e.target.value;

        // Asegurarse que las funciones de Eventos.js existan
        if (typeof cargarEventos !== 'function' || typeof filtrosBase === 'undefined') {
            console.error("La función cargarEventos() o filtrosBase no está definida. Asegúrate de que Eventos.js esté cargado.");
            return;
        }

        // Empezar con los filtros base de la página (ej. {excluir_tipo_actividad: 'Torneo'})
        // (usamos JSON.parse/stringify para crear una copia y no modificar el original)
        const filtrosCombinados = JSON.parse(JSON.stringify(filtrosBase));

        // Si se selecciona un tipo específico, este REEMPLAZA los filtros base
        if (tipoSeleccionado) {
            // El filtro específico (ej. 'Carrera') tiene prioridad
            filtrosCombinados.tipo_actividad = tipoSeleccionado;

            // Borrar la exclusión si seleccionamos un tipo específico
            if (filtrosCombinados.excluir_tipo_actividad) {
                delete filtrosCombinados.excluir_tipo_actividad; 
            }
        }

        // Llamar a la función global de Eventos.js
        cargarEventos(filtrosCombinados); 
    });
}