// public/js/admin/verInscripciones.js
import * as api from '../services/apiEventos.js';

// --- Variables Globales ---
let todosLosCampus = [];
let todosLosEventos = [];
let todasLasFacultades = [];
let todasLasCarreras = [];

// Estado de la tabla
let paginaActual = 1;
let limiteActual = 10;
let totalPaginas = 1;
let columnaOrden = 'fecha_inscripcion';
let direccionOrden = 'DESC';

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', async () => {
    await verificarSesion();
    await cargarDatosIniciales();
    configurarListeners();
    configurarOrdenamiento();
});

async function verificarSesion() {
    try {
        const res = await fetch('../../php/admin/verificarSesion.php');
        const data = await res.json();
        if (!data.loggedin) window.location.href = '../login.html';
    } catch (e) {
        console.error("Error sesión", e);
    }
}

async function cargarDatosIniciales() {
    try {
        // Petición protegida para que si falla no rompa el resto del código
        const fetchPeriodos = fetch('../../php/admin/obtenerPeriodos.php')
            .then(res => res.json())
            .catch(err => {
                console.error("Error cargando periodos:", err);
                return { success: false, periodos: [] };
            });

        // Carga paralela de TODOS los catálogos + PERIODOS DINÁMICOS
        const [campus, eventos, facultades, carreras, reqPeriodos] = await Promise.all([
            api.cargarCampus(),
            api.cargarEventos(true), 
            api.cargarFacultades(),
            fetch('../../php/public/obtenerCarreras.php').then(res => res.json()),
            fetchPeriodos
        ]);

        todosLosCampus = campus || [];
        todosLosEventos = eventos || [];
        todasLasFacultades = facultades || [];
        todasLasCarreras = carreras.carreras || carreras || [];

        // 1. Llenar el filtro de Periodos Dinámicamente desde la Base de Datos
        if(reqPeriodos && reqPeriodos.success && reqPeriodos.periodos && reqPeriodos.periodos.length > 0) {
            const selectPeriodo = document.getElementById('filtroPeriodo');
            if (selectPeriodo) {
                selectPeriodo.innerHTML = '<option value="Todos">Todos (Histórico completo)</option>';
                reqPeriodos.periodos.forEach((p, index) => {
                    // Seleccionar automáticamente el primero de la base de datos (el más reciente)
                    const isSelected = index === 0 ? 'selected' : '';
                    selectPeriodo.innerHTML += `<option value="${p}" ${isSelected}>${p} ${index === 0 ? '(Activo)' : ''}</option>`;
                });
            }
        }

        // 2. Llenar filtro MAESTRO: CAMPUS
        poblarSelect('filtroCampus', todosLosCampus, 'Todos los Campus');
        
        // 3. Llenar filtros dependientes
        actualizarDropdownsPorCampus(''); 

        // 4. Cargar la tabla
        cargarTablaInscripciones();

    } catch (error) {
        console.error('Error cargando datos:', error);
        document.getElementById('tbody-inscripciones').innerHTML = '<tr><td colspan="8" style="color:red;text-align:center;">Error cargando datos iniciales.</td></tr>';
    }
}

function configurarListeners() {
    const selectCampus = document.getElementById('filtroCampus');
    const selectFacultad = document.getElementById('filtroFacultad');
    
    if (selectCampus) {
        selectCampus.addEventListener('change', (e) => {
            const campusId = e.target.value;
            actualizarDropdownsPorCampus(campusId);
            
            document.getElementById('filtroEvento').value = '';
            document.getElementById('filtroFacultad').value = ''; 
            document.getElementById('filtroCarrera').value = ''; 

            paginaActual = 1;
            cargarTablaInscripciones();
        });
    }

    if (selectFacultad) {
        selectFacultad.addEventListener('change', (e) => {
            actualizarCarrerasPorFacultad(e.target.value);
        });
    }

    // AQUI ESTABA EL ERROR: Agregamos 'filtroPeriodo' al arreglo para que escuche el cambio
    const filtros = ['buscarInscripcion', 'filtroPeriodo', 'filtroEvento', 'filtroGenero', 'filtroTipo', 'filtroFacultad', 'filtroCarrera'];
    filtros.forEach(id => {
        const elem = document.getElementById(id);
        if (elem) {
            elem.addEventListener(elem.tagName === 'INPUT' ? 'input' : 'change', () => {
                if (elem.tagName === 'INPUT') {
                    clearTimeout(elem.timeout);
                    elem.timeout = setTimeout(() => { paginaActual = 1; cargarTablaInscripciones(); }, 500);
                } else {
                    paginaActual = 1;
                    cargarTablaInscripciones();
                }
            });
        }
    });

    document.getElementById('btnLimpiarFiltros').addEventListener('click', () => {
        document.getElementById('buscarInscripcion').value = '';
        
        // Regresar el periodo al más reciente en lugar de dejarlo vacío
        const filtroP = document.getElementById('filtroPeriodo');
        if(filtroP && filtroP.options.length > 1) {
            filtroP.selectedIndex = 1; // Selecciona el índice 1 que es el periodo activo
        }
        
        document.getElementById('filtroCampus').value = '';
        document.getElementById('filtroEvento').value = '';
        document.getElementById('filtroGenero').value = '';
        document.getElementById('filtroTipo').value = '';
        document.getElementById('filtroFacultad').value = '';
        document.getElementById('filtroCarrera').value = '';
        
        actualizarDropdownsPorCampus(''); 
        
        paginaActual = 1;
        cargarTablaInscripciones();
    });

    // Paginación
    document.getElementById('limiteRegistros').addEventListener('change', (e) => {
        limiteActual = parseInt(e.target.value);
        paginaActual = 1;
        cargarTablaInscripciones();
    });
    
    document.getElementById('btnPrevPage').addEventListener('click', () => {
        if (paginaActual > 1) { paginaActual--; cargarTablaInscripciones(); }
    });
    
    document.getElementById('btnNextPage').addEventListener('click', () => {
        if (paginaActual < totalPaginas) { paginaActual++; cargarTablaInscripciones(); }
    });
}

