/**
 * Inscripcion.js - VERSIÓN CORREGIDA
 * Actualizado para nueva estructura de BD con tabla participante
 */

import { actualizarCamposSegunTipo, cargarFacultades, cargarCarreras } from '../utils/formLogica.js';

document.addEventListener("DOMContentLoaded", () => {
    // Verificar si viene desde un QR (parámetro id_evento en URL)
    const urlParams = new URLSearchParams(window.location.search);
    const eventoIdDesdeQR = urlParams.get('id_evento');
    
    if (eventoIdDesdeQR) {
        // Si viene del QR, obtener datos del evento y mostrar formulario automáticamente
        obtenerDatosEventoYMostrarFormulario(eventoIdDesdeQR);
    } else {
        // Si NO viene del QR, comportamiento normal: agregar botones a las tarjetas
        setTimeout(() => {
            agregarBotonesInscripcion();
        }, 1000);
    }
});

// Nueva función para obtener datos del evento desde el QR
function obtenerDatosEventoYMostrarFormulario(eventoId) {
    // Usar el archivo obtenerEventos.php existente pero sin filtros
    fetch('../php/public/obtenerEventos.php?activos=false') // Asegúrate que este fetch funcione
        .then(response => response.json())
        .then(data => {
            if (data.success && data.eventos) {
                // Buscar el evento específico por ID
                const evento = data.eventos.find(e => e.id == eventoId);
                
                if (evento) {
                    const nombreEvento = evento.nombre || 'Evento';
                    // --- INICIO DE CAMBIO ---
                    const tipoRegistro = evento.tipo_registro || 'Individual';

                    if (tipoRegistro === 'Por equipos') {
                        const min = evento.integrantes_min || 8;
                        const max = evento.integrantes_max || 0; // 0 = sin límite
                        mostrarFormularioEquipo(eventoId, nombreEvento, min, max);
                    } else {
                        mostrarFormularioInscripcion(eventoId, nombreEvento);
                    }

                    // Función de scroll que movimos de Eventos.js
                    setTimeout(() => {
                        const tarjeta = document.querySelector(`[data-evento-id="${eventoId}"]`);
                        if(tarjeta) tarjeta.scrollIntoView({behavior: "smooth", block: "center"});
                    }, 500);
                    // --- FIN DE CAMBIO ---

                } else {
                    // Si no se encuentra el evento, mostrar con nombre genérico
                    mostrarFormularioInscripcion(eventoId, 'Evento');
                    console.warn('Evento no encontrado en la lista');
                }
            } else {
                // Si hay error, mostrar formulario con nombre genérico
                mostrarFormularioInscripcion(eventoId, 'Evento');
                console.warn('No se pudieron obtener los datos de los eventos');
            }
        })
        .catch(error => {
            console.error('Error al obtener datos del evento:', error);
            // Mostrar formulario con nombre genérico si hay error
            mostrarFormularioInscripcion(eventoId, 'Evento');
        });
}

