// js/admin/adminDashboard.js

// Verificar sesión al cargar
window.addEventListener('DOMContentLoaded', () => {
    verificarSesion();
    cargarEstadisticas();
});

function verificarSesion() {
    // Nota: Ajusta la ruta ../../php/admin... según donde esté este JS
    fetch('../../php/admin/verificarSesion.php')
        .then(response => response.json())
        .then(data => {
            if (!data.loggedin) {
                // No hay sesión válida, redirigir al login
                window.location.href = '../login.html';
            } else {
                // Sesión válida, mostrar mensaje de bienvenida
                const mensaje = document.getElementById('mensaje-bienvenida');
                if(mensaje) {
                    mensaje.textContent = `¡Hola ${data.nombre}! Aquí puedes administrar el contenido del sitio.`;
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            window.location.href = '../login.html';
        });
}

function cargarEstadisticas() {
    // Llamamos al nuevo archivo que cuenta AMBOS datos
    fetch('../../php/admin/obtenerContadores.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Actualizar Eventos
                const totalEventos = document.getElementById('total-eventos');
                if(totalEventos) totalEventos.textContent = data.total_eventos;

                // Actualizar Inscripciones
                const totalInscripciones = document.getElementById('total-inscripciones');
                if(totalInscripciones) totalInscripciones.textContent = data.total_inscripciones;
            }
        })
        .catch(error => console.error('Error al cargar estadísticas:', error));
}