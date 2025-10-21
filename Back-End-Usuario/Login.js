document.addEventListener("DOMContentLoaded", () => {
    const formLogin = document.getElementById("formLoginUsuario");
    
    if (formLogin) {
        formLogin.addEventListener("submit", loginUsuario);
    }
});

function loginUsuario(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const btnLogin = e.target.querySelector('button[type="submit"]');
    
    btnLogin.disabled = true;
    btnLogin.textContent = 'Iniciando sesión...';
    
    fetch('../Back-End-PHP/loginUsuario.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('¡Bienvenido ' + data.nombre + '!');
            window.location.href = 'eventos.html';
        } else {
            alert(data.mensaje);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error al iniciar sesión');
    })
    .finally(() => {
        btnLogin.disabled = false;
        btnLogin.textContent = 'Iniciar Sesión';
    });
}