function agregarBotonesInscripcion() {
    const tarjetasEvento = document.querySelectorAll('.evento-card, .event-card, .card-evento');

    tarjetasEvento.forEach((tarjeta) => {
        if (tarjeta.querySelector('.btn-inscribir')) return;
        
        const eventoId = tarjeta.getAttribute('data-evento-id') || tarjeta.getAttribute('data-id');
        
        if (!eventoId) return;

        // --- INICIO DE CAMBIOS ---
        
        // 1. Lee el nombre del evento (como ya lo tenías)
        const nombreEvento = tarjeta.querySelector('.evento-titulo, .event-title, h3, h2')?.textContent.trim() 
                            || tarjeta.getAttribute('data-nombre') 
                            || 'Evento';

        // 2. Lee el nuevo tipo de registro que guardamos
        const tipoRegistro = tarjeta.getAttribute('data-tipo-registro') || 'Individual';
        
        // ¡¡¡AQUÍ ESTÁ EL PROBLEMA!!!
        // tarjeta.getAttribute('data-integrantes-min') te está dando "2"
        // Debes arreglarlo en tu base de datos o en el PHP que genera el HTML.
        const min = tarjeta.getAttribute('data-integrantes-min') || 8;
        
        // Si es 0 (o nulo) lo dejamos así para "sin límite"
        const max = tarjeta.getAttribute('data-integrantes-max') || 0;

        // --- FIN DE CAMBIOS ---
        
        const btnInscribir = document.createElement('button');
        btnInscribir.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 8px;">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
            Registrarse al Evento
        `;
        btnInscribir.className = 'btn-inscribir';
        btnInscribir.style.cssText = `
            background: linear-gradient(135deg, #00843D 0%, #00a651 100%);
            color: white;
            padding: 14px 28px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            margin-top: 15px;
            font-weight: 600;
            font-size: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 132, 61, 0.3);
            width: 100%;
        `;
        
        btnInscribir.addEventListener('mouseover', () => {
            btnInscribir.style.transform = 'translateY(-2px)';
            btnInscribir.style.boxShadow = '0 6px 16px rgba(0, 132, 61, 0.4)';
        });
        
        btnInscribir.addEventListener('mouseout', () => {
            btnInscribir.style.transform = 'translateY(0)';
            btnInscribir.style.boxShadow = '0 4px 12px rgba(0, 132, 61, 0.3)';
        });
        
        // --- INICIO DE CAMBIOS ---
        
        // 3. Lógica en el click
        btnInscribir.addEventListener('click', () => {
            if (tipoRegistro === 'Por equipos') {
                // Llama a la NUEVA función para equipos
                // Aquí, 'min' está llevando el valor '2'
                mostrarFormularioEquipo(eventoId, nombreEvento, min, max);
            } else {
                // Llama a la función individual (que ya recibe el nombre)
                mostrarFormularioInscripcion(eventoId, nombreEvento);
            }
        });

        // --- FIN DE CAMBIOS ---
        
        const contenedorBotones = tarjeta.querySelector('.card-actions, .evento-actions, .btn-container');
        if (contenedorBotones) {
            contenedorBotones.appendChild(btnInscribir);
        } else {
            tarjeta.appendChild(btnInscribir);
        }
    });
}

function mostrarFormularioInscripcion(eventoId, nombreEvento) {
    const modalExistente = document.getElementById('modal-inscripcion')
    if(modalExistente){
        modalExistente.remove()
    }
    const modal = document.createElement('div');
    modal.id = 'modal-inscripcion';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.75);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        overflow-y: auto;
        padding: 20px;
        animation: fadeIn 0.3s ease;
    `;
    
    modal.innerHTML = `
        <div id="overlayModal" style="background: white; padding: 40px; border-radius: 16px; max-width: 800px; width: 100%; margin: 20px auto; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4); animation: slideUp 0.3s ease; max-height: 90vh; overflow-y: auto; position: relative;">
            
            <button type="button" id="btnCerrarX" style="position: absolute; top: 15px; right: 15px; background: transparent; border: none; cursor: pointer; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s; color: #666;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display: block;">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>

            <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; background: linear-gradient(135deg, #00843D 0%, #00a651 100%); width: 70px; height: 70px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="8.5" cy="7" r="4"/>
                        <line x1="20" y1="8" x2="20" y2="14"/>
                        <line x1="23" y1="11" x2="17" y2="11"/>
                    </svg>
                </div>
                <h2 style="color: #003366; margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">Formulario de Registro</h2>
                <p style="color: #666; margin: 0; font-size: 15px;">Completa todos los campos requeridos para registrarte</p>
                <h3 style="color: #00843D; margin: 15px 0 0 0; font-size: 22px; font-weight: 600;">${nombreEvento}</h3>
            </div>
            
            <form id="formInscripcion">
                
                <div style="background: linear-gradient(135deg, #e8f5e9 0%, #f1f8f4 100%); padding: 20px; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid #00843D;">
                    <label style="display: block; margin-bottom: 15px; font-weight: 700; color: #003366; font-size: 16px;">
                        Tipo de Participante <span style="color: #dc3545;">*</span>
                    </label>
                    
                    <div style="display: grid; gap: 12px;">
                        <label class="radio-option" style="display: flex; align-items: center; cursor: pointer; padding: 12px; background: white; border-radius: 8px; border: 2px solid #e0e0e0; transition: all 0.2s;">
                            <input type="radio" name="tipo_participante" value="Estudiante" checked 
                                    style="margin-right: 12px; width: 20px; height: 20px; cursor: pointer; accent-color: #00843D;">
                            <span style="font-size: 15px; font-weight: 500;">Estudiante</span>
                        </label>
                        
                        <label class="radio-option" style="display: flex; align-items: center; cursor: pointer; padding: 12px; background: white; border-radius: 8px; border: 2px solid #e0e0e0; transition: all 0.2s;">
                            <input type="radio" name="tipo_participante" value="Docente" 
                                    style="margin-right: 12px; width: 20px; height: 20px; cursor: pointer; accent-color: #00843D;">
                            <span style="font-size: 15px; font-weight: 500;">Docente / Personal Académico</span>
                        </label>
                        
                        <label class="radio-option" style="display: flex; align-items: center; cursor: pointer; padding: 12px; background: white; border-radius: 8px; border: 2px solid #e0e0e0; transition: all 0.2s;">
                            <input type="radio" name="tipo_participante" value="Externo" 
                                    style="margin-right: 12px; width: 20px; height: 20px; cursor: pointer; accent-color: #00843D;">
                            <span style="font-size: 15px; font-weight: 500;">Externo</span>
                        </label>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 14px;">
                            Apellido Paterno <span style="color: #dc3545;">*</span>
                        </label>
                        <input type="text" name="apellido_paterno" required class="form-input"
                                style="width: 100%; padding: 12px 14px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 15px; transition: all 0.2s; box-sizing: border-box;">
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 14px;">
                            Apellido Materno <span style="color: #dc3545;">*</span>
                        </label>
                        <input type="text" name="apellido_materno" required class="form-input"
                                style="width: 100%; padding: 12px 14px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 15px; transition: all 0.2s; box-sizing: border-box;">
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 14px;">
                        Nombre(s) <span style="color: #dc3545;">*</span>
                    </label>
                    <input type="text" name="nombres" required class="form-input"
                            style="width: 100%; padding: 12px 14px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 15px; transition: all 0.2s; box-sizing: border-box;">
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div id="matricula-container">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 14px;">
                            <span id="label-matricula">Matrícula</span> <span style="color: #dc3545;" id="required-matricula">*</span>
                        </label>
                        <input type="text" name="matricula" id="input-matricula" placeholder="12345678" required class="form-input"
                                pattern="[0-9]{6,10}"
                                style="width: 100%; padding: 12px 14px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 15px; transition: all 0.2s; box-sizing: border-box;">
                        <small id="help-matricula" style="color: #666; font-size: 12px; display: block; margin-top: 4px;">Solo números (6-10 dígitos)</small>
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 14px;">
                            Género <span style="color: #dc3545;">*</span>
                        </label>
                        <select name="genero" required class="form-input"
                                style="width: 100%; padding: 12px 14px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 15px; cursor: pointer; transition: all 0.2s; background: white; box-sizing: border-box;">
                            <option value="">Selecciona</option>
                            <option value="Hombre">Hombre</option>
                            <option value="Mujer">Mujer</option>
                        </select>
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 14px;">
                        Correo Electrónico UABC <span style="color: #dc3545;">*</span>
                    </label>
                    <input type="email" name="correo" required placeholder="ejemplo@uabc.edu.mx" class="form-input"
                            pattern="[a-zA-Z0-9._+\\-]+@uabc\\.(edu\\.)?mx"
                            style="width: 100%; padding: 12px 14px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 15px; transition: all 0.2s; box-sizing: border-box;">
                    <small style="color: #666; font-size: 12px; display: block; margin-top: 4px;">Debe ser correo institucional (@uabc.edu.mx o @uabc.mx)</small>
                </div>

                <div style="margin-bottom: 20px;" id="facultad-container">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 14px;">
                        <span id="label-facultad">Unidad Académica</span> <span style="color: #dc3545;" id="required-facultad">*</span>
                    </label>
                    <select name="facultad" id="select-facultad" required class="form-input"
                            style="width: 100%; padding: 12px 14px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 15px; cursor: pointer; transition: all 0.2s; background: white; box-sizing: border-box;">
                        <option value="">Cargando facultades...</option>
                    </select>
                </div>

                <div style="margin-bottom: 25px;" id="carrera-container">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 14px;">
                        <span id="label-carrera">Carrera</span> <span style="color: #dc3545;" id="required-carrera">*</span>
                    </label>
                    <select name="carrera" id="select-carrera" required class="form-input"
                            style="width: 100%; padding: 12px 14px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 15px; cursor: pointer; transition: all 0.2s; background: white; box-sizing: border-box;">
                        <option value="">Selecciona primero una facultad</option>
                    </select>
                    <small id="help-carrera" style="color: #666; font-style: italic; display: block; margin-top: 5px; font-size: 12px;">
                        Si eres de primer semestre, selecciona "Tronco Común" seguido de tu área
                    </small>
                </div>

                <input type="hidden" name="evento_id" value="${eventoId}">

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 30px;">
                    <button type="button" id="btnCerrarModal" 
                            style="padding: 15px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 16px; transition: all 0.3s;">
                        Cancelar
                    </button>
                    <button type="submit" id="btnSubmit"
                            style="padding: 15px; background: linear-gradient(135deg, #00843D 0%, #00a651 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 16px; transition: all 0.3s; box-shadow: 0 4px 12px rgba(0, 132, 61, 0.3);">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 8px;">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="8.5" cy="7" r="4"/>
                            <line x1="20" y1="8" x2="20" y2="14"/>
                            <line x1="23" y1="11" x2="17" y2="11"/>
                        </svg>
                        Registrarse
                    </button>
                </div>
            </form>

        </div>
    `;
    
    // Agregar estilos CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        /* Estilo para el boton X */
        #btnCerrarX:hover {
            background: #f3f4f6 !important;
            color: #dc3545 !important;
        }
        .radio-option input[type="radio"]:checked + span {
            color: #00843D;
            font-weight: 600;
        }
        .radio-option:has(input[type="radio"]:checked) {
            border-color: #00843D !important;
            background: #f1f8f4 !important;
        }
        .form-input:focus {
            outline: none;
            border-color: #00843D !important;
            box-shadow: 0 0 0 3px rgba(0, 132, 61, 0.1) !important;
        }
        .form-input:invalid:not(:placeholder-shown) {
            border-color: #dc3545 !important;
        }
        .form-input:valid:not(:placeholder-shown) {
            border-color: #28a745 !important;
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(modal);
    
    // Cargar facultades (Versión nueva usando formLogica)
    const selectFacultad = document.getElementById('select-facultad');
    const selectCarrera = document.getElementById('select-carrera');
    
    // Le pasamos el select y la ruta relativa al PHP desde 'public/'
    cargarFacultades(selectFacultad, '../php/public/');

    // Manejar cambio de tipo de participante
    document.querySelectorAll('input[name="tipo_participante"]').forEach(radio => {
        radio.addEventListener('change', function() {
            // Pasamos 'document' como contexto porque estamos en la página principal
            actualizarCamposSegunTipo(this.value, document);
        });
    });
    
    // Cargar carreras cuando cambie la facultad
    selectFacultad.addEventListener('change', (e) => {
        const facultadId = e.target.value;
        cargarCarreras(facultadId, selectCarrera, '../php/public/');
    });
    
    // Cerrar modal
    document.getElementById('btnCerrarModal').addEventListener('click', (e) => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Enviar inscripción
    document.getElementById('formInscripcion').addEventListener('submit', (e) => {
        e.preventDefault();
        enviarInscripcion(e.target, modal);
    });

    document.getElementById("btnCerrarX").addEventListener("click", function() {
        modal.remove();
    });

}

function enviarInscripcion(form, modal) {
    const formData = new FormData(form);
    const btnEnviar = document.getElementById('btnSubmit');
    
    // CRÍTICO: Preparar datos en el formato que espera el PHP actualizado
    const datosEnvio = new FormData();
    datosEnvio.append('evento_id', formData.get('evento_id'));
    datosEnvio.append('matricula', formData.get('matricula') || '');
    datosEnvio.append('apellido_paterno', formData.get('apellido_paterno'));
    datosEnvio.append('apellido_materno', formData.get('apellido_materno'));
    datosEnvio.append('nombres', formData.get('nombres'));
    datosEnvio.append('correo', formData.get('correo'));
    datosEnvio.append('genero', formData.get('genero'));
    datosEnvio.append('carrera', formData.get('carrera') || '');
    datosEnvio.append('tipo_participante', formData.get('tipo_participante'));
    
    // Validar campos requeridos según tipo
    const tipo = formData.get('tipo_participante');
    if (tipo === 'Estudiante') {
        if (!formData.get('matricula') || !formData.get('carrera')) {
            mostrarToast('Los estudiantes deben proporcionar matrícula y carrera', 'error');
            return;
        }
    }
    
    btnEnviar.disabled = true;
    btnEnviar.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite; vertical-align: middle; margin-right: 8px;">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Enviando...
    `;
    
    // Agregar animación de spin
    if (!document.getElementById('spin-animation')) {
        const spinStyle = document.createElement('style');
        spinStyle.id = 'spin-animation';
        spinStyle.textContent = `
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(spinStyle);
    }
    
    fetch('../php/public/inscribirEvento.php', {
        method: 'POST',
        body: datosEnvio
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            mostrarModalExito(data.mensaje, modal);
        } else {
            mostrarToast(data.mensaje, 'error');
            btnEnviar.disabled = false;
            btnEnviar.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 8px;">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <line x1="20" y1="8" x2="20" y2="14"/>
                    <line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
                Registrarse
            `;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        mostrarToast('Error al procesar la inscripción. Intenta de nuevo.', 'error');
        btnEnviar.disabled = false;
        btnEnviar.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 8px;">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
            Registrarse
        `;
    });
}

function mostrarModalExito(mensaje, modalRegistro) {
    modalRegistro.remove();
    
    const modalExito = document.createElement('div');
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
            <h2 style="color: #003366; margin: 0 0 15px 0; font-size: 28px; font-weight: 700;">¡Registro Exitoso!</h2>
            <p style="color: #666; margin: 0 0 30px 0; font-size: 16px; line-height: 1.6;">${mensaje}</p>
            <button onclick="location.reload()" 
                    style="padding: 14px 40px; background: linear-gradient(135deg, #00843D 0%, #00a651 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 16px; transition: all 0.3s; box-shadow: 0 4px 12px rgba(0, 132, 61, 0.3);">
                Aceptar
            </button>
        </div>
    `;
    
    document.body.appendChild(modalExito);
    
    // Cerrar con click fuera del modal
    modalExito.addEventListener('click', (e) => {
        if (e.target === modalExito) {
            modalExito.remove();
            location.reload();
        }
    });
}

function mostrarToast(mensaje, tipo = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${tipo === 'success' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)'};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10002;
        font-weight: 600;
        font-size: 15px;
        animation: slideInRight 0.3s ease, fadeOut 0.3s ease 2.7s;
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: 400px;
    `;
    
    const icon = tipo === 'success' ? '✓' : '✕';
    toast.innerHTML = `
        <span style="font-size: 20px;">${icon}</span>
        <span>${mensaje}</span>
    `;
    
    if (!document.getElementById('toast-animations')) {
        const toastStyle = document.createElement('style');
        toastStyle.id = 'toast-animations';
        toastStyle.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeOut {
                to { opacity: 0; transform: translateX(100%); }
            }
        `;
        document.head.appendChild(toastStyle);
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// =======================================================================
// === NUEVO CÓDIGO PARA REGISTRO DE EQUIPOS (AÑADIR AL FINAL DEL ARCHIVO) ===
// =======================================================================

/**
 * Muestra el formulario para registrar un equipo completo.
 */
function mostrarFormularioEquipo(eventoId, nombreEvento, minIntegrantes = 8, maxIntegrantes = 0) {
    // DECLARAR LAS VARIABLES AQUÍ DENTRO DE LA FUNCIÓN
    let contadorIntegrantes = 0; // Contador local para este formulario
    
    // Evita modales duplicados
    const modalExistente = document.getElementById('modal-inscripcion-equipo');
    if(modalExistente) modalExistente.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-inscripcion-equipo';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.75); display: flex; justify-content: center;
        align-items: flex-start;
        z-index: 10000; overflow-y: auto; padding: 20px; animation: fadeIn 0.3s ease;
    `;
    
    // Construir el texto del máximo de forma segura
    const maxTexto = maxIntegrantes > 0 ? `/ ${maxIntegrantes}` : '(Sin límite)';
    
    // minIntegrantes aquí está recibiendo "2" desde la tarjeta.
    modal.innerHTML = `
        <div style="background: white; padding: 40px; border-radius: 16px; max-width: 900px; width: 100%; margin: 20px auto; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4); animation: slideUp 0.3s ease; max-height: 95vh; overflow-y: auto; position: relative;">
            
            <button type="button" class="btnCerrarXEquipo" style="position: absolute; top: 15px; right: 15px; background: transparent; border: none; cursor: pointer; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s; color: #666;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display: block;">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>

            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #003366; margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">Registro de Equipo</h2>
                <p style="color: #666; margin: 0 0 15px 0; font-size: 15px;">Inscribe a tu equipo (${minIntegrantes} - ${maxIntegrantes > 0 ? maxIntegrantes : 'Sin límite'} integrantes)</p>
                <div style="background: linear-gradient(135deg, #e8f5e9 0%, #f1f8f4 100%); padding: 15px 20px; border-radius: 10px; border-left: 4px solid #00843D;">
                    <p style="margin: 0; color: #003366; font-weight: 600; font-size: 16px;">
                        Evento: <span style="color: #00843D;">${nombreEvento || 'No especificado'}</span>
                    </p>
                </div>
            </div>
            
            <form id="formInscripcionEquipo">
                <input type="hidden" name="evento_id" value="${eventoId}">
                
                <div style="margin-bottom: 25px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 700; color: #003366; font-size: 16px;">
                        Nombre del Equipo <span style="color: #dc3545;">*</span>
                    </label>
                    <input type="text" name="nombre_equipo" required class="form-input"
                            style="width: 100%; padding: 12px 14px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 15px;">
                </div>

                <div id="integrantes-container"></div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
                    <button type="button" id="btnAgregarIntegrante" 
                            style="padding: 12px 20px; background: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        + Añadir Integrante
                    </button>
                    <p style="margin: 0; font-weight: 600; color: #003366; font-size: 16px;">
                        Total: <span id="contador-integrantes">0</span> ${maxTexto}
                    </p>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                    <button type="button" id="btnCerrarModalEquipo" 
                            style="padding: 15px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Cancelar
                    </button>
                    <button type="submit" id="btnSubmitEquipo"
                            style="padding: 15px; background: linear-gradient(135deg, #00843D 0%, #00a651 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Registrar Equipo
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);

    // Añadir estilos
    if (!document.getElementById('estilos-inscripcion-dinamicos')) {
        const style = document.createElement('style');
        style.id = 'estilos-inscripcion-dinamicos';
        style.textContent = `
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            
            .btnCerrarXEquipo:hover {
                background: #f3f4f6 !important;
                color: #dc3545 !important;
            }
            .radio-option input[type="radio"]:checked + span { color: #00843D; font-weight: 600; }
            .radio-option:has(input[type="radio"]:checked) { border-color: #00843D !important; background: #f1f8f4 !important; }
            .form-input:focus { outline: none; border-color: #00843D !important; box-shadow: 0 0 0 3px rgba(0, 132, 61, 0.1) !important; }
            .form-input:invalid:not(:placeholder-shown) { border-color: #dc3545 !important; }
            .form-input:valid:not(:placeholder-shown) { border-color: #28a745 !important; }
            .radio-option {
                display: flex; align-items: center; cursor: pointer; padding: 10px; 
                background: white; border-radius: 8px; border: 2px solid #e0e0e0; 
                font-size: 14px; transition: all 0.2s;
            }
            .radio-option input[type="radio"] {
                margin-right: 8px; width: 18px; height: 18px; cursor: pointer; accent-color: #00843D;
            }
        `;
        document.head.appendChild(style);
    }

    // --- Función interna para agregar integrantes ---
    function agregarIntegranteInterno(esCapitan = false) {
        const container = document.getElementById('integrantes-container');
        const index = contadorIntegrantes;
        
        const divIntegrante = document.createElement('div');
        divIntegrante.className = 'integrante-card';
        divIntegrante.style.cssText = 'border: 1px solid #ddd; border-radius: 12px; padding: 20px; margin-bottom: 20px; background: #fdfdfd;';
        
        const titulo = esCapitan ? 'Integrante 1 (Capitán del Equipo)' : `Integrante ${index + 1}`;
        const nombreMatricula = esCapitan ? 'capitan_matricula' : `integrantes[${index}][matricula]`;
        const nombreBase = esCapitan ? '' : `integrantes[${index}]`;

        const hiddenFieldsCapitan = esCapitan ? `
            <input type="hidden" name="integrantes[0][matricula]" data-bind-to="capitan_matricula">
            <input type="hidden" name="integrantes[0][apellido_paterno]" data-bind-to="[apellido_paterno]">
            <input type="hidden" name="integrantes[0][apellido_materno]" data-bind-to="[apellido_materno]">
            <input type="hidden" name="integrantes[0][nombres]" data-bind-to="[nombres]">
            <input type="hidden" name="integrantes[0][genero]" data-bind-to="[genero]">
            <input type="hidden" name="integrantes[0][correo]" data-bind-to="[correo]">
            <input type="hidden" name="integrantes[0][tipo_participante]" data-bind-to="[tipo_participante]">
            <input type="hidden" name="integrantes[0][carrera_id]" data-bind-to="[carrera_id]"> 
        ` : '';

        divIntegrante.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #00843D;">${titulo}</h3>
                ${!esCapitan ? '<button type="button" class="btn-quitar-integrante" style="background: #dc3545; color: white; border: none; border-radius: 5px; padding: 5px 10px; cursor: pointer;">Quitar</button>' : ''}
            </div>
            
            ${hiddenFieldsCapitan}

            <div style="background: #f4f8f4; padding: 15px; border-radius: 12px; margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 12px; font-weight: 600; color: #003366; font-size: 14px;">Tipo de Participante <span style="color: #dc3545;">*</span></label>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                    <label class="radio-option">
                        <input type="radio" name="${nombreBase}[tipo_participante]" value="Estudiante" checked> Estudiante
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="${nombreBase}[tipo_participante]" value="Docente"> Docente
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="${nombreBase}[tipo_participante]" value="Externo"> Externo
                    </label>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div>
                    <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 600; color: #333;">Apellido Paterno <span style="color: #dc3545;">*</span></label>
                    <input type="text" name="${nombreBase}[apellido_paterno]" required class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 600; color: #333;">Apellido Materno <span style="color: #dc3545;">*</span></label>
                    <input type="text" name="${nombreBase}[apellido_materno]" required class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px;">
                </div>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 600; color: #333;">Nombre(s) <span style="color: #dc3545;">*</span></label>
                <input type="text" name="${nombreBase}[nombres]" required class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px;">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div class="matricula-container-equipo">
                    <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 600; color: #333;">
                        <span class="label-matricula">Matrícula</span> <span style="color: #dc3545;" class="required-matricula">*</span>
                    </label>
                    <input type="text" name="${nombreMatricula}" required class="form-input input-matricula" pattern="[0-9]{6,10}" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 600; color: #333;">Género <span style="color: #dc3545;">*</span></label>
                    <select name="${nombreBase}[genero]" required class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; background: white; cursor: pointer;">
                        <option value="">Selecciona</option>
                        <option value="Hombre">Hombre</option>
                        <option value="Mujer">Mujer</option>
                    </select>
                </div>
            </div>

            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 600; color: #333;">Correo Electrónico UABC <span style="color: #dc3545;">*</span></label>
                <input type="email" name="${nombreBase}[correo]" required pattern="[a-zA-Z0-9._+\\-]+@uabc\\.(edu\\.)?mx" class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px;">
            </div>

            <div class="facultad-container-equipo" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 600; color: #333;">
                    <span class="label-facultad">Unidad Académica</span> <span style="color: #dc3545;" class="required-facultad">*</span>
                </label>
                <select name="${nombreBase}[facultad]" required class="form-input select-facultad" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; background: white; cursor: pointer;">
                    <option value="">Cargando facultades...</option>
                </select>
            </div>
            <div class="carrera-container-equipo" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 600; color: #333;">
                    <span class="label-carrera">Carrera</span> <span style="color: #dc3545;" class="required-carrera">*</span>
                </label>
                <select name="${nombreBase}[carrera_id]" required class="form-input select-carrera" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; background: white; cursor: pointer;">
                    <option value="">Selecciona primero una facultad</option>
                </select>
            </div>
        `;
        
        container.appendChild(divIntegrante);
        contadorIntegrantes++;
        document.getElementById('contador-integrantes').textContent = contadorIntegrantes;

        // Quitar integrante
        divIntegrante.querySelector('.btn-quitar-integrante')?.addEventListener('click', function() {
            divIntegrante.remove();
            contadorIntegrantes--;
            document.getElementById('contador-integrantes').textContent = contadorIntegrantes;
        });

        // Cargar facultades
        const selectFacultad = divIntegrante.querySelector('.select-facultad');
        cargarFacultadesEquipo(selectFacultad);

        // Cargar carreras
        const selectCarrera = divIntegrante.querySelector('.select-carrera');
        selectFacultad.addEventListener('change', (e) => {
            const facultadId = e.target.value;
            if (facultadId) {
                cargarCarrerasEquipo(facultadId, selectCarrera);
            } else {
                selectCarrera.innerHTML = '<option value="">Selecciona primero una facultad</option>';
            }
        });

        // Tipo de participante
        divIntegrante.querySelectorAll('input[name*="[tipo_participante]"]').forEach(radio => {
            radio.addEventListener('change', function() {
                actualizarCamposEquipo(this.value, divIntegrante);
            });
        });
        
        actualizarCamposEquipo('Estudiante', divIntegrante);

        // Si es capitán, duplicar datos
        if (esCapitan) {
            adjuntarListenersCapitan(divIntegrante);
        }
    }

    // Añadir el primer integrante (Capitán)
    agregarIntegranteInterno(true);

    // Listener para añadir más integrantes
    document.getElementById('btnAgregarIntegrante').addEventListener('click', () => {
        if (maxIntegrantes > 0 && contadorIntegrantes >= maxIntegrantes) {
            mostrarToast(`Se ha alcanzado el límite de ${maxIntegrantes} integrantes`, 'error');
        } else {
            agregarIntegranteInterno(false);
        }
    });

    // Cerrar modal
    document.getElementById('btnCerrarModalEquipo').addEventListener('click', () => modal.remove());
    modal.querySelector('.btnCerrarXEquipo').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    // Enviar formulario
    document.getElementById('formInscripcionEquipo').addEventListener('submit', (e) => {
        e.preventDefault();
        
        // ¡¡¡AQUÍ ESTÁ LA VALIDACIÓN!!!
        // Si 'minIntegrantes' es 2 (porque lo leyó del HTML)...
        // y 'contadorIntegrantes' es 2 (porque solo agregaste 2)...
        // La condición '2 < 2' es FALSA.
        // Por eso, NO se detiene y llama a 'enviarInscripcionEquipo'.
        if (contadorIntegrantes < minIntegrantes) {
            mostrarToast(`Se requiere un mínimo de ${minIntegrantes} integrantes para registrar el equipo`, 'error');
            return;
        }
        if (maxIntegrantes > 0 && contadorIntegrantes > maxIntegrantes) {
            mostrarToast(`Se ha superado el límite de ${maxIntegrantes} integrantes`, 'error');
            return;
        }
        enviarInscripcionEquipo(e.target, modal);
    });
}

/**
 * Añade dinámicamente los campos para un nuevo integrante al formulario.
 * @param {boolean} esCapitan - True si es el primer integrante (capitán)
 */
function agregarCamposIntegrante(esCapitan = false) {
    // Esta función parece ser un duplicado de 'agregarIntegranteInterno'.
    // La borro para evitar confusión, ya que 'agregarIntegranteInterno' es la que se usa.
    // Si la necesitas, la puedes dejar, pero parece redundante.
}

/**
 * Carga facultades en un select específico.
 * (Versión adaptada de 'cargarFacultades' para el form de equipo)
 */
function cargarFacultadesEquipo(selectElement) {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">Cargando facultades...</option>';
    
    // Reutiliza el fetch de la función original
    fetch('../php/public/obtenerFacultades.php')
        .then(response => response.json())
        .then(data => {
            if (data.error) throw new Error(data.mensaje);
            selectElement.innerHTML = '<option value="">Selecciona tu facultad</option>';
            const facultades = data.success ? data.facultades : data;
            facultades.forEach(facultad => {
                selectElement.innerHTML += `<option value="${facultad.id}">${facultad.nombre} (${facultad.siglas})</option>`;
            });
        })
        .catch(error => {
            console.error('Error:', error);
            selectElement.innerHTML = '<option value="">Error al cargar</option>';
        });
}

/**
 * Carga carreras en un select específico.
 * (Versión adaptada de 'cargarCarreras' para el form de equipo)
 */
function cargarCarrerasEquipo(facultadId, selectElement) {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">Cargando carreras...</option>';
    
    if (!facultadId) {
        selectElement.innerHTML = '<option value="">Selecciona primero una facultad</option>';
        return;
    }
    // Reutiliza el fetch de la función original
    fetch(`../php/public/obtenerCarreras.php?facultad_id=${facultadId}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) throw new Error(data.mensaje);
            selectElement.innerHTML = '<option value="">Selecciona tu carrera</option>';
            const carreras = data.success ? data.carreras : data;
            carreras.forEach(carrera => {
                const nombreMostrar = carrera.nombre_completo || carrera.nombre;
                selectElement.innerHTML += `<option value="${carrera.id}" style="${carrera.es_tronco_comun ? 'font-weight: 600; color: #00843D;' : ''}">${nombreMostrar}</option>`;
            });
        })
        .catch(error => {
            console.error('Error:', error);
            selectElement.innerHTML = '<option value="">Error al cargar</option>';
        });
}

/**
 * Actualiza los campos de un integrante según su tipo.
 * (Versión adaptada de 'actualizarCamposSegunTipo' para el form de equipo)
 */
function actualizarCamposEquipo(tipo, cardElement) {
    const labelMatricula = cardElement.querySelector('.label-matricula');
    const inputMatricula = cardElement.querySelector('.input-matricula');
    const requiredMatricula = cardElement.querySelector('.required-matricula');
    const facultadContainer = cardElement.querySelector('.facultad-container-equipo');
    const selectFacultad = cardElement.querySelector('.select-facultad');
    const requiredFacultad = cardElement.querySelector('.required-facultad');
    const carreraContainer = cardElement.querySelector('.carrera-container-equipo');
    const selectCarrera = cardElement.querySelector('.select-carrera');
    const requiredCarrera = cardElement.querySelector('.required-carrera');
    
    // Reutiliza la lógica de la función original
    if (tipo === 'Estudiante') {
        labelMatricula.textContent = 'Matrícula';
        inputMatricula.placeholder = '12345678';
        inputMatricula.required = true;
        inputMatricula.setAttribute('pattern', '[0-9]{6,10}');
        requiredMatricula.style.display = 'inline';
        
        selectFacultad.required = true;
        requiredFacultad.style.display = 'inline';
        facultadContainer.style.display = 'block';
        
        selectCarrera.required = true;
        requiredCarrera.style.display = 'inline';
        carreraContainer.style.display = 'block';
    } else if (tipo === 'Docente') {
        labelMatricula.textContent = 'Número de Empleado';
        inputMatricula.placeholder = 'Núm. empleado';
        inputMatricula.required = true;
        inputMatricula.setAttribute('pattern', '[0-9]{4,10}');
        requiredMatricula.style.display = 'inline';
        
        selectFacultad.required = false; // Docente no requiere facultad
        requiredFacultad.style.display = 'none';
        facultadContainer.style.display = 'block'; // Pero puede seleccionarla
        
        selectCarrera.required = false;
        requiredCarrera.style.display = 'none';
        carreraContainer.style.display = 'block'; // Pero puede seleccionarla
    } else { // Externo
        labelMatricula.textContent = 'Identificación (Opcional)';
        inputMatricula.placeholder = 'ID opcional';
        inputMatricula.required = false;
        inputMatricula.removeAttribute('pattern');
        requiredMatricula.style.display = 'none';
        
        selectFacultad.required = false;
        requiredFacultad.style.display = 'none';
        facultadContainer.style.display = 'none'; // Externo no tiene facultad
        
        selectCarrera.required = false;
        requiredCarrera.style.display = 'none';
        carreraContainer.style.display = 'none'; // Externo no tiene carrera
    }
}

/**
 * Adjunta listeners a los campos del capitán para duplicar sus datos
 * en los campos ocultos 'integrantes[0][...]'
 */
function adjuntarListenersCapitan(cardElement) {
    const campos = [
        'capitan_matricula', '[apellido_paterno]', '[apellido_materno]', 
        '[nombres]', '[genero]', '[correo]', '[tipo_participante]', '[carrera_id]'
    ];
    
    campos.forEach(campo => {
        // El nombre del campo en el formulario (ej. "capitan_matricula" o "[nombres]")
        const selector = `[name="${campo}"]`;
        // El nombre del campo en el data-bind-to (ej. "capitan_matricula" o "[nombres]")
        const targetBind = campo;
        const hiddenInput = cardElement.querySelector(`input[data-bind-to="${targetBind}"]`);

        if (!hiddenInput) {
            console.warn('No se encontró el hidden input para:', targetBind);
            return; 
        }

        if (campo === '[tipo_participante]') {
            // Caso especial para radio buttons
            cardElement.querySelectorAll('input[name="[tipo_participante]"]').forEach(radio => {
                radio.addEventListener('change', function() {
                    if (this.checked) {
                        hiddenInput.value = this.value;
                    }
                });
            });
            // Asignar valor inicial
            hiddenInput.value = cardElement.querySelector('input[name="[tipo_participante]"]:checked').value;
            return; // Saltar al siguiente campo
        } 
        
        const input = cardElement.querySelector(selector);

        if (input) {
            // Asignar valor inicial (para selects y campos pre-llenados)
            hiddenInput.value = input.value;
            
            // Adjuntar listener de cambio (para selects, radios)
            input.addEventListener('change', () => {
                hiddenInput.value = input.value;
            });
            
            // Adjuntar listener de input (para campos de texto)
            if (input.type === 'text' || input.type === 'email') {
                 input.addEventListener('input', () => {
                    hiddenInput.value = input.value;
                });
            }
        } else {
             console.warn('No se encontró el input para:', selector);
        }
    });
}


/**
 * Envía el formulario de equipo al backend 'inscribirEquipo.php'
 */
function enviarInscripcionEquipo(form, modal) {
    const formData = new FormData(form);
    const btnEnviar = document.getElementById('btnSubmitEquipo');

    // --- INICIO DE LA CORRECCIÓN ---
    // El formulario envía campos malformados como "[nombres]" y "[correo]"
    // para el capitán, los cuales rompen PHP.
    // Creamos un nuevo FormData SÓLO con los campos que el backend espera.
    
    const formDataLimpia = new FormData();

    // Iteramos sobre el FormData original
    for (const [key, value] of formData.entries()) {
        // Si la clave NO empieza con "[", es un campo válido y lo agregamos
        if (!key.startsWith('[')) {
            formDataLimpia.append(key, value);
        }
    }
    // Ahora `formDataLimpia` tiene 'nombre_equipo', 'evento_id', 'capitan_matricula',
    // y todos los 'integrantes[0][...]', 'integrantes[1][...]', etc.
    // Pero ya NO tiene los problemáticos '[nombres]', '[correo]', etc.
    // --- FIN DE LA CORRECCIÓN ---

    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Enviando Equipo...';
    
    // (Añadir lógica de spinner si se desea, como en el form individual)

    fetch('../php/public/inscribirEquipo.php', {
        method: 'POST',
        body: formDataLimpia // <-- USAMOS EL FORMDATA LIMPIO
    })
    .then(response => {
        // Primero, revisamos si la respuesta es JSON válido
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return response.json();
        } else {
            // Si no es JSON, es un error de PHP.
            return response.text().then(text => {
                throw new Error("El servidor respondió con un error (no-JSON): " + text);
            });
        }
    })
    .then(data => {
        if (data.success) {
            // Reutiliza el modal de éxito existente
            mostrarModalExito(data.mensaje || "¡Equipo registrado con éxito!", modal);
        } else {
            // Reutiliza el toast de error existente
            mostrarToast(data.mensaje || 'Error al registrar el equipo', 'error');
            btnEnviar.disabled = false;
            btnEnviar.textContent = 'Registrar Equipo';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        // Mostramos el error de PHP si existe
        mostrarToast(error.message || 'Error de conexión al inscribir el equipo. Intenta de nuevo.', 'error');
        btnEnviar.disabled = false;
        btnEnviar.textContent = 'Registrar Equipo';
    });
}
// ==========================================
// EXPONER FUNCIONES AL ÁMBITO GLOBAL
// ==========================================
// Esto permite que Eventos.js pueda invocar esta función aunque esto sea un módulo
window.agregarBotonesInscripcion = agregarBotonesInscripcion;
window.mostrarFormularioEquipo = mostrarFormularioEquipo;