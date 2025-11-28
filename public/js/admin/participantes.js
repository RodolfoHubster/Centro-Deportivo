// public/js/admin/participantes.js

// 1. IMPORTS
import { mostrarMensaje, mostrarModalExito } from '../utils/utilidades.js';
// Importamos las funciones para la lógica de los formularios (cargar facultades, etc.)
import { actualizarCamposSegunTipo, cargarFacultades, cargarCarreras } from '../utils/formLogica.js';

// 2. VARIABLES GLOBALES
let eventoIdActual = null;
let usuarioIdEditando = null;
let eventoActualData = null;

// 3. FUNCIÓN PARA INYECTAR ESTILOS DE VALIDACIÓN (Se ejecuta solo una vez)
function injectValidationStyles() {
    if (document.getElementById('modal-validation-styles')) return;

    const style = document.createElement('style');
    style.id = 'modal-validation-styles';
    style.textContent = `
        /* Estilos base de foco */
        .form-input:focus {
            outline: none;
            border-color: #00843D !important;
            box-shadow: 0 0 0 3px rgba(0, 132, 61, 0.1) !important;
        }
        
        /* Rojo para campos requeridos vacíos o inválidos (simulando la imagen) */
        /* Esto fuerza el rojo inicial para los campos que tienen required */
        .form-input:required:invalid,
        select.form-input:required:invalid {
            border-color: #dc3545 !important;
            box-shadow: 0 0 0 1px #dc3545 !important;
        }

        /* Verde para campos válidos después de la primera entrada (al escribir/seleccionar) */
        .form-input:valid:not([value=""]),
        .form-input:not(:placeholder-shown):valid {
            border-color: #28a745 !important;
            box-shadow: 0 0 0 1px #28a745 !important;
        }
        
        /* Estilos para Radio Buttons (Green Selection) */
        .radio-option input[type="radio"]:checked + span {
            color: #00843D;
            font-weight: 600;
        }
        /* Borde verde al seleccionar el tipo de participante */
        .radio-option:has(input[type="radio"]:checked) {
            border-color: #00843D !important;
            background: #f1f8f4 !important;
        }
    `;
    document.head.appendChild(style);
}


// 4. INICIALIZACIÓN DE PÁGINA
document.addEventListener("DOMContentLoaded", () => {
    // 1. ASEGURAR QUE EXISTE EL CONTENEDOR DE MODALES GENÉRICOS
    if (!document.getElementById('generic-modal-container')) {
        const container = document.createElement('div');
        container.id = 'generic-modal-container';
        document.body.appendChild(container);
    }

    const urlParams = new URLSearchParams(window.location.search);
    eventoIdActual = urlParams.get('evento_id');
    
    if (eventoIdActual) {
        // Ejecutar primero la carga del evento y luego los participantes
        cargarEventoData(eventoIdActual)
            .then(() => {
                // Configurar listener del botón SOLO después de cargar la data
                const btnAdd = document.getElementById('btnAnadirParticipante');
                if (btnAdd) {
                     btnAdd.style.display = 'block'; // Mostrar el botón
                     btnAdd.addEventListener('click', handleAnadirParticipanteClick);
                }
                return cargarParticipantes(eventoIdActual);
            })
            .catch(error => {
                mostrarMensaje('Error al obtener datos del evento. Redirigiendo...', 'error');
                setTimeout(() => { window.location.href = 'gestionar-eventos.html'; }, 1500);
            });
    } else {
        alert("No se especificó un evento.");
        window.location.href = 'gestionar-eventos.html'; 
    }

    // 2. Cerrar modales al hacer clic fuera
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('modalEditarParticipante');
        if (e.target === modal) {
            window.cerrarModal();
        }
        
        // Cierra los modales genéricos (añadir/equipo)
        const genericModal = document.querySelector('#generic-modal-container > div');
        if (genericModal && e.target.id === 'generic-modal-container') {
            document.getElementById('generic-modal-container').innerHTML = '';
        }
    });
});

