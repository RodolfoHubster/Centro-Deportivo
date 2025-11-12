const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {

        const isAdminPage = window.location.pathname.includes('/admin/');

        // --- RUTAS CORREGIDAS ---
        // Estas rutas ahora son relativas al archivo HTML que carga headFooter.js
        const headerURL = isAdminPage ? '../includes/header.html' : 'includes/header.html';
        const footerURL = isAdminPage ? '../includes/footer.html' : 'includes/footer.html';
        const headerAdminURL = isAdminPage ? '../includes/headerAdmin.html' : 'includes/headerAdmin.html';
        
        // Asumimos que la lógica de logout solo se llama desde páginas de admin
        const cerrarSesionPHP = isAdminPage ? '../../php/admin/cerrarSesion.php' : '../php/admin/cerrarSesion.php';
        const loginPageURL = isAdminPage ? '../login.html' : 'login.html';
        // --- FIN DE RUTAS CORREGIDAS ---

        const urlToFetch = isAdminPage ? headerAdminURL : headerURL;

        fetch(urlToFetch)
            .then(response => {
                // Mejora del manejo de errores
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}, trying to fetch ${urlToFetch}`);
                }
                return response.text();
            })
            .then(html => {
                headerPlaceholder.innerHTML = html;
                if (isAdminPage) {
                    ajustarTituloAdminHeader();
                    // Asegúrate que el botón exista ANTES de añadir el listener
                    const btnLogout = document.querySelector('#header-placeholder #btnCerrarSesion');
                    if (btnLogout) {
                        btnLogout.addEventListener('click', cerrarSesionAdmin);
                    } else {
                        // Es normal si el header aún no cargó completamente,
                        // pero si persiste, revisa headerAdmin.html
                        console.warn("Botón de cerrar sesión (#btnCerrarSesion) no encontrado en el header cargado.");
                    }
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
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}, trying to fetch ${footerURL}`);   
                }
                return response.text();
            })
            .then(html => {
                footerPlaceholder.innerHTML = html;
            })
            .catch(error => {
                console.error('Error al cargar el footer:', error);
                footerPlaceholder.innerHTML = `<p style="text-align:center;color:red;">Error al cargar el pie de página. (${error})</p>`;
            })
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
            case 'admin.html':break; 
            case 'gestionar-eventos.html': subtitulo = "Gestión de Eventos";break;
            case 'ver-inscripciones.html': subtitulo = "Inscripciones a Eventos";break;
            case 'ver-mensajes.html': subtitulo = "Mensajes de Contacto";break;
        }
        h1.textContent = tituloPrincipal;
        p.textContent = subtitulo;
    }

    function cerrarSesionAdmin() {
        if (confirm('¿Estás seguro de cerrar sesión?')) {
           fetch(cerrarSesionPHP) // Ruta absoluta
             .then(response => response.json())
             .then(data => {
               if (data.success) {
                 localStorage.removeItem('usuarioLogeado'); 
                 window.location.href = loginPageURL; // Ruta absoluta
               }
             })
             .catch(error => {
               console.error('Error:', error);
               localStorage.removeItem('usuarioLogeado');
               window.location.href = loginPageURL; // Ruta absoluta
             });
         }
        }
    ;