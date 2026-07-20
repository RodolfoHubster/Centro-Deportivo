document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtener el ID del evento desde la URL (ej: subir-evidencia.html?id=5)
    const parametrosURL = new URLSearchParams(window.location.search);
    const eventoId = parametrosURL.get('id');

    // Si no hay ID en la URL, redirigir de vuelta por seguridad
    if (!eventoId) {
        alert("No se seleccionó ningún evento. Regresando...");
        window.location.href = 'gestionar-eventos.html';
        return;
    }

    // Asignar el ID al campo oculto del formulario
    document.getElementById('evento_id_oculto').value = eventoId;

    // 2. Lógica para enviar el archivo
    const formEvidencia = document.getElementById('formSubirEvidencia');
    
    formEvidencia.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const divMensaje = document.getElementById('mensajeEvidencia');
        const btnSubir = document.getElementById('btnSubirEvidencia');
        
        // Mostrar estado de carga
        divMensaje.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-spinner fa-spin"></i> Subiendo archivo a Google Drive, esto puede tardar un momento...
            </div>`;
        btnSubir.disabled = true;
        
        const formData = new FormData(this);

        fetch('../../php/admin/subirEvidencia.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                divMensaje.innerHTML = `
                    <div class="alert alert-success">
                        <i class="fas fa-check-circle"></i> ${data.mensaje} <br>
                        <a href="${data.url}" target="_blank" class="alert-link mt-2 d-inline-block">Ver archivo en Drive</a>
                    </div>`;
                this.reset(); // Limpia el formulario
            } else {
                divMensaje.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-times-circle"></i> Error: ${data.mensaje}
                    </div>`;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            divMensaje.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-times-circle"></i> Error de conexión con el servidor.
                </div>`;
        })
        .finally(() => {
            btnSubir.disabled = false; // Reactiva el botón
        });
    });
});