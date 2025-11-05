/**
 * Inscripcion.js - VERSIÓN CORREGIDA
 * Actualizado para nueva estructura de BD con tabla participante
 */

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
    fetch('../php/public/obtenerEventos.php?activos=false')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.eventos) {
                // Buscar el evento específico por ID
                const evento = data.eventos.find(e => e.id == eventoId);
                
                if (evento) {
                    const nombreEvento = evento.nombre || 'Evento';
                    mostrarFormularioInscripcion(eventoId, nombreEvento);
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

        const nombreEvento = tarjeta.querySelector('.evento-titulo, .event-title, h3, h2')?.textContent.trim() 
                            || tarjeta.getAttribute('data-nombre') 
                            || 'Evento';
        
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
        
        // Modificado para pasar nombre del evento
        btnInscribir.addEventListener('click', () => {
            mostrarFormularioInscripcion(eventoId, nombreEvento);
        });
        
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
            
            <!-- Botón cerrar X -->
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
                <!-- Nombre del Evento -->
                <h3 style="color: #00843D; margin: 15px 0 0 0; font-size: 22px; font-weight: 600;">${nombreEvento}</h3>
            </div>
            
            <form id="formInscripcion">
                
                <!-- Tipo de Participante -->
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

                <!-- Apellidos y Nombres (NUEVO FORMATO) -->
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

                <!-- Matrícula y Género -->
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

                <!-- Correo -->
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 14px;">
                        Correo Electrónico UABC <span style="color: #dc3545;">*</span>
                    </label>
                    <input type="email" name="correo" required placeholder="ejemplo@uabc.edu.mx" class="form-input"
                           pattern="[a-zA-Z0-9._+\\-]+@uabc\\.(edu\\.)?mx"
                           style="width: 100%; padding: 12px 14px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 15px; transition: all 0.2s; box-sizing: border-box;">
                    <small style="color: #666; font-size: 12px; display: block; margin-top: 4px;">Debe ser correo institucional (@uabc.edu.mx o @uabc.mx)</small>
                </div>

                <!-- Facultad y Carrera -->
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

                <!-- Botones -->
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
    
    // Cargar facultades
    cargarFacultades();
    
    // Manejar cambio de tipo de participante
    document.querySelectorAll('input[name="tipo_participante"]').forEach(radio => {
        radio.addEventListener('change', function() {
            actualizarCamposSegunTipo(this.value);
        });
    });
    
    // Cargar carreras cuando cambie la facultad
    document.getElementById('select-facultad').addEventListener('change', (e) => {
        const facultadId = e.target.value;
        if (facultadId) {
            cargarCarreras(facultadId);
        } else {
            document.getElementById('select-carrera').innerHTML = '<option value="">Selecciona primero una facultad</option>';
        }
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

function actualizarCamposSegunTipo(tipo) {
    const labelMatricula = document.getElementById('label-matricula');
    const inputMatricula = document.getElementById('input-matricula');
    const helpMatricula = document.getElementById('help-matricula');
    const requiredMatricula = document.getElementById('required-matricula');
    
    const labelFacultad = document.getElementById('label-facultad');
    const selectFacultad = document.getElementById('select-facultad');
    const requiredFacultad = document.getElementById('required-facultad');
    const facultadContainer = document.getElementById('facultad-container');
    
    const labelCarrera = document.getElementById('label-carrera');
    const selectCarrera = document.getElementById('select-carrera');
    const requiredCarrera = document.getElementById('required-carrera');
    const helpCarrera = document.getElementById('help-carrera');
    const carreraContainer = document.getElementById('carrera-container');
    
    if (tipo === 'Estudiante') {
        labelMatricula.textContent = 'Matrícula';
        inputMatricula.placeholder = '12345678';
        inputMatricula.required = true;
        inputMatricula.setAttribute('pattern', '[0-9]{6,10}');
        requiredMatricula.style.display = 'inline';
        helpMatricula.textContent = 'Solo números (6-10 dígitos)';
        helpMatricula.style.display = 'block';
        
        labelFacultad.textContent = 'Unidad Académica';
        selectFacultad.required = true;
        requiredFacultad.style.display = 'inline';
        facultadContainer.style.display = 'block';
        
        labelCarrera.textContent = 'Carrera';
        selectCarrera.required = true;
        requiredCarrera.style.display = 'inline';
        helpCarrera.style.display = 'block';
        carreraContainer.style.display = 'block';
        
        if (selectFacultad.value) {
            cargarCarreras(selectFacultad.value);
        }
        
    } else if (tipo === 'Docente') {
        labelMatricula.textContent = 'Número de Empleado';
        inputMatricula.placeholder = 'Núm. empleado';
        inputMatricula.required = true;
        inputMatricula.setAttribute('pattern', '[0-9]{4,10}');
        requiredMatricula.style.display = 'inline';
        helpMatricula.textContent = 'Ingresa tu número de empleado UABC';
        helpMatricula.style.display = 'block';
        
        labelFacultad.textContent = 'Unidad Académica';
        selectFacultad.required = false;
        requiredFacultad.style.display = 'none';
        facultadContainer.style.display = 'block';
        
        selectCarrera.required = false;
        requiredCarrera.style.display = 'none';
        helpCarrera.style.display = 'none';
        carreraContainer.style.display = 'block';
        
    } else { // Externo
        labelMatricula.textContent = 'Identificación (Opcional)';
        inputMatricula.placeholder = 'ID opcional';
        inputMatricula.required = false;
        inputMatricula.removeAttribute('pattern');
        requiredMatricula.style.display = 'none';
        helpMatricula.style.display = 'none';
        
        selectFacultad.required = false;
        requiredFacultad.style.display = 'none';
        facultadContainer.style.display = 'none';
        
        selectCarrera.required = false;
        carreraContainer.style.display = 'none';
    }
}

function cargarFacultades() {
    const selectFacultad = document.getElementById('select-facultad');
    selectFacultad.innerHTML = '<option value="">Cargando facultades...</option>';
    
    fetch('../php/public/obtenerFacultades.php')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.mensaje);
            }
            
            selectFacultad.innerHTML = '<option value="">Selecciona tu facultad</option>';
            
            // Si tiene estructura {success: true, facultades: [...]}
            const facultades = data.success ? data.facultades : data;
            
            facultades.forEach(facultad => {
                const option = document.createElement('option');
                option.value = facultad.id;
                option.textContent = `${facultad.nombre} (${facultad.siglas})`;
                selectFacultad.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error:', error);
            selectFacultad.innerHTML = '<option value="">Error al cargar facultades</option>';
            mostrarToast('Error al cargar las facultades', 'error');
        });
}

function cargarCarreras(facultadId) {
    const selectCarrera = document.getElementById('select-carrera');
    selectCarrera.innerHTML = '<option value="">Cargando carreras...</option>';
    
    if (!facultadId) {
        selectCarrera.innerHTML = '<option value="">Selecciona primero una facultad</option>';
        return;
    }
    
    fetch(`../php/public/obtenerCarreras.php?facultad_id=${facultadId}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.mensaje);
            }
            
            selectCarrera.innerHTML = '<option value="">Selecciona tu carrera</option>';
            
            // Si tiene estructura {success: true, carreras: [...]}
            const carreras = data.success ? data.carreras : data;
            
            carreras.forEach(carrera => {
                const option = document.createElement('option');
                option.value = carrera.id;
                
                // Usar nombre_completo si existe (incluye "Tronco Común - ")
                const nombreMostrar = carrera.nombre_completo || carrera.nombre;
                
                // Agregar badge visual para tronco común
                if (carrera.es_tronco_comun) {
                    option.textContent = ` ${nombreMostrar}`;
                    option.style.fontWeight = '600';
                    option.style.color = '#00843D';
                } else {
                    option.textContent = nombreMostrar;
                }
                
                selectCarrera.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error:', error);
            selectCarrera.innerHTML = '<option value="">Error al cargar carreras</option>';
            mostrarToast('Error al cargar las carreras', 'error');
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