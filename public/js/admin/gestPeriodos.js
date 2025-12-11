// public/js/admin/gestPeriodos.js

// ----------------------------------------------------
// 1. Nueva Función para manejar la eliminación
// ----------------------------------------------------
window.eliminarPeriodo = async function(id, nombrePeriodo) {
    if (!confirm(`¿Estás seguro de eliminar PERMANENTEMENTE el periodo "${nombrePeriodo}"?\n\nEsta acción no se puede deshacer.`)) {
        return;
    }
    
    try {
        const response = await fetch(`../../php/admin/gestionarPeriodos.php?accion=eliminar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: id })
        });
        const data = await response.json(); 
        
        if (data.success) {
            // Usar la función mostrarModalExito del HTML
            if (typeof mostrarModalExito === 'function') {
                mostrarModalExito(
                    '¡Operación Exitosa!',
                    `El periodo <strong>${nombrePeriodo}</strong> se eliminó permanentemente.`,
                    cargarPeriodos
                );
            } else {
                // Fallback: usar alert si no está disponible
                alert(data.mensaje || `El periodo "${nombrePeriodo}" ha sido eliminado permanentemente.`);
                if (typeof cargarPeriodos === 'function') {
                    cargarPeriodos();
                }
            }
        } else {
            alert("Error: " + data.mensaje);
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Error de conexión al eliminar el periodo");
    }
}


// ----------------------------------------------------
// 2. Modificar la función que renderiza los periodos (para añadir el botón)
//    Esta es una estructura de ejemplo, ajústala a tu código real.
// ----------------------------------------------------
function mostrarPeriodos(periodos) {
    const container = document.getElementById('lista-periodos');
    container.innerHTML = '';
    
    if (periodos.length === 0) {
        container.innerHTML = '<p style="text-align: center;">No hay periodos registrados.</p>';
        return;
    }

    periodos.forEach(periodo => {
        const estado = periodo.activo ? '<span style="color: #28a745; font-weight: bold;">(ACTIVO)</span>' : '';
        const btnAccion = periodo.activo 
            ? '<button disabled style="background-color: #ccc; cursor: not-allowed; padding:5px 10px;">Activo</button>' 
            : `<button onclick="activarPeriodo(${periodo.id}, '${periodo.nombre}')" style="background-color: #007bff; color: white; padding:5px 10px;">Activar</button>`;
        
        container.innerHTML += `
            <div class="periodo-card">
                <div class="info-periodo">
                    <h3 style="margin: 0;">${periodo.nombre} ${estado}</h3>
                </div>
                <div class="acciones-periodo" style="display: flex; gap: 5px;">
                    ${btnAccion}
                    
                    <button onclick="eliminarPeriodo(${periodo.id}, '${periodo.nombre}')" 
                            style="background-color: #dc3545 !important; color: white !important; padding:5px 10px; border:none; border-radius:4px; cursor:pointer;">
                        Eliminar Permanente
                    </button>
                </div>
            </div>
        `;
    });
}

// ----------------------------------------------------
// 3. Incluir el modal de éxito si no lo tienes
//    (Debes incluirlo si no está definido en otro archivo JS que se importe)
// ----------------------------------------------------
// function mostrarModalExitoUsuario(titulo, mensajeDetalle, onAceptarCallback = null) { ... }
// ... (Copiar esta función del código que implementaste en gestUsuarios.js)