// 5. FUNCIÓN PARA OBTENER DATOS DEL EVENTO
async function cargarEventoData(eventoId) {
    try {
        // Incluye inactivos para asegurar que se puede gestionar un evento finalizado
        const url = `../../php/public/obtenerEventos.php?incluir_inactivos=true`;
        const response = await fetch(url);
        if(!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        
        const data = await response.json();
        const evento = data.eventos.find(e => e.id == eventoId);

        if (evento) {
            eventoActualData = evento;
            return evento;
        } else {
            throw new Error('Evento no encontrado o ID inválido.');
        }
    } catch (error) {
        throw error;
    }
}

// 6. HANDLER DEL BOTÓN AÑADIR PARTICIPANTE
function handleAnadirParticipanteClick() {
    if (!eventoActualData) {
        mostrarMensaje('Error: Información del evento no cargada.', 'error');
        return;
    }
    
    const { tipo_registro, nombre: nombreEvento } = eventoActualData;

    if (tipo_registro === 'Por equipos') {
        mostrarModalListaEquipos(eventoIdActual, nombreEvento);
    } else {
        mostrarModalAnadirIndividual(eventoIdActual, nombreEvento);
    }
}


// ========================================================================================
// 7. MODAL DE INSCRIPCIÓN INDIVIDUAL (ADAPTADO DEL FRONT-END)
// ========================================================================================
function mostrarModalAnadirIndividual(eventoId, nombreEvento) {
    const modalContainer = document.getElementById('generic-modal-container');
    if (!modalContainer) return;
    
    modalContainer.innerHTML = '';
    
    const modal = document.createElement('div');
    modal.id = 'modal-inscripcion';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.75); display: flex; justify-content: center;
        align-items: center; z-index: 10000; overflow-y: auto; padding: 20px;
        animation: fadeIn 0.3s ease;
    `;
    
    // Llamada para asegurar que los estilos de validación se inyecten
    injectValidationStyles();
    
    // HTML del modal (similar a Inscripcion.js para consistencia)
    modal.innerHTML = `
        <div id="overlayModal" style="background: white; padding: 40px; border-radius: 16px; max-width: 800px; width: 100%; margin: 20px auto; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4); max-height: 90vh; overflow-y: auto; position: relative;">
            
            <button type="button" id="btnCerrarX" style="position: absolute; top: 15px; right: 15px; background: transparent; border: none; cursor: pointer; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s; color: #666; font-size: 28px;">
                &times;
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
                <h2 style="color: #003366; margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">Añadir Participante</h2>
                <p style="color: #666; margin: 0; font-size: 15px;">Completa todos los campos para registrar al participante</p>
                <h3 style="color: #00843D; margin: 15px 0 0 0; font-size: 22px; font-weight: 600;">${nombreEvento}</h3>
            </div>
            
            <form id="formInscripcionAdmin">
                
                <div style="background: linear-gradient(135deg, #e8f5e9 0%, #f1f8f4 100%); padding: 20px; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid #00843D;">
                    <label style="display: block; margin-bottom: 15px; font-weight: 700; color: #003366; font-size: 16px;">
                        Tipo de Participante <span style="color: #dc3545;">*</span>
                    </label>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
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
                        Añadir Participante
                    </button>
                </div>
            </form>

        </div>
    `;
    
    modalContainer.appendChild(modal);

    // Configurar lógica del formulario
    const form = document.getElementById('formInscripcionAdmin');
    // FIX: Usar form.querySelector para asegurar el scope.
    const selectFacultad = form.querySelector('#select-facultad');
    const selectCarrera = form.querySelector('#select-carrera');
    
    // Le pasamos el select y la ruta relativa al PHP desde 'public/admin/ver-participantes.html'
    if (selectFacultad) {
        cargarFacultades(selectFacultad, '../../php/public/');
    }

    document.querySelectorAll('input[name="tipo_participante"]').forEach(radio => {
        if (form) { 
             radio.addEventListener('change', function() {
                actualizarCamposSegunTipo(this.value, form);
            });
        }
    });
    
    // Cargar carreras cuando cambie la facultad (FIX aplicado)
    if (selectFacultad && selectCarrera) {
        selectFacultad.addEventListener('change', (e) => {
            const facultadId = e.target.value;
            cargarCarreras(facultadId, selectCarrera, '../../php/public/');
        });
    } else {
        console.error("Error: No se encontró el elemento selectFacultad o selectCarrera en el modal individual.");
    }
    
    // Ajuste inicial de campos
    if (form) actualizarCamposSegunTipo('Estudiante', form);
    
    // Cerrar modal
    modal.querySelector('#btnCerrarX').addEventListener('click', () => modal.remove());
    modal.querySelector('#btnCerrarModal').addEventListener('click', () => modal.remove());
    
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            enviarInscripcion(form, modal); 
        });
    }
}


// 7. MODAL DE LISTA DE EQUIPOS (ADAPTADO DEL FRONT-END)
function mostrarModalListaEquipos(eventoId, nombreEvento) {
    const modalContainer = document.getElementById('generic-modal-container');
    if (!modalContainer) return;
    
    modalContainer.innerHTML = '';
    
    const modal = document.createElement('div');
    modal.id = 'modal-unirse-equipo';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.75); display: flex; justify-content: center;
        align-items: flex-start; z-index: 10000; overflow-y: auto; 
        padding: 20px 10px;
    `;
    
    modal.innerHTML = `
        <div class="modal-contenido-responsive" style="background: white; border-radius: 16px; margin: 20px auto; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4); position: relative; max-width: 900px; width: 100%; padding: 40px;">
            
            <button type="button" class="btnCerrarXUnirse" style="position: absolute; top: 15px; right: 15px; background: transparent; border: none; cursor: pointer; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s; color: #666; z-index: 1; font-size: 28px;">
                ×
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
                <h2 style="color: #003366; margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">Unir Participante a Equipo</h2>
                <p style="color: #666; margin: 0; font-size: 15px;">Selecciona un equipo existente para añadir al participante</p>
                <h3 style="color: #007bff; margin: 15px 0 0 0; font-size: 22px; font-weight: 600;">${nombreEvento}</h3>
            </div>

            <div id="loading-equipos" style="text-align: center; padding: 40px;">
                Cargando equipos disponibles...
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
    
    modalContainer.appendChild(modal);

    // Cargar equipos (reutiliza el endpoint público)
    fetch(`../../php/public/obtenerEquipo.php?evento_id=${eventoId}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('loading-equipos').style.display = 'none';
            const listaContainer = document.getElementById('lista-equipos');
            listaContainer.style.display = 'block';

            if (data.success && data.equipos && data.equipos.length > 0) {
                mostrarListaEquiposAdmin(data.equipos, listaContainer, eventoId, nombreEvento);
            } else {
                listaContainer.innerHTML = `<p style="text-align: center; color: #666; padding: 20px;">No hay equipos registrados para este evento aún.</p>`;
            }
        })
        .catch(error => {
            document.getElementById('loading-equipos').style.display = 'none';
            document.getElementById('lista-equipos').innerHTML = `<p style="text-align: center; color: red;">Error al cargar equipos.</p>`;
        });

    // Cerrar modal
    modal.querySelector('.btnCerrarXUnirse').addEventListener('click', () => modal.remove());
    document.getElementById('btnCerrarUnirse').addEventListener('click', () => modal.remove());
}


