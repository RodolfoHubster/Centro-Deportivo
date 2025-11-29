/**
 * Inscripcion.js - VERSIÓN CORREGIDA
 * Actualizado para nueva estructura de BD con tabla participante
 */

import { actualizarCamposSegunTipo, cargarFacultades, cargarCarreras, cargarCampus } from '../utils/formLogica.js';

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
    // Usar el archivo obtenerEventos.php existente pero con el filtro 'activos=true'
    fetch('../php/public/obtenerEventos.php?activos=true') 
        .then(response => response.json())
        .then(data => {
            if (data.success && data.eventos) {
                // Buscar el evento específico por ID
                const evento = data.eventos.find(e => e.id == eventoId);
                
                if (evento) {
                    const nombreEvento = evento.nombre || 'Evento';
                    const tipoRegistro = evento.tipo_registro || 'Individual';
                    // === LÍNEA MODIFICADA: Verifica el campo 'tiene_cupo' ===
                    const tieneCupo = evento.tiene_cupo == 1; // Lee el campo 'tiene_cupo' del backend
                    
                    if (!tieneCupo) {
                        // El evento está lleno, mostrar mensaje de error y salir
                        mostrarToast(`El evento "${nombreEvento}" ha alcanzado el cupo máximo de participantes.`, 'error');
                        return; // Detener ejecución y no mostrar formulario
                    }
                    // === FIN DE LÓGICA NUEVA ===

                    // Si hay cupo, procede con la lógica normal:
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

                } else {
                    // Si el ID es erróneo o el evento no existe
                    mostrarToast('El evento solicitado no está disponible.', 'error');
                    console.warn('Evento no encontrado en la lista');
                }
            } else {
                // Si hay error en el fetch
                mostrarToast('Error al obtener datos del evento. Intenta de nuevo más tarde.', 'error');
                console.warn('No se pudieron obtener los datos de los eventos');
            }
        })
        .catch(error => {
            console.error('Error al obtener datos del evento:', error);
            mostrarToast('Error de conexión. Intenta de nuevo más tarde.', 'error');
        });
}

