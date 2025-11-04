// js/utils/utilidades.js

/**
 * Formatea una fecha de YYYY-MM-DD a un formato legible (ej: 27 oct 2025).
 * @param {string} fecha - Fecha en formato YYYY-MM-DD o compatible con new Date().
 * @returns {string} Fecha formateada o 'N/A' si la fecha es inválida.
 */
export function formatearFecha(fecha) {
    if (!fecha) return 'N/A';
    try {
        // Añadir T00:00:00 para evitar problemas de zona horaria al parsear solo la fecha
        const fechaLocal = new Date(fecha + 'T00:00:00');
        // Verificar si la fecha es válida después de crearla
        if (isNaN(fechaLocal.getTime())) {
            return 'Fecha inválida';
        }
        const opciones = { year: 'numeric', month: 'short', day: 'numeric' };
        return fechaLocal.toLocaleDateString('es-MX', opciones);
    } catch (error) {
        console.error("Error al formatear fecha:", fecha, error);
        return 'Error fecha';
    }
}

/**
 * Muestra un mensaje temporal (toast) en la parte superior de la página.
 * @param {string} texto - Mensaje a mostrar.
 * @param {string} [tipo='success'] - Tipo de mensaje: 'success' (verde) o 'error' (rojo).
 */
export function mostrarMensaje(texto, tipo = 'success') {
    const mensajeDiv = document.getElementById('mensaje-respuesta');
    if (!mensajeDiv) {
        console.error("Elemento #mensaje-respuesta no encontrado en el DOM.");
        return; // Salir si no existe el div donde mostrar el mensaje
    }
    
    mensajeDiv.textContent = texto;
    mensajeDiv.style.display = 'block';
    
    if (tipo === 'success') {
        mensajeDiv.style.backgroundColor = '#d4edda';
        mensajeDiv.style.color = '#155724';
        mensajeDiv.style.border = '1px solid #c3e6cb';
    } else { // Asumir 'error' para cualquier otro valor
        mensajeDiv.style.backgroundColor = '#f8d7da';
        mensajeDiv.style.color = '#721c24';
        mensajeDiv.style.border = '1px solid #f5c6cb';
    }
    
    // Ocultar automáticamente después de 5 segundos
    setTimeout(() => {
        mensajeDiv.style.display = 'none';
        // Limpiar estilos para la próxima vez
        mensajeDiv.removeAttribute('style');
        mensajeDiv.style.display = 'none'; // Asegurar que quede oculto
    }, 5000);
}