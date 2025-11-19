// js/componentes/qrModal.js

document.addEventListener("DOMContentLoaded", () => {
    // Verificar si viene desde un QR (parámetro id_evento en URL)
    const urlParams = new URLSearchParams(window.location.search);
    const eventoIdDesdeQR = urlParams.get('id_evento');
    
    if (eventoIdDesdeQR) {
        // Obtener datos del evento y mostrar formulario automáticamente
        obtenerDatosEventoYMostrarFormulario(eventoIdDesdeQR);
    }
});

// Nueva función para obtener datos del evento desde el QR
function obtenerDatosEventoYMostrarFormulario(eventoId) {
    fetch(`../php/public/obtenerEvento.php?id=${eventoId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.evento) {
                const nombreEvento = data.evento.titulo || data.evento.nombre || 'Evento';
                mostrarFormularioInscripcion(eventoId, nombreEvento);
            } else {
                // Si no se encuentra el evento, mostrar con nombre genérico
                mostrarFormularioInscripcion(eventoId, 'Evento');
                console.warn('No se pudieron obtener los datos del evento');
            }
        })
        .catch(error => {
            console.error('Error al obtener datos del evento:', error);
            // Mostrar formulario con nombre genérico si hay error
            mostrarFormularioInscripcion(eventoId, 'Evento');
        });
}
/**
 * Muestra el modal con el QR de un evento existente.
 */
export function generarQR(id_evento) {
   // Construye la URL dinámicamente en lugar de usar una ruta fija
    const currentURL = window.location.href; // Ej: .../public/admin/gestionar-eventos.html
    const baseURL = currentURL.split('?')[0].replace('admin/gestionar-eventos.html', 'eventos.html');
    const enlaceEvento = `${baseURL}?id_evento=${encodeURIComponent(id_evento)}`;
    const modalQR = document.createElement('div');
    
    modalQR.id = 'modal-qr';
    modalQR.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 9999; overflow-y: auto; align-items: center; justify-content: center;';
    
    modalQR.innerHTML = `
        <div style="max-width: 600px; background: white; padding: 30px; border-radius: 10px; margin: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); position: relative;">
            
            <!-- Botón cerrar X -->
            <button type="button" id="btnCerrarModalQRX" style="position: absolute; top: 15px; right: 15px; background: transparent; border: none; cursor: pointer; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s; color: #666; z-index: 10;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display: block;">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>

            <h2 style="margin: 0 0 10px 0; color: #003366; font-size: 24px; text-align: center;">Código QR Generado</h2>
            <p style="margin: 0 0 25px 0; color: #666; text-align: center; font-size: 15px;">Escanea este código para registrarte al evento</p>
            <div style="display: flex; justify-content: center; margin: 25px 0; padding: 25px; background: #f9f9f9; border-radius: 8px; border: 2px dashed #ddd;">
                <div id="codigoQR"></div>
            </div>
            <div style="margin: 20px 0; padding: 15px; background: #e8f5e9; border-radius: 5px; border-left: 4px solid #28a745;">
                <p style="margin: 0; font-size: 13px; color: #555; word-break: break-all; line-height: 1.6;">
                    <strong style="display: block; margin-bottom: 8px; color: #003366; font-size: 14px;">Enlace directo:</strong>
                    <span style="color: #28a745; font-family: 'Courier New', monospace; font-size: 12px;">${enlaceEvento}</span>
                </p>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 25px;">
                <button id="btnDescargarQR" style="flex: 1; padding: 12px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 15px;">Descargar QR</button>
                <button id="btnCopiarURL" style="padding: 12px; background: #17a2b8; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 14px;">Copiar URL</button>
                <button id="btnCerrarQR" style="flex: 1; padding: 12px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 15px;">Cerrar</button>
            </div>
        </div>
    `;
    
    // Agregar estilos para el hover del botón X
    const style = document.createElement('style');
    style.textContent = `
        #btnCerrarModalQRX:hover {
            background: #f3f4f6 !important;
            color: #dc3545 !important;
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(modalQR);
    
    // Generar el QR (se asegura que el div exista primero)
    new QRCode(document.getElementById("codigoQR"), {
        text: enlaceEvento, width: 220, height: 220,
        colorDark: "#003366", colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    
    // Eventos de botones
    document.getElementById('btnDescargarQR').addEventListener('click', () => {
        const img = document.getElementById("codigoQR").querySelector("img");
        if (img) {
            const enlace = document.createElement("a");
            enlace.href = img.src;
            enlace.download = `QR_evento_${id_evento}.png`;
            enlace.click();
        }
    });

    document.getElementById('btnCopiarURL').addEventListener('click', () => {
        navigator.clipboard.writeText(enlaceEvento).then(() => {
            const btn = document.getElementById('btnCopiarURL');
            btn.textContent = '✓ Copiado';
            setTimeout(() => btn.textContent = 'Copiar URL', 2000);
        });
    });
    
    // Botón X para cerrar
    document.getElementById('btnCerrarModalQRX').addEventListener('click', () => {
        modalQR.remove();
    });
    
    // Botón Cerrar normal
    document.getElementById('btnCerrarQR').addEventListener('click', () => {
        modalQR.remove();
    });
    
    // Cerrar al hacer clic fuera
    modalQR.addEventListener('click', (e) => {
        if (e.target === modalQR) modalQR.remove();
    });
}

/**
 * Muestra el modal de éxito (con QR) después de crear un evento.
 */
export function mostrarModalExitoConQR(id_evento, mensaje) {
    const currentURL = window.location.href; // Ej: .../public/admin/gestionar-eventos.html
    const baseURL = currentURL.split('?')[0].replace('admin/gestionar-eventos.html', 'eventos.html');
    const enlaceEvento = `${baseURL}?id_evento=${encodeURIComponent(id_evento)}`;
    
    const modalExito = document.createElement('div');
    modalExito.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 9999; overflow-y: auto; align-items: center; justify-content: center;';
    
    modalExito.innerHTML = `
        <div style="max-width: 650px; background: white; padding: 35px; border-radius: 10px; margin: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); position: relative;">
            
            <!-- Botón cerrar X -->
            <button type="button" id="btnCerrarModalExitoX" style="position: absolute; top: 15px; right: 15px; background: transparent; border: none; cursor: pointer; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s; color: #666; z-index: 10;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display: block;">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
            
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="margin: 0 0 8px 0; color: #28a745; font-size: 26px;">Evento Creado Exitosamente</h2>
                <p style="margin: 0; color: #666;">${mensaje}</p>
            </div>
            <h3 style="margin: 20px 0 15px 0; color: #003366; text-align: center;">Código QR del Evento</h3>
            <div style="display: flex; justify-content: center; margin: 20px 0; padding: 30px; background: #f8f9fa; border-radius: 12px; border: 3px dashed #28a745;">
                <div id="codigoQRExito"></div>
            </div>
            <div style="margin: 20px 0; padding: 15px; background: #d4edda; border-radius: 8px;">
                <p style="margin: 0; font-size: 13px; color: #155724; word-break: break-all;">
                    <strong style="display: block; margin-bottom: 8px;">Enlace de registro:</strong>
                    <span style="color: #28a745; font-family: monospace;">${enlaceEvento}</span>
                </p>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                <button id="btnDescargarQRExito" style="padding: 12px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Descargar</button>
                <button id="btnCopiarEnlace" style="padding: 12px; background: #17a2b8; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Copiar Link</button>
                <button id="btnCerrarExito" style="padding: 12px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Finalizar</button>
            </div>
        </div>
    `;
    
    // Agregar estilos para el hover del botón X
    const style = document.createElement('style');
    style.textContent = `
        #btnCerrarModalExitoX:hover {
            background: #f3f4f6 !important;
            color: #dc3545 !important;
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(modalExito);
    
    new QRCode(document.getElementById("codigoQRExito"), {
        text: enlaceEvento, width: 240, height: 240,
        colorDark: "#003366", colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    
    document.getElementById('btnDescargarQRExito').addEventListener('click', () => {
        const img = document.getElementById("codigoQRExito").querySelector("img");
        if (img) {
            const enlace = document.createElement("a");
            enlace.href = img.src;
            enlace.download = `QR_evento_${id_evento}.png`;
            enlace.click();
        }
    });
    
    document.getElementById('btnCopiarEnlace').addEventListener('click', () => {
        navigator.clipboard.writeText(enlaceEvento).then(() => {
            const btn = document.getElementById('btnCopiarEnlace');
            btn.textContent = '✓ Copiado';
            setTimeout(() => btn.textContent = 'Copiar Link', 2000);
        });
    });
    
    // Botón X para cerrar
    document.getElementById('btnCerrarModalExitoX').addEventListener('click', () => {
        modalExito.remove();
    });
    
    // Botón Finalizar normal
    document.getElementById('btnCerrarExito').addEventListener('click', () => {
        modalExito.remove();
    });
}