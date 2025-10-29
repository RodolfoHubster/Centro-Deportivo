/**
 * Inscripcion.js - VERSIÓN REFACTORIZADA
 * Lógica separada de HTML y CSS.
 */

document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Iniciar la adición de botones
    // Se usa un timeout para dar tiempo a que otras bibliotecas carguen las tarjetas
    setTimeout(() => {
        agregarBotonesInscripcion();
    }, 1000);

    // 2. Cargar datos iniciales del formulario
    cargarFacultades();

    // 3. Configurar todos los event listeners del modal una sola vez
    setupModalListeners();
});

/**
 * Agrega los botones de "Registrarse" a todas las tarjetas de evento.
 */
function agregarBotonesInscripcion() {
    const tarjetasEvento = document.querySelectorAll('.evento-card, .event-card, .card-evento');
    
    tarjetasEvento.forEach((tarjeta) => {
        // Evitar duplicar botones
        if (tarjeta.querySelector('.btn-inscribir')) return;
        
        const eventoId = tarjeta.getAttribute('data-evento-id') || tarjeta.getAttribute('data-id');
        if (!eventoId) return;
        
        const btnInscribir = document.createElement('button');
        btnInscribir.className = 'btn-inscribir';
        btnInscribir.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
            Registrarse al Evento
        `;
        
        // El CSS se encarga de los estilos y el :hover
        
        btnInscribir.addEventListener('click', () => {
            mostrarFormularioInscripcion(eventoId);
        });
        
        const contenedorBotones = tarjeta.querySelector('.card-actions, .evento-actions, .btn-container');
        if (contenedorBotones) {
            contenedorBotones.appendChild(btnInscribir);
        } else {
            tarjeta.appendChild(btnInscribir);
        }
    });
}

/**
 * Muestra el modal de inscripción y asigna el ID del evento.
 * @param {string} eventoId - El ID del evento al que se inscribirá.
 */
function mostrarFormularioInscripcion(eventoId) {
    const modal = document.getElementById('modal-inscripcion');
    const hiddenInput = document.getElementById('evento_id_hidden');
    
    // Asignar el ID del evento al campo oculto del formulario
    hiddenInput.value = eventoId;
    
    // Mostrar el modal (CSS se encarga de la animación)
    modal.style.display = 'flex';
}

/**
 * Cierra el modal de inscripción.
 */
function cerrarModalRegistro() {
    const modal = document.getElementById('modal-inscripcion');
    modal.style.display = 'none';
}

/**
 * Configura todos los listeners para los modales y el formulario.
 * Se llama una sola vez al cargar la página.
 */
function setupModalListeners() {
    const modal = document.getElementById('modal-inscripcion');
    const form = document.getElementById('formInscripcion');
    const modalExito = document.getElementById('modal-exito');

    // Listener para cerrar el modal de registro
    document.getElementById('btnCerrarModal').addEventListener('click', cerrarModalRegistro);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) { // Cerrar al hacer clic en el fondo (overlay)
            cerrarModalRegistro();
        }
    });

    // Listener para el envío del formulario
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        enviarInscripcion(form);
    });

    // Listener para el cambio de tipo de participante
    document.querySelectorAll('input[name="tipo_participante"]').forEach(radio => {
        radio.addEventListener('change', function() {
            actualizarCamposSegunTipo(this.value);
        });
    });
    
    // Listener para cargar carreras cuando cambie la facultad
    document.getElementById('select-facultad').addEventListener('change', (e) => {
        const facultadId = e.target.value;
        if (facultadId) {
            cargarCarreras(facultadId);
        } else {
            document.getElementById('select-carrera').innerHTML = '<option value="">Selecciona primero una facultad</option>';
        }
    });

    // Listener para el modal de éxito
    document.getElementById('btnAceptarExito').addEventListener('click', () => {
        modalExito.style.display = 'none';
        location.reload(); // Recarga la página
    });
    modalExito.addEventListener('click', (e) => {
        if (e.target === modalExito) { // Cerrar al hacer clic en el fondo
            modalExito.style.display = 'none';
            location.reload();
        }
    });
}

/**
 * Ajusta la visibilidad y requerimientos de los campos del formulario
 * según si el participante es Estudiante, Docente o Externo.
 * @param {string} tipo - El valor del radio button seleccionado.
 */
function actualizarCamposSegunTipo(tipo) {
    // Referencias a elementos (se mantienen igual)
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
    
    // Lógica (se mantiene igual)
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

/**
 * Obtiene la lista de facultades desde el servidor y las carga en el select.
 */
function cargarFacultades() {
    const selectFacultad = document.getElementById('select-facultad');
    selectFacultad.innerHTML = '<option value="">Cargando facultades...</option>';
    
    fetch('../php/public/obtenerFacultades.php')
        .then(response => response.json())
        .then(data => {
            if (data.error) throw new Error(data.mensaje);
            
            selectFacultad.innerHTML = '<option value="">Selecciona tu facultad</option>';
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

/**
 * Obtiene las carreras de una facultad específica.
 * @param {string} facultadId - ID de la facultad seleccionada.
 */
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
            if (data.error) throw new Error(data.mensaje);
            
            selectCarrera.innerHTML = '<option value="">Selecciona tu carrera</option>';
            const carreras = data.success ? data.carreras : data;
            
            carreras.forEach(carrera => {
                const option = document.createElement('option');
                option.value = carrera.id;
                option.textContent = carrera.nombre_completo || carrera.nombre;
                
                if (carrera.es_tronco_comun) {
                    option.style.fontWeight = '600';
                    option.style.color = '#00843D';
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

/**
 * Envía los datos del formulario de inscripción al servidor.
 * @param {HTMLFormElement} form - El formulario de inscripción.
 */
function enviarInscripcion(form) {
    const formData = new FormData(form);
    const btnEnviar = document.getElementById('btnSubmit');
    
    // Preparar datos para el endpoint
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
    
    // Validación simple
    const tipo = formData.get('tipo_participante');
    if (tipo === 'Estudiante' && (!formData.get('matricula') || !formData.get('carrera'))) {
        mostrarToast('Los estudiantes deben proporcionar matrícula y carrera', 'error');
        return;
    }
    
    // Mostrar estado de carga (manejado por CSS)
    btnEnviar.disabled = true;
    btnEnviar.classList.add('loading');
    
    fetch('../php/public/inscribirEvento.php', {
        method: 'POST',
        body: datosEnvio
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            cerrarModalRegistro();
            mostrarModalExito(data.mensaje);
        } else {
            mostrarToast(data.mensaje, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        mostrarToast('Error al procesar la inscripción. Intenta de nuevo.', 'error');
    })
    .finally(() => {
        // Quitar estado de carga
        btnEnviar.disabled = false;
        btnEnviar.classList.remove('loading');
    });
}

/**
 * Muestra el modal de éxito.
 * @param {string} mensaje - El mensaje de éxito a mostrar.
 */
function mostrarModalExito(mensaje) {
    const modalExito = document.getElementById('modal-exito');
    const mensajeP = document.getElementById('modal-exito-mensaje');
    
    mensajeP.textContent = mensaje;
    modalExito.style.display = 'flex';
}

/**
 * Muestra una notificación toast (emergente).
 * @param {string} mensaje - El texto a mostrar.
 * @param {string} [tipo='success'] - 'success' o 'error' para el color.
 */
function mostrarToast(mensaje, tipo = 'success') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`; // Clases manejadas por CSS
    
    const icon = tipo === 'success' ? '✓' : '✕';
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span>${mensaje}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // El CSS se encarga de la animación de salida
    setTimeout(() => {
        toast.remove();
    }, 3000);
}