// public/js/utils/formLogica.js

export function actualizarCamposSegunTipo(tipo, context = document) {
    const labelMatricula = context.querySelector('#label-matricula, .label-matricula');
    const inputMatricula = context.querySelector('#input-matricula, .input-matricula');
    const requiredMatricula = context.querySelector('#required-matricula, .required-matricula');
    
    // Contenedores
    const seccionAcademica = context.querySelector('#campus-container, .campus-container-equipo');
    const facultadContainer = context.querySelector('#facultad-container, .facultad-container-equipo');
    const carreraContainer = context.querySelector('#carrera-container, .carrera-container-equipo');
    
    // Inputs
    const selectCampus = context.querySelector('#select-campus, .select-campus');
    const selectFacultad = context.querySelector('#select-facultad, .select-facultad');
    const selectCarrera = context.querySelector('#select-carrera, .select-carrera');

    if (!labelMatricula) return;

    // CASO 1: ESTUDIANTE
    if (tipo === 'Estudiante') {
        labelMatricula.textContent = 'Matrícula';
        inputMatricula.placeholder = '12345678';
        inputMatricula.required = true;
        inputMatricula.setAttribute('pattern', '[0-9]{6,10}');
        if(requiredMatricula) requiredMatricula.style.display = 'inline';
        
        if(seccionAcademica) seccionAcademica.style.display = 'block';
        if(facultadContainer) facultadContainer.style.display = 'block';
        if(carreraContainer) carreraContainer.style.display = 'block';
        
        if(selectCampus) selectCampus.required = true;
        if(selectFacultad) selectFacultad.required = true;
        if(selectCarrera) selectCarrera.required = true;

    // CASO 2: EMPLEADOS (Docente, Personal, etc.)
    } else if (['Docente', 'Personal académico', 'Personal de servicio'].includes(tipo)) {
        
        // LÓGICA ESPECIAL: "Personal de servicio" tiene matrícula opcional
        if (tipo === 'Personal de Servicio') {
            labelMatricula.textContent = 'No. Empleado (Opcional)';
            inputMatricula.placeholder = 'Opcional';
            inputMatricula.required = false; // <--- Importante: Ya no es obligatorio
            if(requiredMatricula) requiredMatricula.style.display = 'none'; // Ocultamos el asterisco rojo
        } else {
            // Para Docentes y Personal Académico sigue siendo obligatorio
            labelMatricula.textContent = 'No. Empleado';
            inputMatricula.placeholder = 'Núm. empleado';
            inputMatricula.required = true;
            if(requiredMatricula) requiredMatricula.style.display = 'inline';
        }

        // El patrón se mantiene para validar formato SI el usuario escribe algo
        inputMatricula.setAttribute('pattern', '[0-9]{4,10}');
        
        // Muestran Campus y Facultad, pero NO Carrera
        if(seccionAcademica) seccionAcademica.style.display = 'block';
        if(facultadContainer) facultadContainer.style.display = 'block';
        if(carreraContainer) carreraContainer.style.display = 'none'; // Ocultar carrera
        
        if(selectCampus) selectCampus.required = true;
        if(selectFacultad) selectFacultad.required = true;
        if(selectCarrera) {
            selectCarrera.required = false;
            selectCarrera.value = ""; 
        }

    // CASO 3: EXTERNO
    } else { 
        labelMatricula.textContent = 'Identificación (Opcional)';
        inputMatricula.placeholder = 'ID opcional';
        inputMatricula.required = false;
        inputMatricula.removeAttribute('pattern');
        if(requiredMatricula) requiredMatricula.style.display = 'none';
        
        // Ocultar todo lo académico
        if(seccionAcademica) seccionAcademica.style.display = 'none';
        if(facultadContainer) facultadContainer.style.display = 'none';
        if(carreraContainer) carreraContainer.style.display = 'none';
        
        if(selectCampus) selectCampus.required = false;
        if(selectFacultad) selectFacultad.required = false;
        if(selectCarrera) selectCarrera.required = false;
    }
}

