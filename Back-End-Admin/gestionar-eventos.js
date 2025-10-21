/**
 * Gestionar Eventos - JavaScript ACTUALIZADO
 * Mantiene funcionalidad de QR + agrega nuevos campos de BD
 */

let modoEdicion = false;
let eventoEditandoId = null;
let usuarioId = null;

// ================================
// INICIALIZACIÓN
// ================================

window.addEventListener('DOMContentLoaded', () => {
    verificarSesion();
    cargarCampus();
    cargarActividades();
    cargarFacultades();
    cargarEventos();
});

// ================================
// VERIFICAR SESIÓN
// ================================

function verificarSesion() {
    fetch('../Back-End-Admin/verificarSesion.php')
        .then(response => response.json())
        .then(data => {
            if (!data.loggedin) {
                window.location.href = '../Front-End-Usuario/login.html';
            } else {
                usuarioId = data.id;
                console.log('Usuario ID:', usuarioId); // DEBUG
            }
        })
        .catch(() => {
            window.location.href = '../Front-End-Usuario/login.html';
        });
}

// ================================
// CARGAR DATOS INICIALES
// ================================

async function cargarCampus() {
    try {
        const response = await fetch('../Back-End-PHP/obtenerCampus.php');
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('evento-campus');
            select.innerHTML = '<option value="">Seleccionar campus...</option>';
            
            data.campus.forEach(campus => {
                select.innerHTML += `<option value="${campus.id}">${campus.nombre}</option>`;
            });
        }
    } catch (error) {
        console.error('Error cargando campus:', error);
    }
}

function cargarActividades() {
    fetch('../Back-End-PHP/obtenerActividades.php')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('evento-actividad');
            select.innerHTML = '<option value="">Ninguna (crear nueva)</option>';
            
            if (data.success && data.actividades.length > 0) {
                data.actividades.forEach(act => {
                    const option = document.createElement('option');
                    option.value = act.id;
                    option.textContent = act.nombre;
                    select.appendChild(option);
                });
            }
        })
        .catch(error => console.error('Error al cargar actividades:', error));
}

async function cargarFacultades() {
    try {
        const response = await fetch('../Back-End-PHP/obtenerFacultades.php');
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('facultades-checkbox');
            container.innerHTML = '';
            
            data.facultades.forEach(facultad => {
                container.innerHTML += `
                    <label style="display: flex; align-items: center; padding: 8px; cursor: pointer; border-radius: 3px;">
                        <input type="checkbox" name="facultades[]" value="${facultad.id}" style="margin-right: 10px;">
                        <span style="font-weight: 500;">${facultad.nombre}</span> 
                        <span style="color: #666; margin-left: 5px;">(${facultad.siglas})</span>
                    </label>
                `;
            });
        }
    } catch (error) {
        console.error('Error cargando facultades:', error);
        document.getElementById('facultades-checkbox').innerHTML = 
            '<p style="color: red; text-align: center;">Error al cargar facultades</p>';
    }
}

// ================================
// CARGAR Y MOSTRAR EVENTOS
// ================================

function cargarEventos() {
    fetch('../Back-End-PHP/obtenerEventos.php')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.eventos.length > 0) {
                mostrarEventos(data.eventos);
            } else {
                document.getElementById('lista-eventos').innerHTML = 
                    '<p style="text-align: center; color: #666;">No hay eventos registrados</p>';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('lista-eventos').innerHTML = 
                '<p style="text-align: center; color: red;">Error al cargar eventos</p>';
        });
}

