/**
 * Generación de reportes Excel y PDF
 */

// Función para obtener los filtros actuales
function obtenerFiltros() {
    const buscar = document.getElementById('buscarInscripcion')?.value || '';
    const eventoNombre = document.getElementById('filtroEvento')?.value || '';
    const genero = document.getElementById('filtroGenero')?.value || '';
    const tipoParticipante = document.getElementById('filtroTipo')?.value || '';
    
    // Convertir nombre de evento a ID si es necesario
    let eventoId = '';
    if (eventoNombre && todasInscripciones.length > 0) {
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
        tipoParticipante 
    });
    
    return {
        buscar: buscar,
        evento_id: eventoId,
        genero: genero === '' ? 'todos' : genero,
        tipo_participante: tipoParticipante === '' ? 'todos' : tipoParticipante
    };
}

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    // Esperar un poco para asegurarnos de que los botones existan
    setTimeout(() => {
        // Botón para generar Excel
        const btnExcel = document.getElementById('btnGenerarExcel');
        if (btnExcel) {
            btnExcel.addEventListener('click', function() {
                console.log('Generando Excel...');
                const filtros = obtenerFiltros();
                const params = new URLSearchParams(filtros);
                const url = '../../php/admin/generarExcel.php?' + params.toString();
                console.log('URL Excel:', url);
                window.open(url, '_blank');
            });
        } else {
            console.error('No se encontró el botón btnGenerarExcel');
        }

        // Botón para generar PDF
        const btnPDF = document.getElementById('btnGenerarPDF');
        if (btnPDF) {
            btnPDF.addEventListener('click', function() {
                console.log('Generando PDF...');
                const filtros = obtenerFiltros();
                const params = new URLSearchParams(filtros);
                params.append('modo', 'descargar');
                const url = '../../php/admin/generarPDF.php?' + params.toString();
                console.log('URL PDF:', url);
                window.open(url, '_blank');
            });
        } else {
            console.error('No se encontró el botón btnGenerarPDF');
        }
    }, 500); // Esperar 500ms para que todo se cargue
});