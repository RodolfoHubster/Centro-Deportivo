document.addEventListener("DOMContentLoaded", () => {
    const formularioContacto = document.getElementById("formularioContacto");
    
    if (formularioContacto) {
        formularioContacto.addEventListener("submit", enviarMensaje);
    }
});

function enviarMensaje(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    // Validar campos antes de enviar
    const nombre = formData.get('nombre').trim();
    const correo = formData.get('correo').trim();
    const asunto = formData.get('asunto').trim();
    const mensaje = formData.get('mensaje').trim();
    
    if (!nombre || !correo || !asunto || !mensaje) {
        mostrarMensaje('Por favor completa todos los campos', 'error');
        return;
    }
    
    if (!validarEmail(correo)) {
        mostrarMensaje('Por favor ingresa un correo válido', 'error');
        return;
    }
    
    // Deshabilitar botón
    const btnEnviar = form.querySelector('button[type="submit"]');
    const textoOriginal = btnEnviar.textContent;
    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Enviando...';
    
    fetch('../Back-End-PHP/enviarContacto.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            mostrarMensaje(data.mensaje, 'success');
            form.reset();
        } else {
            mostrarMensaje(data.mensaje, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        mostrarMensaje('Error al enviar el mensaje. Intenta de nuevo.', 'error');
    })
    .finally(() => {
        btnEnviar.disabled = false;
        btnEnviar.textContent = textoOriginal;
    });
}

function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function mostrarMensaje(texto, tipo) {
    // Crear o actualizar div de mensaje
    let mensajeDiv = document.getElementById('mensaje-respuesta');
    
    if (!mensajeDiv) {
        mensajeDiv = document.createElement('div');
        mensajeDiv.id = 'mensaje-respuesta';
        document.getElementById('formularioContacto').insertAdjacentElement('beforebegin', mensajeDiv);
    }
    
    mensajeDiv.textContent = texto;
    mensajeDiv.style.padding = '15px';
    mensajeDiv.style.margin = '15px 0';
    mensajeDiv.style.borderRadius = '5px';
    mensajeDiv.style.textAlign = 'center';
    mensajeDiv.style.fontWeight = 'bold';
    
    if (tipo === 'success') {
        mensajeDiv.style.backgroundColor = '#d4edda';
        mensajeDiv.style.color = '#155724';
        mensajeDiv.style.border = '1px solid #c3e6cb';
    } else {
        mensajeDiv.style.backgroundColor = '#f8d7da';
        mensajeDiv.style.color = '#721c24';
        mensajeDiv.style.border = '1px solid #f5c6cb';
    }
    
    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
        mensajeDiv.style.display = 'none';
    }, 5000);
}