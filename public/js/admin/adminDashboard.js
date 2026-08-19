// js/admin/adminDashboard.js

window.addEventListener('DOMContentLoaded', async () => {
    verificarSesion();
    await cargarPeriodosDashboard();
    cargarEstadisticas();
    
    // Escuchar el cambio en el selector
    const filtroPeriodo = document.getElementById('filtroPeriodoDashboard');
    if (filtroPeriodo) {
        filtroPeriodo.addEventListener('change', cargarEstadisticas);
    }
});

function verificarSesion() {
    fetch('../../php/admin/verificarSesion.php')
        .then(response => response.json())
        .then(data => {
            if (!data.loggedin) {
                window.location.href = '../login.html';
            } else {
                const mensaje = document.getElementById('mensaje-bienvenida');
                if(mensaje) {
                    mensaje.textContent = `¡Hola ${data.nombre}! Aquí puedes administrar el contenido del sitio.`;
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            window.location.href = '../login.html';
        });
}

async function cargarPeriodosDashboard() {
    try {
        const res = await fetch('../../php/admin/obtenerPeriodos.php');
        const data = await res.json();
        const select = document.getElementById('filtroPeriodoDashboard');
        
        if (select && data.success && data.periodos && data.periodos.length > 0) {
            select.innerHTML = '<option value="Todos">Histórico Completo</option>';
            data.periodos.forEach((p, index) => {
                // Seleccionar el más reciente por defecto
                const isSelected = index === 0 ? 'selected' : '';
                select.innerHTML += `<option value="${p}" ${isSelected}>${p} ${index === 0 ? '(Activo)' : ''}</option>`;
            });
        } else if (select) {
            select.innerHTML = '<option value="Todos">Histórico Completo</option>';
        }
    } catch (e) {
        console.error("Error al cargar periodos:", e);
    }
}

function cargarEstadisticas() {
    const periodoSelect = document.getElementById('filtroPeriodoDashboard');
    const periodo = periodoSelect ? periodoSelect.value : '';
    
    let url = '../../php/admin/obtenerContadores.php';
    if (periodo && periodo !== 'Todos') {
        url += `?periodo=${periodo}`;
    } else if (periodo === 'Todos') {
        url += `?periodo=Todos`; // Manda 'Todos' para que el PHP lo entienda
    }

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const totalEventos = document.getElementById('total-eventos');
                if(totalEventos) totalEventos.textContent = data.total_eventos;

                const totalInscripciones = document.getElementById('total-inscripciones');
                if(totalInscripciones) totalInscripciones.textContent = data.total_inscripciones;
            }
        })
        .catch(error => console.error('Error al cargar estadísticas:', error));
}