// --- NUEVA FUNCIÓN: Cargar Campus ---
export function cargarCampus(selectElement, rutaBase = '../php/public/') {
    if (!selectElement) return Promise.resolve(); // Retornar promesa resuelta si no hay elemento
    selectElement.innerHTML = '<option value="">Cargando...</option>';
    
    // AGREGADO EL RETURN AQUÍ
    return fetch(`${rutaBase}obtenerCampus.php`)
        .then(r => r.json())
        .then(data => {
            selectElement.innerHTML = '<option value="">Selecciona tu Unidad</option>';
            const lista = Array.isArray(data) ? data : (data.campus || []);
            lista.forEach(c => {
                selectElement.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
            });
        })
        .catch(e => selectElement.innerHTML = '<option value="">Error</option>');
}

// --- ACTUALIZADA: Cargar Facultades con filtro de Campus ---
export function cargarFacultades(selectElement, campusId = null, rutaBase = '../php/public/') {
    if (!selectElement) return Promise.resolve();
    
    // Si no hay campus seleccionado, bloqueamos
    if (!campusId) {
        selectElement.innerHTML = '<option value="">Selecciona primero una unidad</option>';
        selectElement.disabled = true;
        return Promise.resolve(); // Retornar promesa resuelta
    }

    selectElement.innerHTML = '<option value="">Cargando...</option>';
    selectElement.disabled = true;
    
    // AGREGADO EL RETURN AQUÍ
    return fetch(`${rutaBase}obtenerFacultades.php?campus_id=${campusId}`)
        .then(response => response.json())
        .then(data => {
            selectElement.innerHTML = '<option value="">Selecciona tu facultad</option>';
            const lista = data.success ? data.facultades : data;
            
            if (Array.isArray(lista) && lista.length > 0) {
                lista.forEach(facultad => {
                    const option = document.createElement('option');
                    option.value = facultad.id;
                    option.textContent = `${facultad.nombre} (${facultad.siglas || ''})`;
                    selectElement.appendChild(option);
                });
                selectElement.disabled = false;
            } else {
                selectElement.innerHTML = '<option value="">No hay facultades</option>';
            }
        })
        .catch(error => {
            selectElement.innerHTML = '<option value="">Error al cargar</option>';
        });
}

export function cargarCarreras(facultadId, selectElement, rutaBase = '../php/public/') {
    if (!selectElement) return Promise.resolve();
    
    if (!facultadId) {
        selectElement.innerHTML = '<option value="">Selecciona primero una facultad</option>';
        selectElement.disabled = true;
        return Promise.resolve(); // Retornar promesa resuelta
    }
    
    selectElement.innerHTML = '<option value="">Cargando...</option>';
    selectElement.disabled = true;
    
    // AGREGADO EL RETURN AQUÍ
    return fetch(`${rutaBase}obtenerCarreras.php?facultad_id=${facultadId}`)
        .then(response => response.json())
        .then(data => {
            selectElement.innerHTML = '<option value="">Selecciona tu carrera</option>';
            const lista = data.success ? data.carreras : data;
            
            if (Array.isArray(lista) && lista.length > 0) {
                lista.forEach(carrera => {
                    const option = document.createElement('option');
                    option.value = carrera.id;
                    const nombre = carrera.nombre_completo || carrera.nombre;
                    option.textContent = carrera.es_tronco_comun ? ` ${nombre}` : nombre;
                    if (carrera.es_tronco_comun) {
                        option.style.fontWeight = '600';
                        option.style.color = '#00843D';
                    }
                    selectElement.appendChild(option);
                });
                selectElement.disabled = false;
            } else {
                selectElement.innerHTML = '<option value="">No hay carreras</option>';
            }
        })
        .catch(error => {
            selectElement.innerHTML = '<option value="">Error al cargar</option>';
        });
}