function actualizarDropdownsPorCampus(campusId) {
    let eventosFiltrados = todosLosEventos;
    let facultadesFiltradas = todasLasFacultades;
    let carrerasFiltradas = todasLasCarreras;

    if (campusId) {
        eventosFiltrados = todosLosEventos.filter(e => String(e.campus_id) === String(campusId));
        facultadesFiltradas = todasLasFacultades.filter(f => String(f.campus_id) === String(campusId));
        carrerasFiltradas = todasLasCarreras.filter(c => String(c.campus_id) === String(campusId));
    }

    poblarSelect('filtroEvento', eventosFiltrados, campusId ? 'Eventos de este campus' : 'Todos los eventos');
    poblarSelect('filtroFacultad', facultadesFiltradas, campusId ? 'Facultades de este campus' : 'Todas las facultades');
    poblarSelect('filtroCarrera', carrerasFiltradas, campusId ? 'Carreras de este campus' : 'Todas las carreras');
}

function actualizarCarrerasPorFacultad(facultadId) {
    const campusId = document.getElementById('filtroCampus').value;
    let carrerasFiltradas = todasLasCarreras;

    if (campusId) {
        carrerasFiltradas = carrerasFiltradas.filter(c => String(c.campus_id) === String(campusId));
    }
    if (facultadId) {
        carrerasFiltradas = carrerasFiltradas.filter(c => String(c.facultad_id) === String(facultadId));
    }

    const textoDefault = facultadId ? 'Carreras de esta facultad' : (campusId ? 'Carreras de este campus' : 'Todas las carreras');
    poblarSelect('filtroCarrera', carrerasFiltradas, textoDefault);
    document.getElementById('filtroCarrera').value = ''; 
}

function poblarSelect(id, datos, textoDefault) {
    const select = document.getElementById(id);
    if (!select) return;
    
    select.innerHTML = `<option value="">${textoDefault}</option>`;
    if (!datos) return;

    datos.forEach(item => {
        let texto = item.nombre_completo || item.nombre;
        
        if (id === 'filtroCarrera') {
            const distintivo = item.facultad_siglas ? item.facultad_siglas : item.facultad_nombre;
            if (distintivo) {
                texto += ` - ${distintivo}`; 
            }
        }
        select.innerHTML += `<option value="${item.id}">${texto}</option>`;
    });
}

function configurarOrdenamiento() {
    const headers = document.querySelectorAll('th.sortable');
    headers.forEach(th => {
        th.addEventListener('click', () => {
            const columna = th.getAttribute('data-col');
            if (columnaOrden === columna) {
                direccionOrden = (direccionOrden === 'ASC') ? 'DESC' : 'ASC';
            } else {
                columnaOrden = columna;
                direccionOrden = 'ASC';
            }
            actualizarIconosOrden();
            cargarTablaInscripciones();
        });
    });
}

function actualizarIconosOrden() {
    document.querySelectorAll('th.sortable').forEach(th => {
        th.classList.remove('active-asc', 'active-desc');
        th.querySelector('.sort-icon').textContent = '';
        if (th.getAttribute('data-col') === columnaOrden) {
            th.classList.add(direccionOrden === 'ASC' ? 'active-asc' : 'active-desc');
            th.querySelector('.sort-icon').textContent = direccionOrden === 'ASC' ? '▲' : '▼';
        }
    });
}

