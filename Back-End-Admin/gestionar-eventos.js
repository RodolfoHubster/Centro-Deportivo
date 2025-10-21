let modoEdicion = false;
let eventoEditandoId = null;

// Verificar sesión y cargar datos al iniciar
window.addEventListener('DOMContentLoaded', () => {
    verificarSesion();
    cargarActividades();
    cargarEventos();
});

function verificarSesion() {
    fetch('../Back-End-Admin/verificarSesion.php')
        .then(response => response.json())
        .then(data => {
            if (!data.loggedin) {
                window.location.href = '../Front-End-Usuario/login.html'; //  CORREGIDO
            }
        })
        .catch(() => {
            window.location.href = '../Front-End-Usuario/login.html'; //  CORREGIDO
        });
}

// Cargar tipos de actividades para el select
function cargarActividades() {
    fetch('../Back-End-PHP/obtenerActividades.php')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('evento-actividad');
            select.innerHTML = '<option value="">Selecciona una actividad</option>';
            
            if (data.success && data.actividades.length > 0) {
                data.actividades.forEach(act => {
                    const option = document.createElement('option');
                    option.value = act.nombre;
                    option.textContent = act.nombre;
                    select.appendChild(option);
                });
            }
        })
        .catch(error => console.error('Error al cargar actividades:', error));
}

// Cargar todos los eventos
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

// Mostrar eventos en tarjetas
function mostrarEventos(eventos) {
    const container = document.getElementById('lista-eventos');
    container.innerHTML = '';
    
    eventos.forEach(evento => {
        const card = document.createElement('div');
        card.style.cssText = 'background: white; padding: 20px; margin: 15px 0; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); border-left: 4px solid #003366;';
        
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <h3 style="margin: 0 0 10px 0; color: #003366;">${evento.nombre}</h3>
                    <p style="margin: 5px 0; color: #666;"><strong>Descripción:</strong> ${evento.descripcion}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>Fecha:</strong> ${formatearFecha(evento.fecha)}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>Lugar:</strong> ${evento.lugar}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>Actividad:</strong> ${evento.actividad}</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="editarEvento(${evento.id})" 
                            style="padding: 8px 15px; background: #ffc107; color: #333; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                        Editar
                    </button>
                    <button onclick="eliminarEvento(${evento.id}, '${evento.nombre}')" 
                            style="padding: 8px 15px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                        Eliminar
                    </button>

                    <button id="btnGenerarQR${evento.id}" data-id="${evento.id}"
                            style="padding: 8px 15px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                        Generar QR
                    </button>

                </div>
            </div>
        `;
        
        container.appendChild(card);

        card.querySelector(`#btnGenerarQR${evento.id}`).addEventListener('click', () => {
            generarQR(evento.id);
        });

    });
}

function formatearFecha(fecha) {
    // FIX: Evitar conversión de zona horaria
    // Agregar 'T00:00:00' fuerza que se interprete como hora local, no UTC
    const fechaLocal = new Date(fecha + 'T00:00:00');
    const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
    return fechaLocal.toLocaleDateString('es-MX', opciones);
}
// Abrir modal para crear nuevo evento
document.getElementById('btnNuevoEvento').addEventListener('click', () => {
    modoEdicion = false;
    eventoEditandoId = null;
    document.getElementById('tituloModal').textContent = 'Crear Nuevo Evento';
    document.getElementById('formEvento').reset();
    document.getElementById('evento-id').value = '';
    document.getElementById('modalEvento').style.display = 'flex';
});


// Cerrar modal
document.getElementById('btnCancelar').addEventListener('click', () => {
    document.getElementById('modalEvento').style.display = 'none';
});

