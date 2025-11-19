// js/utils/utilidades.js

/**
 * Formatea una fecha de YYYY-MM-DD a un formato legible (ej: 27 oct 2025).
 * @param {string} fecha - Fecha en formato YYYY-MM-DD.
 * @returns {string} Fecha formateada.
 */
export function formatearFecha(fecha) {
    if (!fecha) return 'N/A';
    try {
        const fechaLocal = new Date(fecha + 'T00:00:00');
        if (isNaN(fechaLocal.getTime())) return 'Fecha inválida';
        
        const opciones = { year: 'numeric', month: 'short', day: 'numeric' };
        return fechaLocal.toLocaleDateString('es-MX', opciones);
    } catch (error) {
        console.error("Error al formatear fecha:", fecha, error);
        return 'Error fecha';
    }
}

/**
 * Muestra un mensaje temporal (toast) usando clases CSS.
 * @param {string} texto - Mensaje a mostrar.
 * @param {string} [tipo='success'] - 'success' o 'error'.
 */
export function mostrarMensaje(texto, tipo = 'success') {
    const mensajeDiv = document.getElementById('mensaje-respuesta');
    
    if (!mensajeDiv) {
        console.warn("Elemento #mensaje-respuesta no encontrado en el DOM.");
        return; 
    }
    
    // 1. Poner el texto
    mensajeDiv.textContent = texto;
    
    // 2. Limpiar clases anteriores y asegurar visibilidad
    mensajeDiv.className = ''; 
    mensajeDiv.style.display = 'block';
    
    // 3. Agregar la clase CSS correspondiente (definida en main.css)
    if (tipo === 'success') {
        mensajeDiv.classList.add('mensaje-success');
    } else {
        mensajeDiv.classList.add('mensaje-error');
    }
    
    // 4. Ocultar automáticamente después de 4 segundos
    setTimeout(() => {
        mensajeDiv.style.display = 'none';
        mensajeDiv.className = ''; // Limpiar clases al ocultar
    }, 4000);
}
// js/utils/utilidades.js

// ... (Tus funciones anteriores formatearFecha y mostrarMensaje se quedan igual) ...

/**
 * Muestra un Modal de Éxito idéntico al del registro público.
 * @param {string} mensaje - El texto a mostrar.
 * @param {Function} callback - Función a ejecutar al dar click en Aceptar (opcional).
 */
export function mostrarModalExito(mensaje, callback = null) {
    // Eliminar si ya existe uno
    const existente = document.getElementById('modal-exito-global');
    if (existente) existente.remove();

    const modalExito = document.createElement('div');
    modalExito.id = 'modal-exito-global';
    modalExito.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.75);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10001;
        animation: fadeIn 0.3s ease;
    `;
    
    modalExito.innerHTML = `
        <div style="background: white; padding: 50px 40px; border-radius: 16px; max-width: 500px; width: 90%; text-align: center; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4); animation: slideUp 0.3s ease;">
            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 25px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
            </div>
            <h2 style="color: #003366; margin: 0 0 15px 0; font-size: 28px; font-weight: 700;">¡Éxito!</h2>
            <p style="color: #666; margin: 0 0 30px 0; font-size: 16px; line-height: 1.6;">${mensaje}</p>
            <button id="btnAceptarExito" 
                    style="padding: 14px 40px; background: linear-gradient(135deg, #00843D 0%, #00a651 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 16px; transition: all 0.3s; box-shadow: 0 4px 12px rgba(0, 132, 61, 0.3);">
                Aceptar
            </button>
        </div>
    `;
    
    // Agregar estilos de animación si no existen
    if (!document.getElementById('estilos-animacion-modal')) {
        const style = document.createElement('style');
        style.id = 'estilos-animacion-modal';
        style.textContent = `
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(modalExito);

    // Función de cierre
    const cerrar = () => {
        modalExito.remove();
        if (callback) callback();
    };

    document.getElementById('btnAceptarExito').addEventListener('click', cerrar);
    
    // Cerrar con click fuera (opcional)
    modalExito.addEventListener('click', (e) => {
        if (e.target === modalExito) cerrar();
    });
}