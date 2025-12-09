/**
 * Generación de reportes Excel y PDF
 * Funciona tanto para inscripciones generales como para participantes de eventos
 */

// Función para obtener los filtros actuales (para inscripciones)
function obtenerFiltros() {
    const buscar = document.getElementById('buscarInscripcion')?.value || '';
    const eventoNombre = document.getElementById('filtroEvento')?.value || '';
    const genero = document.getElementById('filtroGenero')?.value || '';
    const tipoParticipante = document.getElementById('filtroTipo')?.value || '';
    const carrera = document.getElementById('filtroCarrera')?.value || '';
    const facultad = document.getElementById('filtroFacultad')?.value || '';
    const campus = document.getElementById('filtroCampus')?.value || '';
    
    // Convertir nombre de evento a ID si es necesario
    let eventoId = '';
    if (eventoNombre && typeof todasInscripciones !== 'undefined' && todasInscripciones.length > 0) {
        const eventoEncontrado = todasInscripciones.find(i => i.evento_nombre === eventoNombre);
        if (eventoEncontrado) {
            eventoId = eventoEncontrado.evento_id;
        }
    }
    
    console.log('Filtros capturados:', { 
        buscar, 
        eventoNombre, 
        eventoId, 
        genero, 
        tipoParticipante,
        carrera,
        facultad,
        campus
    });
    
    return {
        buscar: buscar,
        evento_id: eventoId,
        genero: genero === '' ? 'todos' : genero,
        tipo_participante: tipoParticipante === '' ? 'todos' : tipoParticipante,
        carrera: carrera === '' ? 'todas' : carrera,
        facultad: facultad === '' ? 'todas' : facultad,
        campus: campus === '' ? 'todos' : campus
    };
}

// Función para detectar si estamos en la página de participantes
function estiloEnPaginaParticipantes() {
    // Detectar si existe el elemento específico de participantes
    return document.getElementById('tabla-participantes') !== null;
}

// Función para obtener el evento_id de la URL
function obtenerEventoIdDeURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('evento_id');
}

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const btnExcel = document.getElementById('btnGenerarExcel');
        const btnPDF = document.getElementById('btnGenerarPDF');
        
        // Detectar en qué página estamos
        const esPaginaParticipantes = estiloEnPaginaParticipantes();
        
        if (btnExcel) {
            btnExcel.addEventListener('click', function() {
                if (esPaginaParticipantes) {
                    // ============ LÓGICA PARA PARTICIPANTES DEL EVENTO ============
                    console.log('Generando Excel de Participantes del Evento...');
                    
                    const eventoId = obtenerEventoIdDeURL();
                    
                    if (!eventoId) {
                        alert('No se pudo identificar el evento');
                        return;
                    }
                    
                    const filtros = {
                        evento_id: eventoId,
                        genero: 'todos',
                        tipo_participante: 'todos',
                        carrera: 'todas',
                        buscar: ''
                    };
                    
                    const params = new URLSearchParams(filtros);
                    const url = '../../php/admin/generarExcel.php?' + params.toString();
                    console.log('URL Excel Evento:', url);
                    window.open(url, '_blank');
                    
                } else {
                    // ============ LÓGICA PARA INSCRIPCIONES GENERALES ============
                    console.log('Generando Excel de Inscripciones...');
                    const filtros = obtenerFiltros();
                    const params = new URLSearchParams(filtros);
                    const url = '../../php/admin/generarExcel.php?' + params.toString();
                    console.log('URL Excel:', url);
                    window.open(url, '_blank');
                }
            });
        } else {
            console.error('No se encontró el botón btnGenerarExcel');
        }

        if (btnPDF) {
            btnPDF.addEventListener('click', function() {
                if (esPaginaParticipantes) {
                    // ============ LÓGICA PARA PARTICIPANTES DEL EVENTO ============
                    console.log('Generando PDF de Participantes del Evento...');
                    
                    const eventoId = obtenerEventoIdDeURL();
                    
                    if (!eventoId) {
                        alert('No se pudo identificar el evento');
                        return;
                    }
                    
                    const filtros = {
                        evento_id: eventoId,
                        genero: 'todos',
                        tipo_participante: 'todos',
                        carrera: 'todas',
                        buscar: ''
                    };
                    
                    const params = new URLSearchParams(filtros);
                    params.append('modo', 'descargar');
                    const url = '../../php/admin/generarPDF.php?' + params.toString();
                    console.log('URL PDF Evento:', url);
                    window.open(url, '_blank');
                    
                } else {
                    // ============ LÓGICA PARA INSCRIPCIONES GENERALES ============
                    console.log('Generando PDF de Inscripciones...');
                    const filtros = obtenerFiltros();
                    const params = new URLSearchParams(filtros);
                    params.append('modo', 'descargar');
                    const url = '../../php/admin/generarPDF.php?' + params.toString();
                    console.log('URL PDF:', url);
                    window.open(url, '_blank');
                }
            });
        } else {
            console.error('No se encontró el botón btnGenerarPDF');
        }
    }, 500);
});