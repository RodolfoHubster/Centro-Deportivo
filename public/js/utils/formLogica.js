// public/js/utils/formLogica.js

export function actualizarCamposSegunTipo(tipo, context = document) {
    // CAMBIO CRÍTICO: Usamos querySelector con '#' para que funcione dentro del formulario
    const labelMatricula = context.querySelector('#label-matricula');
    const inputMatricula = context.querySelector('#input-matricula');
    const requiredMatricula = context.querySelector('#required-matricula');
    
    const facultadContainer = context.querySelector('#facultad-container');
    const selectFacultad = context.querySelector('#select-facultad');
    const requiredFacultad = context.querySelector('#required-facultad');
    
    const carreraContainer = context.querySelector('#carrera-container');
    const selectCarrera = context.querySelector('#select-carrera');
    const requiredCarrera = context.querySelector('#required-carrera');

    if (!labelMatricula) return;

    if (tipo === 'Estudiante') {
        labelMatricula.textContent = 'Matrícula';
        inputMatricula.placeholder = '12345678';
        inputMatricula.required = true;
        inputMatricula.setAttribute('pattern', '[0-9]{6,10}');
        if(requiredMatricula) requiredMatricula.style.display = 'inline';
        
        if(facultadContainer) facultadContainer.style.display = 'block';
        if(selectFacultad) selectFacultad.required = true;
        if(requiredFacultad) requiredFacultad.style.display = 'inline';
        
        if(carreraContainer) carreraContainer.style.display = 'block';
        if(selectCarrera) selectCarrera.required = true;
        if(requiredCarrera) requiredCarrera.style.display = 'inline';

    } else if (tipo === 'Docente') {
        labelMatricula.textContent = 'Número de Empleado';
        inputMatricula.placeholder = 'Núm. empleado';
        inputMatricula.required = true;
        inputMatricula.setAttribute('pattern', '[0-9]{4,10}');
        if(requiredMatricula) requiredMatricula.style.display = 'inline';
        
        if(facultadContainer) facultadContainer.style.display = 'block';
        if(selectFacultad) selectFacultad.required = false; 
        if(requiredFacultad) requiredFacultad.style.display = 'none';
        
        if(carreraContainer) carreraContainer.style.display = 'block'; 
        if(selectCarrera) selectCarrera.required = false;
        if(requiredCarrera) requiredCarrera.style.display = 'none';

    } else { // Externo
        labelMatricula.textContent = 'Identificación (Opcional)';
        inputMatricula.placeholder = 'ID opcional';
        inputMatricula.required = false;
        inputMatricula.removeAttribute('pattern');
        if(requiredMatricula) requiredMatricula.style.display = 'none';
        
        if(facultadContainer) facultadContainer.style.display = 'none';
        if(selectFacultad) selectFacultad.required = false;
        
        if(carreraContainer) carreraContainer.style.display = 'none';
        if(selectCarrera) selectCarrera.required = false;
    }
}

export function cargarFacultades(selectElement, rutaBase = '../php/public/') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">Cargando...</option>';
    
    fetch(`${rutaBase}obtenerFacultades.php`)
        .then(response => response.json())
        .then(data => {
            selectElement.innerHTML = '<option value="">Selecciona tu facultad</option>';
            const lista = data.success ? data.facultades : data;
            lista.forEach(facultad => {
                const option = document.createElement('option');
                option.value = facultad.id;
                option.textContent = `${facultad.nombre} (${facultad.siglas})`;
                selectElement.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error:', error);
            selectElement.innerHTML = '<option value="">Error al cargar</option>';
        });
}

export function cargarCarreras(facultadId, selectElement, rutaBase = '../php/public/') {
    if (!selectElement) return;
    
    if (!facultadId) {
        selectElement.innerHTML = '<option value="">Selecciona primero una facultad</option>';
        return;
    }
    
    selectElement.innerHTML = '<option value="">Cargando...</option>';
    
    fetch(`${rutaBase}obtenerCarreras.php?facultad_id=${facultadId}`)
        .then(response => response.json())
        .then(data => {
            selectElement.innerHTML = '<option value="">Selecciona tu carrera</option>';
            const lista = data.success ? data.carreras : data;
            lista.forEach(carrera => {
                const option = document.createElement('option');
                option.value = carrera.id;
                const nombre = carrera.nombre_completo || carrera.nombre;
                if (carrera.es_tronco_comun) {
                    option.textContent = ` ${nombre}`;
                    option.style.fontWeight = '600';
                    option.style.color = '#00843D';
                } else {
                    option.textContent = nombre;
                }
                selectElement.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error:', error);
            selectElement.innerHTML = '<option value="">Error al cargar</option>';
        });
}