// 8. RENDERIZADO DE LISTA DE EQUIPOS (ADAPTADO DEL FRONT-END)
function mostrarListaEquiposAdmin(equipos, container, eventoId, nombreEvento) {
    let html = '<div style="display: grid; gap: 20px;">';

    equipos.forEach(equipo => {
        const porcentajeLlenado = equipo.integrantes_max > 0 
            ? (equipo.total_integrantes / equipo.integrantes_max) * 100 
            : 0; // Sin porcentaje si no hay máximo
        
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
                        <p style="margin: 0; color: #666; font-size: 14px;">Total miembros: ${equipo.total_integrantes}</p>
                    </div>
                    <div style="text-align: right;">
                        ${estadoCupo}
                        <p style="margin: 5px 0 0 0; font-size: 14px; color: #999;">Mín: ${equipo.integrantes_min} / Max: ${maxTexto}</p>
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 14px; font-weight: 600; color: #666;">Ocupación</span>
                        <span style="font-size: 14px; font-weight: 700; color: #003366;">
                            ${equipo.total_integrantes} / ${maxTexto}
                        </span>
                    </div>
                    <div style="width: 100%; height: 8px; background: #e0e0e0; border-radius: 10px; overflow: hidden;">
                        <div style="width: ${Math.min(porcentajeLlenado, 100)}%; height: 100%; background: ${colorBarra}; transition: width 0.3s;"></div>
                    </div>
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
                        Añadir Participante
                    </button>
                ` : `
                    <button disabled style="width: 100%; padding: 12px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: not-allowed; font-weight: 600; font-size: 15px; opacity: 0.6;">
                        Equipo completo
                    </button>
                `}
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Agregar listeners a los botones de selección
    container.querySelectorAll('.btn-seleccionar-equipo').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const equipoId = btn.getAttribute('data-equipo-id');
            const nombreEquipo = btn.getAttribute('data-nombre-equipo');
            mostrarModalAnadirIntegranteAEquipo(equipoId, nombreEquipo, eventoId, nombreEvento);
        });
    });
}


// 9. MODAL PARA AÑADIR INTEGRANTE A EQUIPO ESPECÍFICO (ADAPTADO DEL FRONT-END)
function mostrarModalAnadirIntegranteAEquipo(equipoId, nombreEquipo, eventoId, nombreEvento) {
    document.getElementById('modal-unirse-equipo')?.remove();
    const modalContainer = document.getElementById('generic-modal-container');
    if (!modalContainer) return;

    const modal = document.createElement('div');
    modal.id = 'modal-unirse-integrante';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.75); display: flex; justify-content: center;
        align-items: center; z-index: 10000; overflow-y: auto; padding: 20px;
    `;
    
    // Llamada para asegurar que los estilos de validación se inyecten
    injectValidationStyles();
    
    modal.innerHTML = `
        <div style="background: white; padding: 40px; border-radius: 16px; max-width: 800px; width: 100%; margin: 20px auto; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4); max-height: 90vh; overflow-y: auto; position: relative;">
            
            <button type="button" class="btnCerrarXUnirseIntegrante" style="position: absolute; top: 15px; right: 15px; background: transparent; border: none; cursor: pointer; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s; color: #666; font-size: 28px;">
                ×
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
                <h2 style="color: #003366; margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">Añadir Integrante a Equipo</h2>
                <h3 style="color: #00843D; margin: 0 0 12px 0; font-size: 20px; font-weight: 700;">${nombreEvento}</h3>
                <div style="padding: 15px; background: linear-gradient(135deg, #e3f2fd 0%, #f1f8ff 100%); border-radius: 10px; border-left: 4px solid #007bff;">
                    <p style="margin: 0; color: #007bff; font-weight: 700; font-size: 18px;">${nombreEquipo}</p>
                </div>
            </div>
            
            <form id="formAnadirIntegrante">
                <input type="hidden" name="equipo_id" value="${equipoId}">
                <input type="hidden" name="evento_id" value="${eventoId}">
                
                <div style="background: linear-gradient(135deg, #e8f5e9 0%, #f1f8f4 100%); padding: 20px; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid #00843D;">
                    <label style="display: block; margin-bottom: 15px; font-weight: 700; color: #003366; font-size: 16px;">
                        Tipo de Participante <span style="color: #dc3545;">*</span>
                    </label>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
                        <label class="radio-option" style="display: flex; align-items: center; cursor: pointer; padding: 12px; background: white; border-radius: 8px; border: 2px solid #e0e0e0; transition: all 0.2s;">
                            <input type="radio" name="tipo_participante" value="Estudiante" checked style="margin-right: 12px; width: 20px; height: 20px; cursor: pointer; accent-color: #00843D;">
                            <span style="font-size: 15px; font-weight: 500;">Estudiante</span>
                        </label>
                        <label class="radio-option" style="display: flex; align-items: center; cursor: pointer; padding: 12px; background: white; border-radius: 8px; border: 2px solid #e0e0e0; transition: all 0.2s;">
                            <input type="radio" name="tipo_participante" value="Docente" style="margin-right: 12px; width: 20px; height: 20px; cursor: pointer; accent-color: #00843D;">
                            <span style="font-size: 15px; font-weight: 500;">Docente / Personal Académico</span>
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
                    <small id="correo-hint" style="display: block; margin-top: 6px; font-size: 12px; color: #666; font-style: italic;">Debe ser correo institucional (@uabc.edu.mx o @uabc.edu.mx)</small>
                </div>

                <div style="margin-bottom: 20px;" id="facultad-container">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 14px;">
                        <span id="label-facultad">Unidad Académica</span> <span style="color: #dc3545;" id="required-facultad">*</span>
                    </label>
                    <select name="facultad" id="select-facultad" required class="form-input" style="width: 100%; padding: 12px 14px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 15px; background: white; cursor: pointer; box-sizing: border-box; transition: border-color 0.2s; outline: none;">
                        <option value="">Cargando facultades...</option>
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
                    <button type="button" id="btnVolverListaEquipos" 
                            style="padding: 15px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 16px; transition: all 0.3s;">
                        ← Volver a Equipos
                    </button>
                    <button type="submit" id="btnSubmitAnadirIntegrante" 
                            style="padding: 15px; background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);">
                        Agregar al Equipo
                    </button>
                </div>
            </form>
            
        </div>
    `;
    
    modalContainer.appendChild(modal);

    // Configurar lógica del formulario
    const form = document.getElementById('formAnadirIntegrante');
    // FIX: Usar form.querySelector para asegurar el scope.
    const selectFacultad = form.querySelector('#select-facultad');
    const selectCarrera = form.querySelector('#select-carrera');
    
    // Adjuntar listeners de forma robusta
    if (form) {
        if (selectFacultad) { // CHECK DE SEGURIDAD
             cargarFacultades(selectFacultad, '../../php/public/');
        }

        document.querySelectorAll('input[name="tipo_participante"]').forEach(radio => {
            radio.addEventListener('change', function() {
                actualizarCamposSegunTipo(this.value, form);
            });
        });
        
        // FIX del error: envuelto en un chequeo
        if (selectFacultad && selectCarrera) { // CHECK DE SEGURIDAD
            selectFacultad.addEventListener('change', (e) => {
                cargarCarreras(e.target.value, selectCarrera, '../../php/public/');
            });
        }
        
        // Ajuste inicial de campos
        actualizarCamposSegunTipo('Estudiante', form);
        
        // Listeners de botones
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            enviarUnirseEquipo(form, modal);
        });
        
        const btnVolver = document.getElementById('btnVolverListaEquipos');
        if (btnVolver) {
            btnVolver.addEventListener('click', () => {
                modal.remove();
                mostrarModalListaEquipos(eventoId, nombreEvento);
            });
        }
    }

    modal.querySelector('.btnCerrarXUnirseIntegrante').addEventListener('click', () => modal.remove());
}