function mostrarEventos(eventos) {
    const container = document.getElementById('lista-eventos');
    container.innerHTML = '';
    
    eventos.forEach(evento => {
        const card = document.createElement('div');
        card.style.cssText = 'background: white; padding: 20px; margin: 15px 0; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); border-left: 4px solid #003366;';
        
        // Calcular cupo disponible
        const cupoTexto = evento.cupo_maximo 
            ? `${evento.registros_actuales || 0} / ${evento.cupo_maximo}` 
            : `${evento.registros_actuales || 0} (Sin límite)`;
        
        const cupoColor = evento.cupo_maximo && evento.registros_actuales >= evento.cupo_maximo 
            ? '#dc3545' 
            : '#28a745';
        
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <h3 style="margin: 0 0 10px 0; color: #003366;">${evento.nombre}</h3>
                    <p style="margin: 5px 0; color: #666;">${evento.descripcion || 'Sin descripción'}</p>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-top: 15px;">
                        <div>
                            <strong>Fechas:</strong><br>
                            ${formatearFecha(evento.fecha_inicio)} - ${formatearFecha(evento.fecha_termino)}
                        </div>
                        <div>
                            <strong>Lugar:</strong><br>
                            ${evento.lugar}
                        </div>
                        <div>
                            <strong>Campus:</strong><br>
                            ${evento.campus_nombre || 'No especificado'}
                        </div>
                        <div>
                            <strong>Tipo:</strong><br>
                            ${evento.tipo_actividad || 'No especificado'}
                        </div>
                        <div>
                            <strong>Categoría:</strong><br>
                            ${evento.categoria_deporte || 'No especificado'}
                        </div>
                        <div>
                            <strong>Registro:</strong><br>
                            ${evento.tipo_registro || 'Individual'}
                        </div>
                        <div>
                            <strong>Cupo:</strong><br>
                            <span style="color: ${cupoColor}; font-weight: bold;">${cupoTexto}</span>
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 10px; margin-left: 20px;">
                    <button onclick="editarEvento(${evento.id})" 
                            style="padding: 8px 15px; background: #ffc107; color: #333; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; white-space: nowrap;">
                        Editar
                    </button>
                    <button onclick="eliminarEvento(${evento.id}, '${evento.nombre.replace(/'/g, "\\'")}')" 
                            style="padding: 8px 15px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; white-space: nowrap;">
                        Eliminar
                    </button>
                    <button onclick="generarQR(${evento.id})" 
                            style="padding: 8px 15px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; white-space: nowrap;">
                        Ver QR
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
}

function formatearFecha(fecha) {
    if (!fecha) return 'N/A';
    const fechaLocal = new Date(fecha + 'T00:00:00');
    const opciones = { year: 'numeric', month: 'short', day: 'numeric' };
    return fechaLocal.toLocaleDateString('es-MX', opciones);
}

// ================================
// MODAL Y FORMULARIO
// ================================

// Abrir modal para crear nuevo evento
document.getElementById('btnNuevoEvento').addEventListener('click', () => {
    modoEdicion = false;
    eventoEditandoId = null;
    document.getElementById('tituloModal').textContent = 'Crear Nuevo Evento';
    document.getElementById('formEvento').reset();
    document.getElementById('evento-id').value = '';
    
    // Desmarcar facultades
    document.querySelectorAll('input[name="facultades[]"]').forEach(cb => cb.checked = false);
    
    document.getElementById('modalEvento').style.display = 'block';
});

// Cerrar modal
document.getElementById('btnCancelar').addEventListener('click', () => {
    document.getElementById('modalEvento').style.display = 'none';
});

// Guardar evento (crear o editar)
document.getElementById('formEvento').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    
    // Datos básicos
    formData.append('nombre', document.getElementById('evento-nombre').value);
    formData.append('descripcion', document.getElementById('evento-descripcion').value);
    formData.append('fecha_inicio', document.getElementById('evento-fecha-inicio').value);
    formData.append('fecha_termino', document.getElementById('evento-fecha-termino').value);
    formData.append('lugar', document.getElementById('evento-lugar').value);
    
    // Nuevos campos obligatorios
    formData.append('campus_id', document.getElementById('evento-campus').value);
    formData.append('ubicacion_tipo', document.getElementById('evento-ubicacion-tipo').value);
    formData.append('tipo_registro', document.getElementById('evento-tipo-registro').value);
    formData.append('categoria_deporte', document.getElementById('evento-categoria').value);
    formData.append('tipo_actividad', document.getElementById('evento-tipo-actividad').value);
    
    // Campos opcionales
    const actividadId = document.getElementById('evento-actividad').value;
    if (actividadId) formData.append('id_actividad', actividadId);
    
    const cupoMaximo = document.getElementById('evento-cupo-maximo').value;
    if (cupoMaximo) formData.append('cupo_maximo', cupoMaximo);
    
    // ID del promotor
    formData.append('id_promotor', usuarioId);
    
    // Facultades seleccionadas
    const facultades = Array.from(document.querySelectorAll('input[name="facultades[]"]:checked'))
                            .map(cb => cb.value);
    facultades.forEach(id => formData.append('facultades[]', id));
    
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Guardando...';
    
    const url = modoEdicion ? 
        '../Back-End-Admin/editarEvento.php' : 
        '../Back-End-Admin/crearEvento.php';
    
    if (modoEdicion) {
        formData.append('id', document.getElementById('evento-id').value);
    }
    
    fetch(url, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('modalEvento').style.display = 'none';
            cargarEventos();
            
            // Si es creación, mostrar modal con QR
            if (!modoEdicion && data.datos && data.datos.evento_id) {
                mostrarModalExitoConQR(data.datos.evento_id, data.mensaje);
            } else {
                mostrarMensaje(data.mensaje, 'success');
            }
        } else {
            mostrarMensaje(data.mensaje, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        mostrarMensaje('Error al guardar evento', 'error');
    })
    .finally(() => {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Guardar Evento';
    });
});

