document.addEventListener("DOMContentLoaded", function() {

    const baseDir = '/Centro-Deportivo';
    const headerURL = '/Centro-Deportivo/includes/header.html';
    const footerURL = '/Centro-Deportivo/includes/footer.html';
    const headerAdminURL = '/Centro-Deportivo/includes/headerAdmin.html';

    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {

        const isAdminPage = window.location.pathname.includes('/Front-End-Admin/');
        const urlToFetch = isAdminPage ? headerAdminURL : headerURL;

        fetch(urlToFetch)
        .then(response => response.ok ? response.text() : Promise.reject(response.statusText))
        .then(html => {
            headerPlaceholder.innerHTML = html;

            if(isAdminPage) {
                ajustarTituloAdminHeader();
                const btnLogout = document.querySelector('#header-placeholder #btnCerrarSesion');
                    if (btnLogout) {
                        btnLogout.addEventListener('click', cerrarSesionAdmin); 
            }
        } else{

        }
    })
        .catch(error => {
            console.error('Error al cargar el header:', error);
            headerPlaceholder.innerHTML = '<p style="text-align:center;color:red;">Error al cargar el menú.</p>';
            
        });
        

}

    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder) {
        fetch(footerURL)
        .then(response => response.ok ? response.text() : Promise.reject(response.statusText))
        .then(html => {
            footerPlaceholder.innerHTML = html
        })

        .catch(error => {
            console.error('Error al cargar el footer:', error);
            footerPlaceholder.innerHTML = '<p style="text-align:center;color:red;">Error al cargar el footer.</p>';
        });
    }

    function ajustarTituloAdminHeader() {
        const headerTitleDiv = document.querySelector('#header-placeholder .main-header .title');
        if (!headerTitleDiv) return;
        const h1 = headerTitleDiv.querySelector('h1');
        const p = headerTitleDiv.querySelector('p');
        if (!h1 || !p) return;

        const currentPage = window.location.pathname.split('/').pop(); 
        let tituloPrincipal = "Universidad Autónoma de Baja California"; 
        let subtitulo = "Panel Administrativo";

        switch (currentPage) {
            case 'admin.html':
                // Ya es correcto
                break; 
            case 'gestionar-eventos.html':
                subtitulo = "Gestión de Eventos";
                break;
            case 'ver-inscripciones.html':
                subtitulo = "Inscripciones a Eventos";
                break;
            case 'ver-mensajes.html':
                subtitulo = "Mensajes de Contacto";
                break;
        }
        h1.textContent = tituloPrincipal;
        p.textContent = subtitulo;
    }

    function cerrarSesionAdmin() {
        if (confirm('¿Estás seguro de cerrar sesión?')) {
           fetch('/Centro-Deportivo/Back-End-Admin/cerrarSesion.php') // Ruta absoluta
             .then(response => response.json())
             .then(data => {
               if (data.success) {
                 localStorage.removeItem('usuarioLogeado'); 
                 window.location.href = '/Centro-Deportivo/Front-End-Usuario/login.html'; // Ruta absoluta
               }
             })
             .catch(error => {
               console.error('Error:', error);
               localStorage.removeItem('usuarioLogeado');
               window.location.href = '/Centro-Deportivo/Front-End-Usuario/login.html'; // Ruta absoluta
             });
         }
        }
    });