// 10. FUNCIÓN PARA ENVIAR INSCRIPCIÓN INDIVIDUAL (Limpio)
function enviarInscripcion(form, modal) {
    const formData = new FormData(form);
    const btnEnviar = form.querySelector('button[type="submit"]');
    
    const endpoint = '../../php/public/inscribirEvento.php'; 
    
    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Enviando...';
    
    fetch(endpoint, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            modal.remove();
            mostrarModalExito(data.mensaje, () => {
                cargarParticipantes(eventoIdActual); 
            });
        } else {
            mostrarMensaje(data.mensaje, 'error');
            btnEnviar.disabled = false;
            btnEnviar.textContent = 'Registrar';
        }
    })
    .catch(error => {
        mostrarMensaje('Error de conexión al procesar la inscripción.', 'error');
        btnEnviar.disabled = false;
        btnEnviar.textContent = 'Registrar';
    });
}


// 11. FUNCIÓN PARA ENVIAR UNIÓN A EQUIPO (Limpio)
function enviarUnirseEquipo(form, modal) {
    const formData = new FormData(form);
    const btnEnviar = modal.querySelector('#btnSubmitUnirse') || modal.querySelector('#btnSubmitAnadirIntegrante');

    const endpoint = '../../php/public/unirseEquipo.php'; 
    
    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Enviando...';
    
    fetch(endpoint, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            modal.remove();
            mostrarModalExito(data.mensaje, () => {
                cargarParticipantes(eventoIdActual); 
            });
        } else {
            mostrarMensaje(data.mensaje, 'error');
            btnEnviar.disabled = false;
            btnEnviar.textContent = 'Confirmar Adición';
        }
    })
    .catch(error => {
        mostrarMensaje('Error de conexión al unir al equipo.', 'error');
        btnEnviar.disabled = false;
        btnEnviar.textContent = 'Agregar al Equipo';
    });
}