// ================================
// EDITAR EVENTO
// ================================

function editarEvento(id) {
    modoEdicion = true;
    eventoEditandoId = id;
    
    fetch('../Back-End-PHP/obtenerEventos.php')
        .then(response => response.json())
        .then(data => {
            const evento = data.eventos.find(e => e.id == id);
            
            if (evento) {
                document.getElementById('tituloModal').textContent = 'Editar Evento';
                document.getElementById('evento-id').value = evento.id;
                document.getElementById('evento-nombre').value = evento.nombre;
                document.getElementById('evento-descripcion').value = evento.descripcion || '';
                document.getElementById('evento-fecha-inicio').value = evento.fecha_inicio;
                document.getElementById('evento-fecha-termino').value = evento.fecha_termino;
                document.getElementById('evento-lugar').value = evento.lugar;
                document.getElementById('evento-campus').value = evento.campus_id || '';
                document.getElementById('evento-ubicacion-tipo').value = evento.ubicacion_tipo || '';
                document.getElementById('evento-tipo-registro').value = evento.tipo_registro || 'Individual';
                document.getElementById('evento-categoria').value = evento.categoria_deporte || '';
                document.getElementById('evento-tipo-actividad').value = evento.tipo_actividad || '';
                document.getElementById('evento-actividad').value = evento.id_actividad || '';
                document.getElementById('evento-cupo-maximo').value = evento.cupo_maximo || '';
                
                document.getElementById('modalEvento').style.display = 'block';
            }
        })
        .catch(error => console.error('Error:', error));
}

// ================================
// ELIMINAR EVENTO
// ================================

function eliminarEvento(id, nombre) {
    if (!confirm(`¿Estás seguro de eliminar el evento "${nombre}"?`)) {
        return;
    }
    
    const formData = new FormData();
    formData.append('id', id);
    
    fetch('../Back-End-Admin/eliminarEvento.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        mostrarMensaje(data.mensaje, data.success ? 'success' : 'error');
        
        if (data.success) {
            cargarEventos();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        mostrarMensaje('Error al eliminar evento', 'error');
    });
}

// ================================
// GENERAR QR
// ================================

