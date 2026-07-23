/**
 * Generación de reportes Excel y PDF
 * Funciona tanto para inscripciones generales, eventos normales como para pausas activas
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
    return document.getElementById('tabla-participantes') !== null;
}

// Función para detectar si la vista actual corresponde a una Pausa Activa
function esVistaPausaActiva() {
    const seccionPausa = document.getElementById('seccion-pausa-activa');
    return seccionPausa && seccionPausa.style.display !== 'none';
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
        
        const esPaginaParticipantes = estiloEnPaginaParticipantes();
        
        if (btnExcel) {
            btnExcel.addEventListener('click', function() {
                const pausaActivaActiva = esVistaPausaActiva();
                const eventoId = obtenerEventoIdDeURL();

                if (pausaActivaActiva) {
                    // ============ LÓGICA EXCEL PARA PAUSAS ACTIVAS ============
                    console.log('Generando Excel de Pausa Activa...');
                    if (!eventoId) {
                        alert('No se pudo identificar el evento de pausa activa');
                        return;
                    }
                    const url = `../../php/admin/generarExcelPausas.php?evento_id=${eventoId}`;
                    window.open(url, '_blank');

                } else if (esPaginaParticipantes) {
                    // ============ LÓGICA PARA PARTICIPANTES DEL EVENTO NORMAL ============
                    console.log('Generando Excel de Participantes del Evento...');
                    
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
                    window.open(url, '_blank');
                    
                } else {
                    // ============ LÓGICA PARA INSCRIPCIONES GENERALES ============
                    console.log('Generando Excel de Inscripciones...');
                    const filtros = obtenerFiltros();
                    const params = new URLSearchParams(filtros);
                    const url = '../../php/admin/generarExcel.php?' + params.toString();
                    window.open(url, '_blank');
                }
            });
        } else {
            console.error('No se encontró el botón btnGenerarExcel');
        }

        if (btnPDF) {
            btnPDF.addEventListener('click', function() {
                const pausaActivaActiva = esVistaPausaActiva();
                const eventoId = obtenerEventoIdDeURL();

                if (pausaActivaActiva) {
                    // ============ LÓGICA PDF PARA PAUSAS ACTIVAS ============
                    console.log('Generando PDF de Pausa Activa...');
                    if (!eventoId) {
                        alert('No se pudo identificar el evento de pausa activa');
                        return;
                    }
                    const url = `../../php/admin/generarPDFPausas.php?evento_id=${eventoId}&modo=descargar`;
                    window.open(url, '_blank');

                } else if (esPaginaParticipantes) {
                    // ============ LÓGICA PARA PARTICIPANTES DEL EVENTO NORMAL ============
                    console.log('Generando PDF de Participantes del Evento...');
                    
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
                    window.open(url, '_blank');
                    
                } else {
                    // ============ LÓGICA PARA INSCRIPCIONES GENERALES ============
                    console.log('Generando PDF de Inscripciones...');
                    const filtros = obtenerFiltros();
                    const params = new URLSearchParams(filtros);
                    params.append('modo', 'descargar');
                    const url = '../../php/admin/generarPDF.php?' + params.toString();
                    window.open(url, '_blank');
                }
            });
        } else {
            console.error('No se encontró el botón btnGenerarPDF');
        }
    }, 500);
});