// 12. LÓGICA DE VISUALIZACIÓN

// Función nueva para inyectar resumen de cupo (Individual) o cupo/límites (Equipos)
function renderizarResumenCupo(evento) {
    const container = document.getElementById('resumen-equipo-cupo');
    const subtitulo = document.getElementById("subtitulo-evento");
    if (!container || !subtitulo) return;

    let html = '';
    const totalRegistrados = parseInt(evento.registros_actuales) || 0; // Este es TEAMS o PEOPLE
    const cupoMaximo = parseInt(evento.cupo_maximo) || 0;
    const tieneCupo = cupoMaximo === 0 || totalRegistrados < cupoMaximo;
    const porcentaje = cupoMaximo > 0 ? (totalRegistrados / cupoMaximo) * 100 : 0;
    const barraColor = porcentaje >= 90 ? '#dc3545' : porcentaje >= 70 ? '#ffc107' : '#28a745';

    if (evento.tipo_registro === 'Por equipos') {
        const minIntegrantes = parseInt(evento.integrantes_min) || 1;
        const maxIntegrantes = parseInt(evento.integrantes_max) || 'Sin límite';
        
        // Solo se renderiza la barra y el detalle de límites, el subtitulo ya fue configurado en cargarParticipantes
        
        html = `
            <div style="padding: 15px; border: 1px solid #ddd; border-radius: 8px; background: #fff;">
                <p style="margin: 0 0 10px 0; font-weight: bold; color: #003366; font-size: 15px;">Resumen del Torneo</p>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; font-size: 14px;">
                    <div>
                        <strong>Tipo de Registro:</strong> <span>Por equipos</span>
                    </div>
                    <div>
                        <strong>Min. Integrantes:</strong> <span>${minIntegrantes}</span>
                    </div>
                    <div>
                        <strong>Max. Integrantes:</strong> <span>${maxIntegrantes}</span>
                    </div>
                </div>
            </div>
            <div style="margin-top: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <span style="font-weight: 600; color: #666;">Cupo de Equipos:</span>
                    <span style="font-weight: 700; color: ${tieneCupo ? '#28a745' : '#dc3545'};">
                        ${totalRegistrados}${cupoMaximo > 0 ? ` / ${cupoMaximo} ${tieneCupo ? '' : '(Lleno)'}` : ' (Sin límite)'}
                    </span>
                </div>
                ${cupoMaximo > 0 ? `
                    <div style="width: 100%; height: 10px; background: #e0e0e0; border-radius: 5px; overflow: hidden;">
                        <div style="width: ${Math.min(porcentaje, 100)}%; height: 100%; background: ${barraColor};"></div>
                    </div>
                ` : ''}
            </div>
        `;
        
    } else {
        // Evento Individual
        // Solo se renderiza la barra, el subtitulo ya fue configurado en cargarParticipantes
        
        if (cupoMaximo > 0) {
            html = `
                <div style="margin-top: 10px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background: #fff;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <span style="font-weight: 600; color: #003366;">Cupo de Participantes:</span>
                        <span style="font-weight: 700; color: ${tieneCupo ? '#28a745' : '#dc3545'};">
                            ${totalRegistrados} / ${cupoMaximo} ${tieneCupo ? '' : '(Lleno)'}
                        </span>
                    </div>
                    <div style="width: 100%; height: 10px; background: #e0e0e0; border-radius: 5px; overflow: hidden;">
                        <div style="width: ${Math.min(porcentaje, 100)}%; height: 100%; background: ${barraColor};"></div>
                    </div>
                </div>
            `;
        }
    }

    container.innerHTML = html;
}

