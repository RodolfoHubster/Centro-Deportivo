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
        // Carga paralela de TODOS los catálogos
        const [campus, eventos, facultades, carreras] = await Promise.all([
            api.cargarCampus(),
            api.cargarEventos(true), 
            api.cargarFacultades(),
            fetch('../../php/public/obtenerCarreras.php').then(res => res.json())
        ]);

        todosLosCampus = campus || [];
        todosLosEventos = eventos || [];
        todasLasFacultades = facultades || [];
        todasLasCarreras = carreras.carreras || carreras || [];

        // 1. Llenar filtro MAESTRO: CAMPUS
        poblarSelect('filtroCampus', todosLosCampus, 'Todos los Campus');
        
        // 2. Llenar filtros dependientes
        actualizarDropdownsPorCampus(''); 

        // 3. Cargar la tabla
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
            
            // 1. Filtrar los 3 dropdowns dependientes
            actualizarDropdownsPorCampus(campusId);
            
            // 2. Resetear selecciones
            document.getElementById('filtroEvento').value = '';
            document.getElementById('filtroFacultad').value = ''; 
            document.getElementById('filtroCarrera').value = ''; 

            // 3. Recargar la tabla
            paginaActual = 1;
            cargarTablaInscripciones();
        });

    }
    if (selectFacultad) {
        selectFacultad.addEventListener('change', (e) => {
            // Al cambiar la facultad, filtramos las carreras disponibles
            actualizarCarrerasPorFacultad(e.target.value);
        });
    }

    // Listeners para todos los filtros
    const filtros = ['buscarInscripcion', 'filtroEvento', 'filtroGenero', 'filtroTipo', 'filtroFacultad', 'filtroCarrera'];
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

/**
 * Filtra Eventos, Facultades y Carreras según el Campus
 */
function actualizarDropdownsPorCampus(campusId) {
    let eventosFiltrados = todosLosEventos;
    let facultadesFiltradas = todasLasFacultades;
    let carrerasFiltradas = todasLasCarreras;

    if (campusId) {
        // Filtrar todo por el ID de Campus
        eventosFiltrados = todosLosEventos.filter(e => String(e.campus_id) === String(campusId));
        facultadesFiltradas = todasLasFacultades.filter(f => String(f.campus_id) === String(campusId));
        carrerasFiltradas = todasLasCarreras.filter(c => String(c.campus_id) === String(campusId));
    }

    // Repoblar selects
    poblarSelect('filtroEvento', eventosFiltrados, campusId ? 'Eventos de este campus' : 'Todos los eventos');
    poblarSelect('filtroFacultad', facultadesFiltradas, campusId ? 'Facultades de este campus' : 'Todas las facultades');
    poblarSelect('filtroCarrera', carrerasFiltradas, campusId ? 'Carreras de este campus' : 'Todas las carreras');
}
/**
 * Filtra las carreras basándose en la Facultad seleccionada (y respeta el Campus si hay uno)
 */
function actualizarCarrerasPorFacultad(facultadId) {
    const campusId = document.getElementById('filtroCampus').value;
    let carrerasFiltradas = todasLasCarreras;

    // 1. Si hay campus seleccionado, filtramos primero por campus
    if (campusId) {
        carrerasFiltradas = carrerasFiltradas.filter(c => String(c.campus_id) === String(campusId));
    }

    // 2. Si hay facultad seleccionada, filtramos las carreras de ESA facultad
    if (facultadId) {
        carrerasFiltradas = carrerasFiltradas.filter(c => String(c.facultad_id) === String(facultadId));
    }

    // 3. Actualizamos el dropdown de carreras
    // Nota: Esto usará tu función poblarSelect modificada (la que muestra los nombres largos)
    const textoDefault = facultadId ? 'Carreras de esta facultad' : (campusId ? 'Carreras de este campus' : 'Todas las carreras');
    poblarSelect('filtroCarrera', carrerasFiltradas, textoDefault);
    
    // 4. Limpiamos la selección actual de carrera para evitar inconsistencias
    document.getElementById('filtroCarrera').value = ''; 
}
function poblarSelect(id, datos, textoDefault) {
    const select = document.getElementById(id);
    if (!select) return;
    
    select.innerHTML = `<option value="">${textoDefault}</option>`;
    if (!datos) return;

    datos.forEach(item => {
        let texto = item.nombre_completo || item.nombre;
        
        // CORRECCIÓN ESPECÍFICA PARA EL CASO DE SIGLAS NULL
        if (id === 'filtroCarrera') {
            // Intentamos usar siglas; si es null o vacío, usamos el nombre completo de la facultad
            const distintivo = item.facultad_siglas ? item.facultad_siglas : item.facultad_nombre;
            
            if (distintivo) {
                // Agregamos el distintivo entre paréntesis
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
    const campus = document.getElementById('filtroCampus').value;
    const evento = document.getElementById('filtroEvento').value;
    const genero = document.getElementById('filtroGenero').value;
    const tipo = document.getElementById('filtroTipo').value;
    const facultad = document.getElementById('filtroFacultad').value;
    const carrera = document.getElementById('filtroCarrera').value;

    if (buscar) params.append('buscar', buscar);
    if (campus) params.append('campus_id', campus);
    if (evento) params.append('evento_id', evento);
    if (genero) params.append('genero', genero);
    if (tipo) params.append('tipo_participante', tipo);
    if (facultad) params.append('facultad_id', facultad); // Enviamos facultad
    if (carrera) params.append('carrera_id', carrera); // Enviamos carrera

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
            <td><strong>${insc.evento_nombre}</strong></td>
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