function cargarTablaInscripciones() {
    const params = new URLSearchParams();
    params.append('pagina', paginaActual);
    params.append('limite', limiteActual);
    params.append('orden', columnaOrden);
    params.append('direccion', direccionOrden);

    const buscar = document.getElementById('buscarInscripcion').value;
    const periodoEl = document.getElementById('filtroPeriodo');
    const periodo = periodoEl ? periodoEl.value : '';
    const campus = document.getElementById('filtroCampus').value;
    const evento = document.getElementById('filtroEvento').value;
    const genero = document.getElementById('filtroGenero').value;
    const tipo = document.getElementById('filtroTipo').value;
    const facultad = document.getElementById('filtroFacultad').value;
    const carrera = document.getElementById('filtroCarrera').value;

    if (buscar) params.append('buscar', buscar);
    if (periodo && periodo !== 'Todos') params.append('periodo', periodo);
    if (campus) params.append('campus_id', campus);
    if (evento) params.append('evento_id', evento);
    if (genero) params.append('genero', genero);
    if (tipo) params.append('tipo_participante', tipo);
    if (facultad) params.append('facultad_id', facultad); 
    if (carrera) params.append('carrera_id', carrera); 

    document.getElementById('tbody-inscripciones').innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">Cargando...</td></tr>';

    fetch(`../../php/admin/verInscripciones.php?${params.toString()}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                mostrarInscripciones(data.inscripciones);
                actualizarControlesPaginacion(data.estadisticas);
                actualizarEstadisticasCards(data.estadisticas);
            } else {
                document.getElementById('tbody-inscripciones').innerHTML = `<tr><td colspan="8" style="color: red; text-align: center;">Error: ${data.mensaje}</td></tr>`;
            }
        })
        .catch(err => {
            console.error(err);
            document.getElementById('tbody-inscripciones').innerHTML = `<tr><td colspan="8" style="color: red; text-align: center;">Error de conexión</td></tr>`;
        });
}

function mostrarInscripciones(lista) {
    const tbody = document.getElementById('tbody-inscripciones');
    tbody.innerHTML = '';

    if (!lista || lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">No se encontraron registros.</td></tr>';
        return;
    }

    lista.forEach(insc => {
        const tr = document.createElement('tr');
        let badgeColor = '#6c757d';
        if (insc.tipo_participante === 'Estudiante') badgeColor = '#17a2b8';
        if (insc.tipo_participante === 'Docente') badgeColor = '#28a745';
        if (insc.tipo_participante === 'Externo') badgeColor = '#ffc107';

        const carreraInfo = insc.carrera_nombre || 'N/A';
        const facultadInfo = insc.facultad_siglas || insc.facultad_nombre || ''; 

        let fecha = 'N/A';
        if (insc.fecha_inscripcion) {
            const d = new Date(insc.fecha_inscripcion);
            fecha = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }

        let infoEquipoHTML = '';
        
        if (insc.tipo_registro === 'Por equipos') {
            const esCapitan = insc.es_capitan == 1;
            const iconoCapitan = esCapitan 
                ? '<span title="Capitán del equipo" style="color:#eab308; margin-left:5px;">★</span>' 
                : '';
            
            infoEquipoHTML = `
                <div style="display:flex; align-items:center;">
                    <span style="font-weight:600; color:#003366;">${insc.nombre_equipo || 'Sin Nombre'}</span>
                    ${iconoCapitan}
                </div>
                <small style="color:#666; font-size: 0.8em;">(Equipo)</small>
            `;
        } else {
            infoEquipoHTML = `
                <span style="color:#666; font-style:italic;">Individual</span>
            `;
        }

        tr.innerHTML = `
            <td><strong>${insc.participante_matricula}</strong></td>
            <td>${insc.nombre_completo}</td>
            <td>${insc.correo_institucional}</td>
            <td>${insc.genero}</td>
            <td><span style="background:${badgeColor}; color:${badgeColor==='#ffc107'?'#333':'#fff'}; padding:4px 8px; border-radius:12px; font-size:12px; font-weight:bold;">${insc.tipo_participante}</span></td>
            <td>
                ${carreraInfo}<br>
                <small style="color:#666;">${facultadInfo}</small>
            </td>
            <td><strong>${insc.evento_nombre}</strong><br>
                <div style="margin-top:4px; border-top:1px solid #eee; padding-top:4px;">
                    ${infoEquipoHTML}
                </div>
            </td>
            <td>${fecha}</td>
        `;
        tbody.appendChild(tr);
    });
}

function actualizarControlesPaginacion(stats) {
    totalPaginas = stats.total_paginas || 1;
    document.getElementById('infoPaginacion').textContent = `Página ${stats.pagina_actual} de ${totalPaginas} (Total: ${stats.total_inscripciones})`;
    document.getElementById('btnPrevPage').disabled = (paginaActual <= 1);
    document.getElementById('btnNextPage').disabled = (paginaActual >= totalPaginas);
}

function actualizarEstadisticasCards(stats) {
    document.getElementById('total-inscripciones').textContent = stats.total_inscripciones || 0;
    if (stats.por_genero) {
        document.getElementById('total-hombres').textContent = stats.por_genero.Hombre || 0;
        document.getElementById('total-mujeres').textContent = stats.por_genero.Mujer || 0;
        document.getElementById('total-otros').textContent = stats.por_genero['Prefiero no decirlo'] || 0;
    }
    document.getElementById('mostrando').textContent = stats.mostrando || 0;
}