document.addEventListener("DOMContentLoaded", () => {
    cargarTiposActividad();
});

function cargarTiposActividad() {
    const tipoQuery = document.getElementById("tipoQuery");
    
    if (!tipoQuery) {
        console.error("No se encontró el elemento #tipoQuery");
        return;
    }
    
    fetch("../Back-End-PHP/obtenerActividades.php")
        .then(response => response.json())
        .then(data => {
            if (data.success && data.actividades.length > 0) {
                // Limpiar select
                tipoQuery.innerHTML = '<option value="">Todos los eventos</option>';
                
                // Agregar opciones de actividades
                data.actividades.forEach(actividad => {
                    const option = document.createElement("option");
                    option.value = actividad.nombre;
                    option.textContent = actividad.nombre;
                    tipoQuery.appendChild(option);
                });
                
                // Event listener para filtrar
                tipoQuery.addEventListener("change", (e) => {
                    const tipoSeleccionado = e.target.value;
                    cargarEventos(tipoSeleccionado);
                });
            }
        })
        .catch(error => {
            console.error("Error al cargar actividades:", error);
        });
}