function generarQR(id_evento) {
    const enlaceEvento = `http://localhost/Proyecto-Deportes/Front-End-Usuario/eventos.html?id_evento=${id_evento}`;
    
    const modalQR = document.createElement('div');
    modalQR.id = 'modal-qr';
    modalQR.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 9999; overflow-y: auto; align-items: center; justify-content: center;';
    
    modalQR.innerHTML = `
        <div style="max-width: 600px; background: white; padding: 30px; border-radius: 10px; margin: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
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
                <button id="btnDescargarQR" style="flex: 1; padding: 12px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 15px;">
                    Descargar QR
                </button>
                <button id="btnCopiarURL" style="padding: 12px; background: #17a2b8; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 14px;">
                    Copiar URL
                </button>
                <button id="btnCerrarQR" style="flex: 1; padding: 12px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 15px;">
                    Cerrar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalQR);
    
    // Generar el QR
    const divQR = document.getElementById("codigoQR");
    new QRCode(divQR, {
        text: enlaceEvento,
        width: 220,
        height: 220,
        colorDark: "#003366",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    
    // Eventos de botones
    document.getElementById('btnDescargarQR').addEventListener('click', () => {
        const img = divQR.querySelector("img");
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
            btn.textContent = 'Copiado';
            setTimeout(() => btn.textContent = 'Copiar URL', 2000);
        });
    });
    
    document.getElementById('btnCerrarQR').addEventListener('click', () => {
        modalQR.remove();
    });
    
    modalQR.addEventListener('click', (e) => {
        if (e.target === modalQR) modalQR.remove();
    });
}

// Modal de éxito con QR
function mostrarModalExitoConQR(id_evento, mensaje) {
    const enlaceEvento = `http://localhost/Proyecto-Deportes/Front-End-Usuario/eventos.html?id_evento=${id_evento}`;
    
    const modalExito = document.createElement('div');
    modalExito.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 9999; overflow-y: auto; align-items: center; justify-content: center;';
    
    modalExito.innerHTML = `
        <div style="max-width: 650px; background: white; padding: 35px; border-radius: 10px; margin: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
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
                <button id="btnDescargarQRExito" style="padding: 12px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                    Descargar
                </button>
                <button id="btnCopiarEnlace" style="padding: 12px; background: #17a2b8; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                    Copiar Link
                </button>
                <button id="btnCerrarExito" style="padding: 12px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                    Finalizar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalExito);
    
    const divQR = document.getElementById("codigoQRExito");
    new QRCode(divQR, {
        text: enlaceEvento,
        width: 240,
        height: 240,
        colorDark: "#003366",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    
    document.getElementById('btnDescargarQRExito').addEventListener('click', () => {
        const img = divQR.querySelector("img");
        if (img) {
            const enlace = document.createElement("a");
            enlace.href = img.src;
            enlace.download = `QR_evento_${id_evento}.png`;
            enlace.click();
        }
    });
    
    document.getElementById('btnCopiarEnlace').addEventListener('click', () => {
        navigator.clipboard.writeText(enlaceEvento);
    });
    
    document.getElementById('btnCerrarExito').addEventListener('click', () => {
        modalExito.remove();
    });
}

// ================================
// UTILIDADES
// ================================

function mostrarMensaje(texto, tipo) {
    const mensajeDiv = document.getElementById('mensaje-respuesta');
    mensajeDiv.textContent = texto;
    mensajeDiv.style.display = 'block';
    
    if (tipo === 'success') {
        mensajeDiv.style.backgroundColor = '#d4edda';
        mensajeDiv.style.color = '#155724';
        mensajeDiv.style.border = '1px solid #c3e6cb';
    } else {
        mensajeDiv.style.backgroundColor = '#f8d7da';
        mensajeDiv.style.color = '#721c24';
        mensajeDiv.style.border = '1px solid #f5c6cb';
    }
    
    setTimeout(() => mensajeDiv.style.display = 'none', 5000);
}

// Cerrar sesión
document.getElementById('btnCerrarSesion').addEventListener('click', () => {
    if (confirm('¿Cerrar sesión?')) {
        fetch('../Back-End-Admin/cerrarSesion.php')
            .then(() => {
                localStorage.removeItem('usuarioLogeado');
                window.location.href = '../Front-End-Usuario/login.html';
            });
    }
});