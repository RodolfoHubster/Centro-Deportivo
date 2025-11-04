    // Verificar sesión al cargar
    window.addEventListener('DOMContentLoaded', () => {
        verificarSesion();
        cargarEstadisticas();
      });
  
      function verificarSesion() {
        fetch('../../php/admin/verificarSesion.php')
          .then(response => response.json())
          .then(data => {
            if (!data.loggedin) {
              // No hay sesión válida, redirigir al login
              window.location.href = '../login.html';
            } else {
              // Sesión válida, mostrar mensaje de bienvenida
              document.getElementById('mensaje-bienvenida').textContent = 
                `¡Hola ${data.nombre}! Aquí puedes administrar el contenido del sitio.`;
            }
          })
          .catch(error => {
            console.error('Error:', error);
            window.location.href = '../login.html';
          });
      }
  
      function cargarEstadisticas() {
        // Cargar total de eventos
        fetch('../../php/public/obtenerEventos.php')
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              document.getElementById('total-eventos').textContent = data.total || 0;
            }
          })
          .catch(error => console.error('Error al cargar eventos:', error));
  
        // Cargar total de inscripciones
        fetch('../../php/public/obtenerEventos.php')
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              document.getElementById('total-inscripciones').textContent = data.total || 0;
            }
          })
          .catch(error => console.error('Error al cargar inscripciones:', error));
      }
  