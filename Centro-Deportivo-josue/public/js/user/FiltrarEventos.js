document.addEventListener("DOMContentLoaded", () => {
    // Intenta encontrar el elemento PRIMERO
    const tipoQuery = document.getElementById("tipoQuery"); //

    // SI el elemento existe en esta página, entonces carga los tipos
    if (tipoQuery) { // <--- ¡AÑADE ESTA VERIFICACIÓN!
        cargarTiposActividad(tipoQuery); // Pasa el elemento como argumento
    } else {
        // Opcional: Muestra un mensaje si no lo encuentra (útil para depurar)
        // console.log("El filtro #tipoQuery no se encontró en esta página.");
    }
});

// Modifica la función para que reciba el elemento
function cargarTiposActividad(selectElement) { // <--- RECIBE EL ELEMENTO
    fetch("../php/public/obtenerActividades.php") //
        .then(response => response.json())
        .then(data => {
            if (data.success && data.actividades.length > 0) {
                // Limpiar select
                selectElement.innerHTML = '<option value="">Todos los eventos</option>'; // Usa selectElement

                // Agregar opciones
                data.actividades.forEach(actividad => {
                    const option = document.createElement("option");
                    option.value = actividad.nombre;
                    option.textContent = actividad.nombre;
                    selectElement.appendChild(option); // Usa selectElement
                });

                // Event listener (usa selectElement)
                selectElement.addEventListener("change", (e) => { //
                    const tipoSeleccionado = e.target.value;
                    // Asegúrate de que la función cargarEventos exista globalmente
                    // o impórtala si estás usando módulos también aquí.
                    if (typeof cargarEventos === 'function') {
                        cargarEventos({ tipo: tipoSeleccionado }); // Llama a cargarEventos con el filtro
                    } else {
                        console.error("La función cargarEventos no está definida globalmente.");
                    }
                });
            } else {
                 selectElement.innerHTML = '<option value="">No hay tipos</option>';
            }
        })
        .catch(error => {
            console.error("Error al cargar actividades:", error);
            selectElement.innerHTML = '<option value="">Error al cargar</option>'; // Usa selectElement
        });
}