function agregarBotonesInscripcion() {
    const tarjetasEvento = document.querySelectorAll('.evento-card, .event-card, .card-evento');
    // NUEVA LÍNEA: Identificar la página actual
    const paginaActual = window.location.pathname.split('/').pop();

    tarjetasEvento.forEach((tarjeta) => {
        
        // ======================================
        // ===== ¡ESTA ES LA LÍNEA MÁGICA! =====
        // ======================================
        // Si la tarjeta tiene la marca 'data-lleno', no hagas nada y salta a la siguiente.
        if (tarjeta.getAttribute('data-lleno') === 'true') {
            return; // Saltar esta tarjeta
        }
        // ======================================

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
        
        const min = tarjeta.getAttribute('data-integrantes-min') || 8;
        
        // Si es 0 (o nulo) lo dejamos así para "sin límite"
        const max = tarjeta.getAttribute('data-integrantes-max') || 0;

        // --- FIN DE CAMBIOS ---
        
        const contenedorBotones = tarjeta.querySelector('.card-actions, .evento-actions, .btn-container');
        if (!contenedorBotones) return;


        // =========================================================
        // ===== LÓGICA CONDICIONAL DE BOTONES (MODIFICADO) =====
        // =========================================================
        
        const esTorneoEquipo = paginaActual === 'torneos.html' && tipoRegistro === 'Por equipos';

        // Estilos base para el botón principal (crear equipo / registro individual)
        const estilosBaseBoton = `
            background: linear-gradient(135deg, #00843D 0%, #00a651 100%);
            color: white;
            padding: 14px 28px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            font-size: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 132, 61, 0.3);
            width: 100%;
        `;
        
        if (esTorneoEquipo) {
            // Caso 1: Torneos por equipo -> Dos botones
            
            // 1. Botón Principal: Registrar Mi Equipo
            const btnCrearEquipo = document.createElement('button');
            btnCrearEquipo.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 8px;">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Registrar Mi Equipo
            `;
            btnCrearEquipo.className = 'btn-inscribir btn-crear-equipo';
            btnCrearEquipo.style.cssText = estilosBaseBoton + `margin-bottom: 10px;`;
            
            btnCrearEquipo.addEventListener('click', () => {
                mostrarFormularioEquipo(eventoId, nombreEvento, min, max);
            });

            // 2. Botón Secundario: Unirme a Equipo Existente
            const btnUnirseEquipo = document.createElement('button');
            btnUnirseEquipo.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 8px;">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <line x1="20" y1="8" x2="20" y2="14"/>
                    <line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
                Unirme a Equipo
            `;
            btnUnirseEquipo.className = 'btn-unirse-equipo';
            // Estilo diferente para el segundo botón
            btnUnirseEquipo.style.cssText = `
                background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                color: white;
                padding: 14px 28px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                font-size: 16px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
                width: 100%;
            `;

            btnUnirseEquipo.addEventListener('click', () => {
                // Llama a la nueva función
                mostrarFormularioUnirseEquipo(eventoId, nombreEvento);
            });

            contenedorBotones.appendChild(btnCrearEquipo);
            contenedorBotones.appendChild(btnUnirseEquipo);

        } else {
            // Caso 2: Eventos Individuales (incluyendo torneos individuales) -> Un solo botón
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
            btnInscribir.style.cssText = estilosBaseBoton + `margin-top: 15px;`;

            btnInscribir.addEventListener('click', () => {
                mostrarFormularioInscripcion(eventoId, nombreEvento);
            });
            
            contenedorBotones.appendChild(btnInscribir);
        }

        // Agregar efectos hover una sola vez para ambos botones
        const botones = contenedorBotones.querySelectorAll('button');
        botones.forEach(btn => {
            btn.addEventListener('mouseover', () => {
                btn.style.transform = 'translateY(-2px)';
                btn.style.boxShadow = '0 6px 16px rgba(0, 132, 61, 0.4)';
            });
            
            btn.addEventListener('mouseout', () => {
                btn.style.transform = 'translateY(0)';
                btn.style.boxShadow = btn.classList.contains('btn-unirse-equipo') 
                    ? '0 4px 12px rgba(0, 123, 255, 0.3)'
                    : '0 4px 12px rgba(0, 132, 61, 0.3)';
            });
        });
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
                            <span style="font-size: 15px; font-weight: 500;">Docente</span>
                        </label>

                        <label class="radio-option" style="display: flex; align-items: center; cursor: pointer; padding: 12px; background: white; border-radius: 8px; border: 2px solid #e0e0e0; transition: all 0.2s;">
                            <input type="radio" name="tipo_participante" value="Personal Académico" checked 
                                    style="margin-right: 12px; width: 20px; height: 20px; cursor: pointer; accent-color: #00843D;">
                            <span style="font-size: 15px; font-weight: 500;">Personal Académico</span>
                        </label>

                        <label class="radio-option" style="display: flex; align-items: center; cursor: pointer; padding: 12px; background: white; border-radius: 8px; border: 2px solid #e0e0e0; transition: all 0.2s;">
                            <input type="radio" name="tipo_participante" value="Personal de Servicio" checked 
                                    style="margin-right: 12px; width: 20px; height: 20px; cursor: pointer; accent-color: #00843D;">
                            <span style="font-size: 15px; font-weight: 500;">Personal de Servicio</span>
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
                            <option value="Prefiero no decirlo">Prefiero no decirlo</option>
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

                <div style="margin-bottom: 10px;", id="campus-container">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 14px;">
                        <span id="label-campus">Unidad Académica (Campus)</span> <span style="color: #dc3545;" id="required-campus">*</span>
                    </label>
                    <select name="campus" id="select-campus" required class="form-input" 
                            style="width: 100%; padding: 12px 14px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 15px; cursor: pointer; transition: all 0.2s; background: white; box-sizing: border-box;">
                        <option value="">Cargando unidades academicas...</option>
                    </select>
                </div>

                <div style="margin-bottom: 20px;" id="facultad-container">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 14px;">
                        <span id="label-facultad">Facultad</span> <span style="color: #dc3545;" id="required-facultad">*</span>
                    </label>
                    <select name="facultad" id="select-facultad" required class="form-input"
                            style="width: 100%; padding: 12px 14px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 15px; cursor: pointer; transition: all 0.2s; background: white; box-sizing: border-box;">
                        <option value="">Selecciona primero una Unidad Academica</option>
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
    const selectCampus = document.getElementById('select-campus');
    const selectFacultad = document.getElementById('select-facultad');
    const selectCarrera = document.getElementById('select-carrera');
    
    // Le pasamos el select y la ruta relativa al PHP desde 'public/'
    cargarCampus(selectCampus, '../php/public/');
    const campusSeleccionado = selectCampus?.value;
    if (campusSeleccionado) {
        cargarFacultades(selectFacultad, campusSeleccionado, '../php/public/');
    }

    // Manejar cambio de tipo de participante
    document.querySelectorAll('input[name="tipo_participante"]').forEach(radio => {
        radio.addEventListener('change', function() {
            // Pasamos 'document' como contexto porque estamos en la página principal
            actualizarCamposSegunTipo(this.value, document);
        });
    });
    
    selectCampus.addEventListener('change', (e) => {
        const campusId = e.target.value;
        cargarFacultades(selectFacultad, campusId, '../php/public/');
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
// ========================================================================-==

/**
 * Muestra el formulario para registrar un equipo completo.
 */
/**
 * Muestra el formulario para registrar un equipo completo.
 * VERSIÓN CORREGIDA: RESPONSIVE (Móvil Friendly)
 */
function mostrarFormularioEquipo(eventoId, nombreEvento, minIntegrantes = 8, maxIntegrantes = 0) {
    let contadorIntegrantes = 0; 
    
    const modalExistente = document.getElementById('modal-inscripcion-equipo');
    if(modalExistente) modalExistente.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-inscripcion-equipo';
    // CAMBIO 1: align-items: flex-start y padding-top para permitir scroll natural en móvil
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.75); display: flex; justify-content: center;
        align-items: flex-start; 
        z-index: 10000; overflow-y: auto; padding: 20px 10px; animation: fadeIn 0.3s ease;
    `;
    
    const maxTexto = maxIntegrantes > 0 ? `/ ${maxIntegrantes}` : '(Sin límite)';
    
    // CAMBIO 2: Quitamos 'max-height' y 'overflow-y' del contenedor blanco.
    // Usamos clases CSS para manejar el padding y el ancho responsivo.
    modal.innerHTML = `
        <div class="modal-contenido-responsive" style="background: white; border-radius: 16px; margin: 20px auto; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4); animation: slideUp 0.3s ease; position: relative;">
            
            <button type="button" class="btnCerrarXEquipo" style="position: absolute; top: 15px; right: 15px; background: transparent; border: none; cursor: pointer; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s; color: #666;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display: block;">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>

            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #003366; margin: 0 0 8px 0; font-size: 24px; font-weight: 700;">Registro de Equipo</h2>
                <p style="color: #666; margin: 0 0 15px 0; font-size: 14px;">Inscribe a tu equipo (${minIntegrantes} - ${maxIntegrantes > 0 ? maxIntegrantes : 'Sin límite'} integrantes)</p>
                
                <!-- El titulo del formulario por equipo ya no aparece con el cuadro -->
                <h3 style="margin: 0; color: #003366; font-weight: 600; font-size: 20px;">
                    <span style="color: #00843D;">${nombreEvento || 'No especificado'}</span>
                </h3>
            </div>
            
            <form id="formInscripcionEquipo">
                <input type="hidden" name="evento_id" value="${eventoId}">
                
                <div style="margin-bottom: 25px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 700; color: #003366; font-size: 16px;">
                        Nombre del Equipo <span style="color: #dc3545;">*</span>
                    </label>
                    <input type="text" name="nombre_equipo" required class="form-input"
                            style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 15px; box-sizing: border-box;">
                </div>

                <div id="integrantes-container"></div>
                
                <div class="acciones-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; flex-wrap: wrap; gap: 10px;">
                    <button type="button" id="btnAgregarIntegrante" 
                            style="padding: 12px 20px; background: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; flex-grow: 1;">
                        + Añadir Integrante
                    </button>
                    <p style="margin: 0; font-weight: 600; color: #003366; font-size: 16px; white-space: nowrap;">
                        Total: <span id="contador-integrantes">0</span> ${maxTexto}
                    </p>
                </div>

                <div class="grid-botones-finales" style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                    <button type="button" id="btnCerrarModalEquipo" 
                            style="padding: 15px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; width: 100%;">
                        Cancelar
                    </button>
                    <button type="submit" id="btnSubmitEquipo"
                            style="padding: 15px; background: linear-gradient(135deg, #00843D 0%, #00a651 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; width: 100%;">
                        Registrar Equipo
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);

    // CAMBIO 3: ESTILOS DINÁMICOS Y MEDIA QUERIES
    if (!document.getElementById('estilos-inscripcion-dinamicos')) {
        const style = document.createElement('style');
        style.id = 'estilos-inscripcion-dinamicos';
        style.textContent = `
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            
            /* Estilos base */
            .modal-contenido-responsive { padding: 40px; width: 100%; max-width: 900px; }
            .grid-responsive { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
            .grid-botones-finales { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .radio-group-responsive { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }

            /* === MEDIA QUERY PARA MÓVIL === */
            @media (max-width: 600px) {
                .modal-contenido-responsive { padding: 20px; } /* Menos padding */
                .grid-responsive { grid-template-columns: 1fr; } /* 1 sola columna */
                .grid-botones-finales { grid-template-columns: 1fr; } /* Botones apilados */
                .radio-group-responsive { grid-template-columns: 1fr; } /* Radios apilados */
                
                /* Ajuste inputs */
                .form-input { font-size: 16px !important; } /* Evita zoom en iPhone */
            }

            .btnCerrarXEquipo:hover { background: #f3f4f6 !important; color: #dc3545 !important; }
            .radio-option input[type="radio"]:checked + span { color: #00843D; font-weight: 600; }
            .radio-option:has(input[type="radio"]:checked) { border-color: #00843D !important; background: #f1f8f4 !important; }
            .form-input:focus { outline: none; border-color: #00843D !important; box-shadow: 0 0 0 3px rgba(0, 132, 61, 0.1) !important; }
            .form-input:invalid:not(:placeholder-shown) { border-color: #dc3545 !important; }
            .form-input:valid:not(:placeholder-shown) { border-color: #28a745 !important; }
            .radio-option { display: flex; align-items: center; cursor: pointer; padding: 10px; background: white; border-radius: 8px; border: 2px solid #e0e0e0; font-size: 14px; transition: all 0.2s; }
            .radio-option input[type="radio"] { margin-right: 8px; width: 18px; height: 18px; cursor: pointer; accent-color: #00843D; }
        `;
        document.head.appendChild(style);
    }

    // --- FUNCIÓN INTERNA MODIFICADA PARA USAR GRID RESPONSIVE ---
    function agregarIntegranteInterno(esCapitan = false) {
        const container = document.getElementById('integrantes-container');
        const index = contadorIntegrantes;
        
        const divIntegrante = document.createElement('div');
        divIntegrante.className = 'integrante-card';
        divIntegrante.style.cssText = 'border: 1px solid #ddd; border-radius: 12px; padding: 20px; margin-bottom: 20px; background: #fdfdfd; box-shadow: 0 2px 5px rgba(0,0,0,0.05);';
        
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
                <h3 style="margin: 0; color: #00843D; font-size: 18px;">${titulo}</h3>
                ${!esCapitan ? '<button type="button" class="btn-quitar-integrante" style="background: #dc3545; color: white; border: none; border-radius: 5px; padding: 5px 10px; cursor: pointer; font-size: 12px;">✕ Quitar</button>' : ''}
            </div>
            
            ${hiddenFieldsCapitan}

            <div style="background: #f4f8f4; padding: 15px; border-radius: 12px; margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 12px; font-weight: 600; color: #003366; font-size: 14px;">Tipo de Participante <span style="color: #dc3545;">*</span></label>
                <div class="radio-group-responsive">
                    <label class="radio-option">
                        <input type="radio" name="${nombreBase}[tipo_participante]" value="Estudiante" checked> Estudiante
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="${nombreBase}[tipo_participante]" value="Docente"> Docente
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="${nombreBase}[tipo_participante]" value="Personal Académico"> Personal Académico
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="${nombreBase}[tipo_participante]" value="Personal de Servicio"> Personal de Servicio
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="${nombreBase}[tipo_participante]" value="Externo"> Externo
                    </label>
                </div>
            </div>

            <div class="grid-responsive">
                <div>
                    <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 600; color: #333;">Apellido Paterno <span style="color: #dc3545;">*</span></label>
                    <input type="text" name="${nombreBase}[apellido_paterno]" required class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 600; color: #333;">Apellido Materno <span style="color: #dc3545;">*</span></label>
                    <input type="text" name="${nombreBase}[apellido_materno]" required class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
                </div>
            </div>

            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 600; color: #333;">Nombre(s) <span style="color: #dc3545;">*</span></label>
                <input type="text" name="${nombreBase}[nombres]" required class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
            </div>

            <div class="grid-responsive">
                <div class="matricula-container-equipo">
                    <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 600; color: #333;">
                        <span class="label-matricula">Matrícula</span> <span style="color: #dc3545;" class="required-matricula">*</span>
                    </label>
                    <input type="text" name="${nombreMatricula}" required class="form-input input-matricula" pattern="[0-9]{6,10}" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 600; color: #333;">Género <span style="color: #dc3545;">*</span></label>
                    <select name="${nombreBase}[genero]" required class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; background: white; cursor: pointer; box-sizing: border-box;">
                        <option value="">Selecciona</option>
                        <option value="Hombre">Hombre</option>
                        <option value="Mujer">Mujer</option>
                        <option value="Prefiero no decirlo">Prefiero no decirlo</option>
                    </select>
                </div>
            </div>

            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 600; color: #333;">Correo Electrónico UABC <span style="color: #dc3545;">*</span></label>
                <input type="email" name="${nombreBase}[correo]" required pattern="[a-zA-Z0-9._+\\-]+@uabc\\.(edu\\.)?mx" class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
            </div>

            <div class="campus-container-equipo" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 600; color: #333;">
                    <span class="label-campus">Unidad Académica</span> <span style="color: #dc3545;" class="required-campus">*</span>
                </label>
                <select name="${nombreBase}[campus_id]" required class="form-input select-campus" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; background: white; cursor: pointer; box-sizing: border-box;">
                    <option value="">Cargando Unidades Académicas...</option>
                </select>
            </div>

            <div class="facultad-container-equipo" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 600; color: #333;">
                    <span class="label-facultad">Facultad</span> <span style="color: #dc3545;" class="required-facultad">*</span>
                </label>
                <select name="${nombreBase}[facultad]" required class="form-input select-facultad" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; background: white; cursor: pointer; box-sizing: border-box;">
                    <option value="">Cargando facultades...</option>
                </select>
            </div>
            <div class="carrera-container-equipo" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 600; color: #333;">
                    <span class="label-carrera">Carrera</span> <span style="color: #dc3545;" class="required-carrera">*</span>
                </label>
                <select name="${nombreBase}[carrera_id]" required class="form-input select-carrera" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; background: white; cursor: pointer; box-sizing: border-box;">
                    <option value="">Selecciona primero una facultad</option>
                </select>
            </div>
        `;
        
        container.appendChild(divIntegrante);
        contadorIntegrantes++;
        document.getElementById('contador-integrantes').textContent = contadorIntegrantes;

        // Re-asociar eventos (Quitar, Cargar Facultades, etc)
        divIntegrante.querySelector('.btn-quitar-integrante')?.addEventListener('click', function() {
            divIntegrante.remove();
            contadorIntegrantes--;
            document.getElementById('contador-integrantes').textContent = contadorIntegrantes;
        });

        const selectCampus = divIntegrante.querySelector('.select-campus');
        const selectFacultad = divIntegrante.querySelector('.select-facultad');
        const selectCarrera = divIntegrante.querySelector('.select-carrera');
        
        cargarCampusEquipo(selectCampus);
        
        // 2. Cuando cambie el campus → cargar facultades
        selectCampus.addEventListener('change', (e) => {
            const campusId = e.target.value;
            if (campusId) {
                cargarFacultadesEquipo(selectFacultad, campusId);
            } else {
                selectFacultad.innerHTML = '<option value="">Selecciona primero una Unidad</option>';
                selectFacultad.disabled = true;
            }
            // Limpiar carrera al cambiar campus
            selectCarrera.innerHTML = '<option value="">Selecciona primero una facultad</option>';
            selectCarrera.disabled = true;
        });

        // 3. Cuando cambie la facultad → cargar carreras
        selectFacultad.addEventListener('change', (e) => {
            const facultadId = e.target.value;
            if (facultadId) {
                cargarCarrerasEquipo(facultadId, selectCarrera);
            } else {
                selectCarrera.innerHTML = '<option value="">Selecciona primero una facultad</option>';
                selectCarrera.disabled = true;
            }
        });

        divIntegrante.querySelectorAll('input[name*="[tipo_participante]"]').forEach(radio => {
            radio.addEventListener('change', function() {
                actualizarCamposEquipo(this.value, divIntegrante);
            });
        });
        
        actualizarCamposEquipo('Estudiante', divIntegrante);

        if (esCapitan) {
            adjuntarListenersCapitan(divIntegrante);
        }
    }

    // Añadir el primer integrante (Capitán)
    agregarIntegranteInterno(true);

    document.getElementById('btnAgregarIntegrante').addEventListener('click', () => {
        if (maxIntegrantes > 0 && contadorIntegrantes >= maxIntegrantes) {
            mostrarToast(`Se ha alcanzado el límite de ${maxIntegrantes} integrantes`, 'error');
        } else {
            agregarIntegranteInterno(false);
        }
    });

    document.getElementById('btnCerrarModalEquipo').addEventListener('click', () => modal.remove());
    modal.querySelector('.btnCerrarXEquipo').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    document.getElementById('formInscripcionEquipo').addEventListener('submit', (e) => {
        e.preventDefault();
        
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
 * Carga campus/unidades académicas en un select específico.
 * (Versión adaptada de 'cargarCampus' para el form de equipo)
 */
function cargarCampusEquipo(selectElement) {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">Cargando...</option>';
    
    fetch('../php/public/obtenerCampus.php')
        .then(response => response.json())
        .then(data => {
            selectElement.innerHTML = '<option value="">Selecciona tu Unidad</option>';
            const lista = Array.isArray(data) ? data : (data.campus || []);
            lista.forEach(campus => {
                selectElement.innerHTML += `<option value="${campus.id}">${campus.nombre}</option>`;
            });
        })
        .catch(error => {
            console.error('Error:', error);
            selectElement.innerHTML = '<option value="">Error al cargar</option>';
        });
}

/**
 * Carga facultades en un select específico con filtro de campus.
 * (Versión adaptada de 'cargarFacultades' para el form de equipo)
 */
function cargarFacultadesEquipo(selectElement, campusId = null) {
    if (!selectElement) return;
    
    // Si no hay campus seleccionado, bloquear
    if (!campusId) {
        selectElement.innerHTML = '<option value="">Selecciona primero una unidad</option>';
        selectElement.disabled = true;
        return;
    }

    selectElement.innerHTML = '<option value="">Cargando...</option>';
    selectElement.disabled = true;
    
    fetch(`../php/public/obtenerFacultades.php?campus_id=${campusId}`)
        .then(response => response.json())
        .then(data => {
            selectElement.innerHTML = '<option value="">Selecciona tu facultad</option>';
            const facultades = data.success ? data.facultades : data;
            
            if (Array.isArray(facultades) && facultades.length > 0) {
                facultades.forEach(facultad => {
                    selectElement.innerHTML += `<option value="${facultad.id}">${facultad.nombre} (${facultad.siglas || ''})</option>`;
                });
                selectElement.disabled = false;
            } else {
                selectElement.innerHTML = '<option value="">No hay facultades</option>';
            }
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
    
    if (!facultadId) {
        selectElement.innerHTML = '<option value="">Selecciona primero una facultad</option>';
        selectElement.disabled = true;
        return;
    }
    
    selectElement.innerHTML = '<option value="">Cargando carreras...</option>';
    selectElement.disabled = true;
    
    fetch(`../php/public/obtenerCarreras.php?facultad_id=${facultadId}`)
        .then(response => response.json())
        .then(data => {
            selectElement.innerHTML = '<option value="">Selecciona tu carrera</option>';
            const carreras = data.success ? data.carreras : data;
            
            if (Array.isArray(carreras) && carreras.length > 0) {
                carreras.forEach(carrera => {
                    const nombreMostrar = carrera.nombre_completo || carrera.nombre;
                    selectElement.innerHTML += `<option value="${carrera.id}" style="${carrera.es_tronco_comun ? 'font-weight: 600; color: #00843D;' : ''}">${nombreMostrar}</option>`;
                });
                selectElement.disabled = false;
            } else {
                selectElement.innerHTML = '<option value="">No hay carreras</option>';
            }
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


/**
 * Muestra el modal con la lista de equipos disponibles para unirse
 * Se añade al archivo Inscripcion.js después de la función enviarInscripcionEquipo
 */
function mostrarFormularioUnirseEquipo(eventoId, nombreEvento) {
    const modalExistente = document.getElementById('modal-unirse-equipo');
    if(modalExistente) modalExistente.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-unirse-equipo';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.75); display: flex; justify-content: center;
        align-items: flex-start; z-index: 10000; overflow-y: auto; 
        padding: 20px 10px; animation: fadeIn 0.3s ease;
    `;
    
    modal.innerHTML = `
        <div class="modal-contenido-responsive" style="background: white; border-radius: 16px; margin: 20px auto; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4); animation: slideUp 0.3s ease; position: relative; max-width: 900px; width: 100%; padding: 40px;">
            
            <button type="button" class="btnCerrarXUnirse" style="position: absolute; top: 15px; right: 15px; background: transparent; border: none; cursor: pointer; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s; color: #666; z-index: 1;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display: block;">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>

            <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); width: 70px; height: 70px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                </div>
                <h2 style="color: #003366; margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">Unirse a un Equipo</h2>
                <p style="color: #666; margin: 0; font-size: 15px;">Selecciona un equipo existente para unirte</p>
                <h3 style="color: #007bff; margin: 15px 0 0 0; font-size: 22px; font-weight: 600;">${nombreEvento}</h3>
            </div>

            <div id="loading-equipos" style="text-align: center; padding: 40px;">
                <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#007bff" stroke-width="2" style="animation: spin 1s linear infinite;">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                <p style="color: #666; margin-top: 15px;">Cargando equipos disponibles...</p>
            </div>

            <div id="lista-equipos" style="display: none;"></div>

            <div style="margin-top: 30px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
                <button type="button" id="btnCerrarUnirse" 
                        style="padding: 14px 32px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 16px; transition: all 0.3s;">
                    Cerrar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);

    // Cargar equipos
fetch(`../php/public/obtenerEquipo.php?evento_id=${eventoId}`)
        .then(response => {
            console.log('Estado de respuesta:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Datos recibidos:', data);
            document.getElementById('loading-equipos').style.display = 'none';
            const listaContainer = document.getElementById('lista-equipos');
            listaContainer.style.display = 'block';

            if (data.success && data.equipos && data.equipos.length > 0) {
                mostrarListaEquipos(data.equipos, listaContainer, eventoId, nombreEvento);
            } else {
                listaContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px; background: #f8f9fa; border-radius: 12px;">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#6c757d" stroke-width="1.5" style="margin-bottom: 15px;">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <p style="color: #666; font-size: 16px; margin: 0;">No hay equipos registrados para este evento aún.</p>
                        <p style="color: #999; font-size: 14px; margin: 10px 0 0 0;">Sé el primero en crear un equipo.</p>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error completo:', error);
            document.getElementById('loading-equipos').style.display = 'none';
            const listaContainer = document.getElementById('lista-equipos');
            listaContainer.style.display = 'block';
            listaContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 12px;">
                    <p style="color: #856404; margin: 0;">Error al cargar los equipos: ${error.message}</p>
                    <p style="color: #856404; margin: 10px 0 0 0; font-size: 14px;">Verifica la consola para más detalles.</p>
                </div>
            `;
        });

    // Cerrar modal
    modal.querySelector('.btnCerrarXUnirse').addEventListener('click', () => modal.remove());
    document.getElementById('btnCerrarUnirse').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

/**
 * Renderiza la lista de equipos disponibles
 */
function mostrarListaEquipos(equipos, container, eventoId, nombreEvento) {
    let html = '<div style="display: grid; gap: 20px;">';

    equipos.forEach(equipo => {
        const porcentajeLlenado = equipo.integrantes_max > 0 
            ? (equipo.total_integrantes / equipo.integrantes_max) * 100 
            : (equipo.total_integrantes / equipo.integrantes_min) * 100;
        
        const colorBarra = porcentajeLlenado >= 90 ? '#dc3545' : porcentajeLlenado >= 70 ? '#ffc107' : '#28a745';
        
        const maxTexto = equipo.integrantes_max > 0 ? equipo.integrantes_max : 'Sin límite';
        const estadoCupo = equipo.tiene_cupo 
            ? '<span style="color: #28a745; font-weight: 600;">✓ Cupo disponible</span>' 
            : '<span style="color: #dc3545; font-weight: 600;">✕ Equipo lleno</span>';

        html += `
            <div class="equipo-card" style="border: 2px solid #e0e0e0; border-radius: 12px; padding: 20px; background: white; transition: all 0.3s; cursor: ${equipo.tiene_cupo ? 'pointer' : 'not-allowed'}; opacity: ${equipo.tiene_cupo ? '1' : '0.6'};" 
                 data-equipo-id="${equipo.id}" 
                 data-tiene-cupo="${equipo.tiene_cupo}">
                
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                    <div style="flex: 1; min-width: 200px;">
                        <h3 style="margin: 0 0 5px 0; color: #003366; font-size: 20px; font-weight: 700;">
                            ${equipo.nombre_equipo}
                        </h3>
                        <p style="margin: 0; color: #666; font-size: 14px;">
                            Registrado el ${new Date(equipo.fecha_registro).toLocaleDateString('es-MX', { 
                                day: '2-digit', 
                                month: 'long', 
                                year: 'numeric' 
                            })}
                        </p>
                    </div>
                    <div style="text-align: right;">
                        ${estadoCupo}
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 14px; font-weight: 600; color: #666;">Integrantes</span>
                        <span style="font-size: 14px; font-weight: 700; color: #003366;">
                            ${equipo.total_integrantes} / ${maxTexto}
                        </span>
                    </div>
                    <div style="width: 100%; height: 8px; background: #e0e0e0; border-radius: 10px; overflow: hidden;">
                        <div style="width: ${Math.min(porcentajeLlenado, 100)}%; height: 100%; background: ${colorBarra}; transition: width 0.3s;"></div>
                    </div>
                    ${equipo.total_integrantes < equipo.integrantes_min ? `
                        <p style="margin: 5px 0 0 0; font-size: 12px; color: #ffc107;">
                            ⚠ Mínimo requerido: ${equipo.integrantes_min} integrantes
                        </p>
                    ` : ''}
                </div>

                ${equipo.integrantes_preview ? `
                    <div style="margin-bottom: 15px; padding: 12px; background: #f8f9fa; border-radius: 8px;">
                        <p style="margin: 0 0 5px 0; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase;">Integrantes actuales:</p>
                        <p style="margin: 0; font-size: 14px; color: #333; line-height: 1.4;">
                            ${equipo.integrantes_preview.substring(0, 100)}${equipo.integrantes_preview.length > 100 ? '...' : ''}
                        </p>
                    </div>
                ` : ''}

                ${equipo.tiene_cupo ? `
                    <button class="btn-seleccionar-equipo" data-equipo-id="${equipo.id}" data-nombre-equipo="${equipo.nombre_equipo}"
                            style="width: 100%; padding: 12px; background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 15px; transition: all 0.3s; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Unirme a este equipo
                    </button>
                ` : `
                    <button disabled 
                            style="width: 100%; padding: 12px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: not-allowed; font-weight: 600; font-size: 15px; opacity: 0.6;">
                        Equipo completo
                    </button>
                `}
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Agregar efectos hover y click a las tarjetas
    container.querySelectorAll('.equipo-card').forEach(card => {
        const tieneCupo = card.getAttribute('data-tiene-cupo') === 'true';
        
        if (tieneCupo) {
            card.addEventListener('mouseenter', () => {
                card.style.borderColor = '#007bff';
                card.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.2)';
                card.style.transform = 'translateY(-2px)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.borderColor = '#e0e0e0';
                card.style.boxShadow = 'none';
                card.style.transform = 'translateY(0)';
            });
        }
    });

    // Agregar listeners a los botones de selección
    container.querySelectorAll('.btn-seleccionar-equipo').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const equipoId = btn.getAttribute('data-equipo-id');
            const nombreEquipo = btn.getAttribute('data-nombre-equipo');
            mostrarFormularioUnirseIntegrante(equipoId, nombreEquipo, eventoId, nombreEvento);
        });
    });
}

/**
 * Muestra el formulario para que un participante se una a un equipo específico
 */
function mostrarFormularioUnirseIntegrante(equipoId, nombreEquipo, eventoId, nombreEvento) {
    // Cerrar el modal de lista de equipos
    document.getElementById('modal-unirse-equipo')?.remove();

    // Crear el modal del formulario
    const modal = document.createElement('div');
    modal.id = 'modal-unirse-integrante';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.75); display: flex; justify-content: center;
        align-items: center; z-index: 10000; overflow-y: auto; padding: 20px;
        animation: fadeIn 0.3s ease;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 40px; border-radius: 16px; max-width: 800px; width: 100%; margin: 20px auto; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4); animation: slideUp 0.3s ease; max-height: 90vh; overflow-y: auto; position: relative;">
            
            <button type="button" class="btnCerrarXUnirseIntegrante" style="position: absolute; top: 15px; right: 15px; background: transparent; border: none; cursor: pointer; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s; color: #666;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>

            <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); width: 70px; height: 70px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="8.5" cy="7" r="4"/>
                        <line x1="20" y1="8" x2="20" y2="14"/>
                        <line x1="23" y1="11" x2="17" y2="11"/>
                    </svg>
                </div>
                <h2 style="color: #003366; margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">Unirse al Equipo</h2>
                <p style="color: #666; margin: 0 0 15px 0; font-size: 15px;">Completa tus datos para unirte</p>
                <h3 style="color: #00843D; margin: 0 0 12px 0; font-size: 20px; font-weight: 700;">${nombreEvento}</h3>
                <div style="padding: 15px; background: linear-gradient(135deg, #e3f2fd 0%, #f1f8ff 100%); border-radius: 10px; border-left: 4px solid #007bff;">
                    <p style="margin: 0; color: #007bff; font-weight: 700; font-size: 18px;">${nombreEquipo}</p>
                </div>
            </div>
            
            <form id="formUnirseIntegrante">
                <input type="hidden" name="equipo_id" value="${equipoId}">
                <input type="hidden" name="evento_id" value="${eventoId}">
                
                <div style="background: linear-gradient(135deg, #e8f5e9 0%, #f1f8f4 100%); padding: 20px; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid #00843D;">
                    <label style="display: block; margin-bottom: 15px; font-weight: 700; color: #003366; font-size: 16px;">
                        Tipo de Participante <span style="color: #dc3545;">*</span>
                    </label>
                    <div style="display: grid; gap: 12px;">
                        <label class="radio-option" style="display: flex; align-items: center; cursor: pointer; padding: 12px; background: white; border-radius: 8px; border: 2px solid #e0e0e0; transition: all 0.2s;">
                            <input type="radio" name="tipo_participante" value="Estudiante" checked style="margin-right: 12px; width: 20px; height: 20px; cursor: pointer; accent-color: #00843D;">
                            <span style="font-size: 15px; font-weight: 500;">Estudiante</span>
                        </label>

                        <label class="radio-option" style="display: flex; align-items: center; cursor: pointer; padding: 12px; background: white; border-radius: 8px; border: 2px solid #e0e0e0; transition: all 0.2s;">
                            <input type="radio" name="tipo_participante" value="Docente" style="margin-right: 12px; width: 20px; height: 20px; cursor: pointer; accent-color: #00843D;">
                            <span style="font-size: 15px; font-weight: 500;">Docente</span>
                        </label>

                        <label class="radio-option" style="display: flex; align-items: center; cursor: pointer; padding: 12px; background: white; border-radius: 8px; border: 2px solid #e0e0e0; transition: all 0.2s;">
                            <input type="radio" name="tipo_participante" value="Personal Académico" style="margin-right: 12px; width: 20px; height: 20px; cursor: pointer; accent-color: #00843D;">
                            <span style="font-size: 15px; font-weight: 500;">Personal Académico</span>
                        </label>

                        <label class="radio-option" style="display: flex; align-items: center; cursor: pointer; padding: 12px; background: white; border-radius: 8px; border: 2px solid #e0e0e0; transition: all 0.2s;">
                            <input type="radio" name="tipo_participante" value="Personal de Servicio" style="margin-right: 12px; width: 20px; height: 20px; cursor: pointer; accent-color: #00843D;">
                            <span style="font-size: 15px; font-weight: 500;">Personal de Servicio</span>
                        </label>

                        <label class="radio-option" style="display: flex; align-items: center; cursor: pointer; padding: 12px; background: white; border-radius: 8px; border: 2px solid #e0e0e0; transition: all 0.2s;">
                            <input type="radio" name="tipo_participante" value="Externo" style="margin-right: 12px; width: 20px; height: 20px; cursor: pointer; accent-color: #00843D;">
                            <span style="font-size: 15px; font-weight: 500;">Externo</span>
                        </label>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 14px;">Apellido Paterno <span style="color: #dc3545;">*</span></label>
                        <input type="text" name="apellido_paterno" required class="form-input" style="width: 100%; padding: 12px 14px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 15px; box-sizing: border-box; transition: border-color 0.2s; outline: none;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 14px;">Apellido Materno <span style="color: #dc3545;">*</span></label>
                        <input type="text" name="apellido_materno" required class="form-input" style="width: 100%; padding: 12px 14px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 15px; box-sizing: border-box; transition: border-color 0.2s; outline: none;">
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 14px;">Nombre(s) <span style="color: #dc3545;">*</span></label>
                    <input type="text" name="nombres" required class="form-input" style="width: 100%; padding: 12px 14px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 15px; box-sizing: border-box; transition: border-color 0.2s; outline: none;">
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div id="matricula-container">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 14px;">
                            <span id="label-matricula">Matrícula</span> <span style="color: #dc3545;" id="required-matricula">*</span>
                        </label>
                        <input type="text" name="matricula" id="input-matricula" placeholder="12345678" required class="form-input" pattern="[0-9]{6,10}" style="width: 100%; padding: 12px 14px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 15px; box-sizing: border-box; transition: border-color 0.2s; outline: none;">
                        <small style="display: block; margin-top: 6px; font-size: 12px; color: #666; font-style: italic;">Solo números (6-10 dígitos)</small>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 14px;">Género <span style="color: #dc3545;">*</span></label>
                        <select name="genero" required class="form-input" style="width: 100%; padding: 12px 14px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 15px; background: white; cursor: pointer; box-sizing: border-box; transition: border-color 0.2s; outline: none;">
                            <option value="">Selecciona</option>
                            <option value="Hombre">Hombre</option>
                            <option value="Mujer">Mujer</option>
                            <option value="Prefiero no decirlo">Prefiero no decirlo</option>
                        </select>
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 14px;">Correo Electrónico UABC <span style="color: #dc3545;">*</span></label>
                    <input type="email" name="correo" id="input-correo" required pattern="[a-zA-Z0-9._+\\-]+@uabc\\.(edu\\.)?mx" class="form-input" style="width: 100%; padding: 12px 14px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 15px; box-sizing: border-box; transition: border-color 0.2s; outline: none;">
                    <small id="correo-hint" style="display: block; margin-top: 6px; font-size: 12px; color: #666; font-style: italic;">Debe ser correo institucional (@uabc.edu.mx o @uabc.mx)</small>
                </div>

                <div style="margin-bottom: 20px;" id="campus-container">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 14px;">
                        <span id="label-campus">Unidad Académica</span> <span style="color: #dc3545;" id="required-campus">*</span>
                    </label>
                    <select name="campus" id="select-campus" required class="form-input" style="width: 100%; padding: 12px 14px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 15px; background: white; cursor: pointer; box-sizing: border-box; transition: border-color 0.2s; outline: none;">
                        <option value="">Cargando Unidades Académicas...</option>
                    </select>
                </div>

                <div style="margin-bottom: 20px;" id="facultad-container">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 14px;">
                        <span id="label-facultad">Facultad</span> <span style="color: #dc3545;" id="required-facultad">*</span>
                    </label>
                    <select name="facultad" id="select-facultad" required class="form-input" style="width: 100%; padding: 12px 14px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 15px; background: white; cursor: pointer; box-sizing: border-box; transition: border-color 0.2s; outline: none;">
                        <option value="">Selecciona primero una Unidad Academica</option>
                    </select>
                </div>

                <div style="margin-bottom: 25px;" id="carrera-container">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 14px;">
                        <span id="label-carrera">Carrera</span> <span style="color: #dc3545;" id="required-carrera">*</span>
                    </label>
                    <select name="carrera" id="select-carrera" required class="form-input" style="width: 100%; padding: 12px 14px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 15px; background: white; cursor: pointer; box-sizing: border-box; transition: border-color 0.2s; outline: none;">
                        <option value="">Selecciona primero una facultad</option>
                    </select>
                    <small style="display: block; margin-top: 6px; font-size: 12px; color: #666; font-style: italic;">Si eres de primer semestre, selecciona "Tronco Común" seguido de tu área</small>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 30px;">
                    <button type="button" id="btnVolverListaEquipos" style="padding: 15px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 16px;">
                        ← Volver
                    </button>
                    <button type="submit" id="btnSubmitUnirse" style="padding: 15px; background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);">
                        Unirme al Equipo
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);

    // Función para validar campo en tiempo real
    function validarCampo(input, forzarValidacion = false) {
        const tipo = document.querySelector('input[name="tipo_participante"]:checked').value;
        let esValido = true;

        // Si el campo está vacío y es requerido
        if (input.value.trim() === '' && input.required) {
            input.style.borderColor = '#dc3545';
            input.style.backgroundColor = 'white';
            return;
        }

        // Si el campo no está vacío, validar según el tipo
        if (input.value.trim() !== '') {
            // Validaciones específicas
            if (input.name === 'matricula') {
                const pattern = /^[0-9]{6,10}$/;
                esValido = pattern.test(input.value);
            }

            if (input.name === 'correo') {
                // Solo validar para estudiantes y docentes
                if (tipo === 'Estudiante' || tipo === 'Docente') {
                    const pattern = /^[a-zA-Z0-9._+\-]+@uabc\.(edu\.)?mx$/;
                    esValido = pattern.test(input.value);
                } else {
                    // Para externos, validar que sea un email válido
                    const pattern = /^[a-zA-Z0-9._+\-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                    esValido = pattern.test(input.value);
                }
            }

            // Aplicar estilos según validación
            if (esValido) {
                input.style.borderColor = '#28a745';
                input.style.backgroundColor = 'white';
            } else {
                input.style.borderColor = '#dc3545';
                input.style.backgroundColor = 'white';
            }
        } else if (!input.required) {
            // Si no es requerido y está vacío, estilo normal
            input.style.borderColor = '#e0e0e0';
            input.style.backgroundColor = 'white';
        }
    }

    // Agregar validación en tiempo real a todos los inputs
    const inputs = modal.querySelectorAll('input[type="text"], input[type="email"], select');
    
    // Marcar todos los campos requeridos como inválidos al inicio
    inputs.forEach(input => {
        if (input.required && input.value.trim() === '') {
            input.style.borderColor = '#dc3545';
            input.style.backgroundColor = 'white';
        }
        
        input.addEventListener('input', () => {
            validarCampo(input);
        });
        
        input.addEventListener('blur', () => {
            validarCampo(input);
        });
    });

    // Cargar facultades y carreras
    const selectCampus = document.getElementById('select-campus');
    const selectFacultad = document.getElementById('select-facultad');
    const selectCarrera = document.getElementById('select-carrera');
    
    // Le pasamos el select y la ruta relativa al PHP desde 'public/'
    cargarCampus(selectCampus, '../php/public/');
    const campusSeleccionado = selectCampus?.value;
    if (campusSeleccionado) {
        cargarFacultades(selectFacultad, campusSeleccionado, '../php/public/');
    }

    selectCampus.addEventListener('change', (e) => {
        const campusId = e.target.value;
        cargarFacultades(selectFacultad, campusId, '../php/public/');
    });
    
    selectFacultad.addEventListener('change', (e) => {
        const facultadId = e.target.value;
        cargarCarreras(facultadId, selectCarrera, '../php/public/');
        validarCampo(e.target);
    });

    selectCarrera.addEventListener('change', (e) => {
        validarCampo(e.target);
    });

    // Manejar cambio de tipo de participante
    document.querySelectorAll('input[name="tipo_participante"]').forEach(radio => {
        // Marcar el seleccionado inicialmente
        const label = radio.closest('.radio-option');
        if (radio.checked) {
            label.style.borderColor = '#28a745';
            label.style.backgroundColor = 'white';
        }
        
        radio.addEventListener('change', function() {
            const tipo = this.value;
            
            // Actualizar estilos de todos los radio buttons
            document.querySelectorAll('.radio-option').forEach(opt => {
                opt.style.borderColor = '#e0e0e0';
                opt.style.backgroundColor = 'white';
            });
            
            // Marcar el seleccionado en verde
            label.style.borderColor = '#28a745';
            label.style.backgroundColor = 'white';
            
            actualizarCamposSegunTipo(tipo, document);
            
            // Actualizar hint del correo según tipo
            const correoHint = document.getElementById('correo-hint');
            const inputCorreo = document.getElementById('input-correo');
            
            if (tipo === 'Externo') {
                correoHint.style.display = 'none';
                inputCorreo.removeAttribute('pattern');
                inputCorreo.placeholder = 'ejemplo@correo.com';
            } else {
                correoHint.style.display = 'block';
                inputCorreo.setAttribute('pattern', '[a-zA-Z0-9._+\\-]+@uabc\\.(edu\\.)?mx');
                inputCorreo.placeholder = 'ejemplo@uabc.edu.mx';
            }
            
            // Re-validar campos
            inputs.forEach(input => {
                validarCampo(input);
            });
        });
    });

    // Botón volver
    document.getElementById('btnVolverListaEquipos').addEventListener('click', () => {
        modal.remove();
        mostrarFormularioUnirseEquipo(eventoId, nombreEvento);
    });

    // Cerrar modal
    modal.querySelector('.btnCerrarXUnirseIntegrante').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    // Enviar formulario
    document.getElementById('formUnirseIntegrante').addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Validar todos los campos antes de enviar
        let todosValidos = true;
        inputs.forEach(input => {
            validarCampo(input);
            if (input.required && input.value.trim() === '') {
                todosValidos = false;
                input.style.borderColor = '#dc3545';
                input.style.backgroundColor = 'white';
            }
        });
        
        if (todosValidos) {
            enviarUnirseEquipo(e.target, modal);
        } else {
            mostrarToast('Por favor completa todos los campos requeridos correctamente', 'error');
        }
    });
}

/**
 * Envía los datos para unir un participante a un equipo existente
 */
function enviarUnirseEquipo(form, modal) {
    const formData = new FormData(form);
    const btnEnviar = document.getElementById('btnSubmitUnirse');
    
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
    
    fetch('../php/public/unirseEquipo.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            mostrarModalExito(data.mensaje || '¡Te has unido al equipo exitosamente!', modal);
        } else {
            mostrarToast(data.mensaje || 'Error al unirse al equipo', 'error');
            btnEnviar.disabled = false;
            btnEnviar.innerHTML = 'Unirme al Equipo';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        mostrarToast('Error de conexión. Intenta de nuevo.', 'error');
        btnEnviar.disabled = false;
        btnEnviar.innerHTML = 'Unirme al Equipo';
    });
}
// ==========================================
// EXPONER FUNCIONES AL ÁMBITO GLOBAL
// ==========================================
// Esto permite que Eventos.js pueda invocar esta función aunque esto sea un módulo
window.agregarBotonesInscripcion = agregarBotonesInscripcion;
window.mostrarFormularioEquipo = mostrarFormularioEquipo;