// Editar evento
function editarEvento(id) {
    modoEdicion = true;
    eventoEditandoId = id;
    
    // Buscar el evento en la lista actual
    fetch('../Back-End-PHP/obtenerEventos.php')
        .then(response => response.json())
        .then(data => {
            const evento = data.eventos.find(e => e.id == id);
            
            if (evento) {
                document.getElementById('tituloModal').textContent = 'Editar Evento';
                document.getElementById('evento-id').value = evento.id;
                document.getElementById('evento-nombre').value = evento.nombre;
                document.getElementById('evento-descripcion').value = evento.descripcion;
                document.getElementById('evento-fecha').value = evento.fecha;
                document.getElementById('evento-lugar').value = evento.lugar;
                document.getElementById('evento-actividad').value = evento.actividad;
                
                document.getElementById('modalEvento').style.display = 'flex';
            }
        })
        .catch(error => console.error('Error:', error));
}

// Eliminar evento
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

function generarQR(id_evento) {
    const enlaceEvento = `http://localhost/Proyecto-Deportes/Front-End-Usuario/eventos.html?id_evento=${id_evento}`;
    
    // Crear modal con estilos inline (igual que modalEvento)
    const modalQR = document.createElement('div');
    modalQR.id = 'modal-qr';
    modalQR.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 9999; overflow-y: auto; align-items: center; justify-content: center;';
    
    modalQR.innerHTML = `
        <div style="max-width: 600px; background: white; padding: 30px; border-radius: 10px; margin: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
            <h2 style="margin: 0 0 10px 0; color: #003366; font-size: 24px; text-align: center;">Código QR Generado</h2>
            
            <p style="margin: 0 0 25px 0; color: #666; text-align: center; font-size: 15px;">Escanea este código para registrarte al evento</p>
            
            <!-- Contenedor del QR -->
            <div style="display: flex; justify-content: center; margin: 25px 0; padding: 25px; background: #f9f9f9; border-radius: 8px; border: 2px dashed #ddd;">
                <div id="codigoQR"></div>
            </div>
            
            <!-- Enlace directo -->
            <div style="margin: 20px 0; padding: 15px; background: #e8f5e9; border-radius: 5px; border-left: 4px solid #28a745;">
                <p style="margin: 0; font-size: 13px; color: #555; word-break: break-all; line-height: 1.6;">
                    <strong style="display: block; margin-bottom: 8px; color: #003366; font-size: 14px;">Enlace directo:</strong>
                    <span style="color: #28a745; font-family: 'Courier New', monospace; font-size: 12px;">${enlaceEvento}</span>
                </p>
            </div>
            
            <!-- Botones -->
            <div style="display: flex; gap: 10px; margin-top: 25px;">
                <button id="btnDescargarQR" style="flex: 1; padding: 12px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 15px; transition: all 0.3s;">
                    Descargar QR
                </button>
                <button id="btnCopiarURL" style="padding: 12px; background: #17a2b8; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 14px; transition: all 0.3s;">
                    Copiar URL
                </button>
                <button id="btnCerrarQR" style="flex: 1; padding: 12px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 15px; transition: all 0.3s;">
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
    
    // Efectos hover en botones
    const btnDescargar = document.getElementById('btnDescargarQR');
    const btnCopiar = document.getElementById('btnCopiarURL');
    const btnCerrar = document.getElementById('btnCerrarQR');

    // hover descargar
    btnDescargar.addEventListener('mouseenter', () => {
        btnDescargar.style.background = '#0056b3';
        btnDescargar.style.transform = 'translateY(-2px)';
        btnDescargar.style.boxShadow = '0 4px 8px rgba(0,123,255,0.3)';
    });
    btnDescargar.addEventListener('mouseleave', () => {
        btnDescargar.style.background = '#007bff';
        btnDescargar.style.transform = 'translateY(0)';
        btnDescargar.style.boxShadow = 'none';
    });

    // Hover copiar
    btnCopiar.addEventListener('mouseenter', () => {
        btnCopiar.style.background = '#138496';
        btnCopiar.style.transform = 'translateY(-2px)';
        btnCopiar.style.boxShadow = '0 4px 8px rgba(23,162,184,0.3)';
    });

    
    // Hover Cerrar
    btnCerrar.addEventListener('mouseenter', () => {
        btnCerrar.style.background = '#5a6268';
        btnCerrar.style.transform = 'translateY(-2px)';
        btnCerrar.style.boxShadow = '0 4px 8px rgba(108,117,125,0.3)';
    });
    btnCerrar.addEventListener('mouseleave', () => {
        btnCerrar.style.background = '#6c757d';
        btnCerrar.style.transform = 'translateY(0)';
        btnCerrar.style.boxShadow = 'none';
    });
    
    // Funcionalidad botón descargar
    btnDescargar.addEventListener('click', () => {
        const img = divQR.querySelector("img");
        if (img) {
            const enlace = document.createElement("a");
            enlace.href = img.src;
            enlace.download = `QR_evento_${id_evento}.png`;
            enlace.click();
            
            // Feedback visual
            btnDescargar.textContent = 'Descargado';
            setTimeout(() => {
                btnDescargar.innerHTML = 'Descargar QR';
            }, 2000);
        }
    });

    // Funcionalidad botón copiar URL
    btnCopiar.addEventListener('click', () => {
        navigator.clipboard.writeText(enlaceEvento).then(() => {
            btnCopiar.textContent = 'Copiado';
            btnCopiar.style.background = '#28a745';
            setTimeout(() => {
                btnCopiar.innerHTML = 'Copiar URL';
                btnCopiar.style.background = '#17a2b8';
            }, 2000);
        });
    });
    
    // Funcionalidad botón cerrar
    btnCerrar.addEventListener('click', () => {
        modalQR.remove();
    });
    
    // Cerrar con click fuera del modal
    modalQR.addEventListener('click', (e) => {
        if (e.target === modalQR) {
            modalQR.remove();
        }
    });
    
    // Cerrar con tecla ESC
    const cerrarConEsc = (e) => {
        if (e.key === 'Escape') {
            modalQR.remove();
            document.removeEventListener('keydown', cerrarConEsc);
        }
    };
    document.addEventListener('keydown', cerrarConEsc);
}

// Modal de éxito con QR después de crear evento
function mostrarModalExitoConQR(id_evento, mensaje) {
    const enlaceEvento = `http://localhost/Proyecto-Deportes/Front-End-Usuario/eventos.html?id_evento=${id_evento}`;
    
    const modalExito = document.createElement('div');
    modalExito.id = 'modal-exito-qr';
    modalExito.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 9999; overflow-y: auto; align-items: center; justify-content: center;';
    
    modalExito.innerHTML = `
        <div style="max-width: 650px; background: white; padding: 35px; border-radius: 10px; margin: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
            
            <!-- Ícono de éxito -->
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                </div>
                <h2 style="margin: 0 0 8px 0; color: #28a745; font-size: 26px; font-weight: bold;">¡Evento Creado Exitosamente!</h2>
                <p style="margin: 0; color: #666; font-size: 15px;">${mensaje}</p>
            </div>
            
            <!-- Separador -->
            <div style="height: 1px; background: linear-gradient(90deg, transparent, #ddd, transparent); margin: 25px 0;"></div>
            
            <!-- Título del QR -->
            <h3 style="margin: 0 0 15px 0; color: #003366; font-size: 20px; text-align: center;">
                Código QR del Evento
            </h3>
            <p style="margin: 0 0 20px 0; color: #666; text-align: center; font-size: 14px;">
                Comparte este QR para que los participantes se registren
            </p>
            
            <!-- Contenedor del QR -->
            <div style="display: flex; justify-content: center; margin: 20px 0; padding: 30px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; border: 3px dashed #28a745;">
                <div id="codigoQRExito"></div>
            </div>
            
            <!-- Enlace directo -->
            <div style="margin: 20px 0; padding: 15px; background: #d4edda; border-radius: 8px; border-left: 4px solid #28a745;">
                <p style="margin: 0; font-size: 13px; color: #155724; word-break: break-all; line-height: 1.6;">
                    <strong style="display: block; margin-bottom: 8px; font-size: 14px;">🔗 Enlace de registro:</strong>
                    <span style="color: #28a745; font-family: 'Courier New', monospace; font-size: 12px; background: white; padding: 8px; border-radius: 4px; display: inline-block; width: 100%; box-sizing: border-box;">${enlaceEvento}</span>
                </p>
            </div>
            
            <!-- Botones -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 25px;">
                <button id="btnDescargarQRExito" style="padding: 12px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 14px; transition: all 0.3s;">
                    Descargar
                </button>
                <button id="btnCopiarEnlace" style="padding: 12px; background: #17a2b8; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 14px; transition: all 0.3s;">
                    Copiar Link
                </button>
                <button id="btnCerrarExito" style="padding: 12px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 14px; transition: all 0.3s;">
                    Finalizar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalExito);
    
    // Generar el QR
    const divQR = document.getElementById("codigoQRExito");
    new QRCode(divQR, {
        text: enlaceEvento,
        width: 240,
        height: 240,
        colorDark: "#003366",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    
    // Botón descargar
    document.getElementById('btnDescargarQRExito').addEventListener('click', () => {
        const img = divQR.querySelector("img");
        if (img) {
            const enlace = document.createElement("a");
            enlace.href = img.src;
            enlace.download = `QR_evento_${id_evento}.png`;
            enlace.click();
            
            const btn = document.getElementById('btnDescargarQRExito');
            btn.textContent = '✅ Descargado';
            btn.style.background = '#28a745';
            setTimeout(() => {
                btn.innerHTML = '📥 Descargar';
                btn.style.background = '#007bff';
            }, 2000);
        }
    });
    
    // Botón copiar enlace
    document.getElementById('btnCopiarEnlace').addEventListener('click', () => {
        navigator.clipboard.writeText(enlaceEvento).then(() => {
            const btn = document.getElementById('btnCopiarEnlace');
            btn.textContent = ' Copiado';
            btn.style.background = '#28a745';
            setTimeout(() => {
                btn.innerHTML = ' Copiar Link';
                btn.style.background = '#17a2b8';
            }, 2000);
        });
    });
    
    // Botón cerrar
    document.getElementById('btnCerrarExito').addEventListener('click', () => {
        modalExito.remove();
    });
    
    // Cerrar con ESC
    const cerrarConEsc = (e) => {
        if (e.key === 'Escape') {
            modalExito.remove();
            document.removeEventListener('keydown', cerrarConEsc);
        }
    };
    document.addEventListener('keydown', cerrarConEsc);
}


// Guardar evento (crear o editar)
document.getElementById('formEvento').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const fechaInput = document.getElementById('evento-fecha').value;
    if (fechaInput) {
        formData.set('fecha', fechaInput);
    }
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Guardando...';
    
    const url = modoEdicion ? 
        '../Back-End-Admin/editarEvento.php' : 
        '../Back-End-Admin/crearEvento.php';
    
    fetch(url, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Cerrar modal de formulario
            document.getElementById('modalEvento').style.display = 'none';
            
            // Recargar eventos
            cargarEventos();
            
            // Si es creación (no edición), mostrar modal de éxito con QR
            if (!modoEdicion && data.id) {
                mostrarModalExitoConQR(data.id, data.mensaje);
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
        btnSubmit.textContent = 'Guardar';
    });
});

// Mostrar mensaje de respuesta
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
    
    setTimeout(() => {
        mensajeDiv.style.display = 'none';
    }, 5000);
}

// Cerrar sesión
document.getElementById('btnCerrarSesion').addEventListener('click', () => {
    if (confirm('¿Cerrar sesión?')) {
        fetch('../Back-End-Admin/cerrarSesion.php')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    localStorage.removeItem('usuarioLogeado'); // Limpiar localStorage
                    window.location.href = '../Front-End-Usuario/login.html'; // ✅ CORREGIDO
                }
            });
    }
});