async function cargarParticipantes(eventoId) {
    const tbody = document.getElementById("cuerpo-tabla");
    const titulo = document.getElementById("titulo-evento");
    const subtitulo = document.getElementById("subtitulo-evento");
    
    try {
        const url = `../../php/admin/obtenerParticipantes.php?evento_id=${eventoId}`;
        const response = await fetch(url);
        if(!response.ok) throw new Error(`Error HTTP: ${response.status}`);

        const data = await response.json();

        if (data.success) {
            if(data.nombre_evento) titulo.textContent = `Participantes: ${data.nombre_evento}`;
            
            const totalParticipantes = data.participantes.length;

            // --- INICIO FIX PARA MOSTRAR TOTAL CORRECTO Y BARRA ---
            if(eventoActualData) {
               
               if (eventoActualData.tipo_registro === 'Por equipos') {
                   // 1. Calcular el número de equipos únicos
                   // Usamos Set para contar los IDs de equipo sin duplicados.
                   const equipoIds = new Set(data.participantes.filter(p => p.equipo_id !== null).map(p => p.equipo_id));
                   const totalEquipos = equipoIds.size;
                   
                   // 2. Actualizar el campo para el renderizado de la barra (debe ser el total de equipos)
                   eventoActualData.registros_actuales = totalEquipos;
                   
                   // 3. FIX: Mostrar el total de personas en el subtítulo (formato simple)
                   subtitulo.textContent = `Total registrados: ${totalParticipantes}`;
               } else {
                   // 1. Evento Individual: Total de personas es el total de registros
                   eventoActualData.registros_actuales = totalParticipantes;
                   
                   const cupoMaximo = parseInt(eventoActualData.cupo_maximo) || 0;
                   // 2. FIX: Mostrar el total de participantes con la capacidad (si existe)
                   subtitulo.textContent = `Total de participantes registrados: ${totalParticipantes}${cupoMaximo > 0 ? ` / ${cupoMaximo}` : ' (Sin límite)'}`;
               }
               
               // 4. Renderizar el resumen visual de cupo (usa el eventoActualData actualizado)
               renderizarResumenCupo(eventoActualData);
            } else {
                // Fallback si eventoActualData no está listo (aunque no debería ocurrir)
                subtitulo.textContent = `Total registrados: ${totalParticipantes}`;
            }
            // --- FIN FIX PARA MOSTRAR TOTAL CORRECTO Y BARRA ---
            
            if (data.participantes.length > 0) {
                
                const primerParticipante = data.participantes[0];
                const esPorEquipo = primerParticipante.equipo_id !== null;
                
                tbody.innerHTML = ""; 

                if (esPorEquipo) {
                    let equipoActualId = null;
                    let contadorEquipo = 1;

                    data.participantes.forEach(p => {
                        if (p.equipo_id !== equipoActualId) {
                            equipoActualId = p.equipo_id;
                            
                            const encabezadoEquipo = document.createElement('tr');
                            encabezadoEquipo.innerHTML = `
                                <td colspan="6" style="padding: 10px; background: #e8f5e9; font-weight: bold; color: #003366; text-align: left; border-top: 2px solid #003366;">
                                    ${p.nombre_equipo ? `EQUIPO ${contadorEquipo}: ${p.nombre_equipo}` : 'EQUIPO SIN NOMBRE'}
                                </td>
                            `;
                            tbody.appendChild(encabezadoEquipo);
                            contadorEquipo++;
                        }
                        
                        const fila = document.createElement("tr");
                        const usuarioObj = encodeURIComponent(JSON.stringify(p));
                        
                        const etiquetaCapitan = p.es_capitan == 1 
                            ? '<span class="tag-capitan" style="background:#f9b233; color:#333; padding:2px 5px; border-radius:4px; font-weight:bold; font-size:0.8em;">CAPITÁN</span>' 
                            : '';
                        
                        const rolDisplay = `${p.rol} ${etiquetaCapitan}`;

                        fila.innerHTML = `
                            <td>${p.matricula}</td>
                            <td>${p.nombre} ${p.apellido_paterno} ${p.apellido_materno}</td>
                            <td>${p.correo}</td>
                            <td>${p.genero || 'No especificado'}</td>
                            <td>${rolDisplay}</td>
                            <td style="display:flex; gap:5px;">
                                <button onclick="abrirModalEditar('${usuarioObj}')" style="padding:5px 10px; background:#ffc107; border:none; border-radius:4px; cursor:pointer;">Editar</button>
                                <button onclick="eliminarParticipante(${p.inscripcion_id}, '${p.nombre}')" style="padding:5px 10px; background:#dc3545; color:white; border:none; border-radius:4px; cursor:pointer;">Eliminar</button>
                            </td>
                        `;
                        tbody.appendChild(fila);
                    });
                } else {
                    // LÓGICA INDIVIDUAL
                    data.participantes.forEach(p => {
                        const fila = document.createElement("tr");
                        const usuarioObj = encodeURIComponent(JSON.stringify(p));

                        fila.innerHTML = `
                            <td>${p.matricula}</td>
                            <td>${p.nombre} ${p.apellido_paterno} ${p.apellido_materno}</td>
                            <td>${p.correo}</td>
                            <td>${p.genero || 'No especificado'}</td>
                            <td>${p.rol}</td>
                            <td style="display:flex; gap:5px;">
                                <button onclick="abrirModalEditar('${usuarioObj}')" style="padding:5px 10px; background:#ffc107; border:none; border-radius:4px; cursor:pointer;">Editar</button>
                                <button onclick="eliminarParticipante(${p.inscripcion_id}, '${p.nombre}')" style="padding:5px 10px; background:#dc3545; color:white; border:none; border-radius:4px; cursor:pointer;">Eliminar</button>
                            </td>
                        `;
                        tbody.appendChild(fila);
                    });
                }
                
            } else {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay participantes inscritos.</td></tr>';
            }
        } else {
            tbody.innerHTML = `<tr><td colspan="6" style="color:red;">Error: ${data.mensaje}</td></tr>`;
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="6" style="color:red;">Error de conexión.</td></tr>`;
    }
}

// 13. RESTO DE FUNCIONES GLOBALES (Editadas y Limpias)

window.cerrarModal = function() {
    const modal = document.getElementById('modalEditarParticipante');
    if(modal) modal.style.display = 'none';
    document.getElementById('generic-modal-container').innerHTML = ''; 
}

window.abrirModalEditar = async function(usuarioString) {
    try {
        const u = JSON.parse(decodeURIComponent(usuarioString));
        usuarioIdEditando = u.usuario_id;

        const contenedor = document.getElementById('contenedor-formulario-externo');
        const modal = document.getElementById('modalEditarParticipante');
        
        if(!contenedor || !modal) return;

        modal.style.display = 'flex';
        contenedor.innerHTML = '<p style="text-align:center; padding:20px;">Cargando formulario...</p>';

        const response = await fetch('../includes/form_inscripcion_partial.html');
        if (!response.ok) throw new Error(`Error cargando form HTML`);
        
        const html = await response.text();
        contenedor.innerHTML = html;

        // Llenado y lógica del formulario de edición (se omiten las funciones de carga de facultades/carreras
        // del formulario de edición ya que no eran parte del error reportado)
        const form = contenedor.querySelector('#formDatosParticipante');
        // FIX: Se usa form.querySelector para asegurar el scope.
        const selectFacultad = form.querySelector('#select-facultad');
        const selectCarrera = form.querySelector('#select-carrera');
        const rutaPHP = '../../php/public/';

        // 1. Cargar Facultades
        if (selectFacultad) {
            cargarFacultades(selectFacultad, rutaPHP);
        }

        // 2. Llenar campos de usuario
        if(form.elements['matricula']) form.elements['matricula'].value = u.matricula;
        if(form.elements['nombres']) form.elements['nombres'].value = u.nombre;
        if(form.elements['apellido_paterno']) form.elements['apellido_paterno'].value = u.apellido_paterno;
        if(form.elements['apellido_materno']) form.elements['apellido_materno'].value = u.apellido_materno;
        if(form.elements['correo']) form.elements['correo'].value = u.correo;
        if(form.elements['genero']) form.elements['genero'].value = u.genero;

        // 3. Tipo de usuario y manejo de campos dinámicos
        const radios = form.querySelectorAll('input[name="tipo_participante"]');
        let tipoUsuario = 'Estudiante';
        radios.forEach(r => {
            if (r.value === u.rol) {
                r.checked = true;
                tipoUsuario = u.rol;
            }
            r.addEventListener('change', () => actualizarCamposSegunTipo(r.value, form));
        });
        actualizarCamposSegunTipo(tipoUsuario, form);
        
        // 4. Configurar listeners de carrera (después de cargar inicial y llenar)
        if (selectFacultad && selectCarrera) {
             selectFacultad.addEventListener('change', (e) => {
                cargarCarreras(e.target.value, selectCarrera, rutaPHP);
            });
        }

        // 5. Interceptar envío
        form.onsubmit = function(e) {
            e.preventDefault();
            guardarEdicion(form);
        };

    } catch (error) {
        alert("Error al abrir edición: " + error.message);
    }
}

window.eliminarParticipante = async function(inscripcionId, nombre) {
    if (!confirm(`¿Estás seguro de eliminar a ${nombre}?`)) return;
    
    try {
        const response = await fetch('../../php/admin/eliminarParticipante.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inscripcion_id: inscripcionId, evento_id: eventoIdActual })
        });
        const data = await response.json(); 
        
        if (data.success) {
            mostrarMensaje(data.mensaje, 'success');
            cargarParticipantes(eventoIdActual);
        } else {
            mostrarMensaje(data.mensaje, 'error');
        }
    } catch (error) {
        mostrarMensaje("Error al eliminar", 'error');
    }
}

async function guardarEdicion(form) {
    const formData = new FormData(form);
    formData.append('id_usuario', usuarioIdEditando);
    if(formData.has('nombres')) formData.append('nombre', formData.get('nombres'));

    try {
        const response = await fetch('../../php/admin/editarParticipante.php', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            window.cerrarModal();
            mostrarModalExito(data.mensaje, () => {
                cargarParticipantes(eventoIdActual); 
            });

        } else {
            mostrarMensaje(data.mensaje, 'error');
        }
    } catch (error) {
        mostrarMensaje("Error de conexión", 'error');
    }
}