// public/js/headFooter.js

// 1. Definimos las variables al principio para que sean accesibles en todo el archivo
const isAdminPage = window.location.pathname.includes('/admin/');

// --- RUTAS (Definidas globalmente) ---
const headerURL = isAdminPage ? '../includes/header.html' : 'includes/header.html';
const footerURL = isAdminPage ? '../includes/footer.html' : 'includes/footer.html';
const headerAdminURL = isAdminPage ? '../includes/headerAdmin.html' : 'includes/headerAdmin.html';

// Aquí corregimos el acceso para la función de abajo
const cerrarSesionPHP = isAdminPage ? '../../php/admin/cerrarSesion.php' : '../php/admin/cerrarSesion.php';
const loginPageURL = isAdminPage ? '../login.html' : 'login.html';
// --- FIN DE RUTAS ---


// 2. Lógica del Header
const headerPlaceholder = document.getElementById('header-placeholder');

if (headerPlaceholder) {
    const urlToFetch = isAdminPage ? headerAdminURL : headerURL;

    fetch(urlToFetch)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, trying to fetch ${urlToFetch}`);
            }
            return response.text();
        })
        .then(html => {
            headerPlaceholder.innerHTML = html;
            if (isAdminPage) {
                ajustarTituloAdminHeader();
                // Verifica el rol para ocultar/mostrar elementos
                verificarRolParaNavegacion();

                // --- LÓGICA DE CERRAR SESIÓN (ACTUALIZADA) ---
                // Manejamos ambos botones: escritorio y móvil

                // 1. Botón del Header (Icono escritorio)
                const btnLogoutHeader = document.getElementById('btnCerrarSesion');
                if (btnLogoutHeader) {
                    btnLogoutHeader.addEventListener('click', (e) => {
                        e.preventDefault();
                        cerrarSesionAdmin();
                    });
                }

                // 2. Botón del Menú Hamburguesa (Texto móvil)
                const btnLogoutMovil = document.getElementById('btnCerrarSesionMovil');
                if (btnLogoutMovil) {
                    btnLogoutMovil.addEventListener('click', (e) => {
                        e.preventDefault();
                        
                        // Cerramos el menú hamburguesa visualmente antes de salir
                        const mainNav = document.querySelector('.main-nav');
                        const toggle = document.getElementById('mobileMenuToggle');
                        const navOverlay = document.getElementById('navOverlay');
                        
                        if(mainNav) mainNav.classList.remove('active');
                        if(toggle) toggle.classList.remove('active');
                        if(navOverlay) navOverlay.classList.remove('active');
                        document.body.style.overflow = ''; // Restaurar scroll

                        cerrarSesionAdmin();
                    });
                }
                // ---------------------------------------------
            }
        })
        .catch(error => {
            console.error('Error al cargar el header:', error);
            headerPlaceholder.innerHTML = '<p style="text-align:center;color:red;">Error al cargar el menú.</p>';
        });
}

// 3. Lógica del Footer
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

// 4. Funciones Auxiliares

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
    // También verifica el rol para el subtítulo (opcional)
    if (currentPage === 'gestionar-usuario.html') subtitulo = "Gestión de Usuarios";
    h1.textContent = tituloPrincipal;
    p.textContent = subtitulo;
}

/**
 * Verifica el rol del usuario y oculta elementos del menú si no es Admin.
 */
function verificarRolParaNavegacion() {
    // Definimos la ruta a verificarSesion.php
    // Usamos la variable 'cerrarSesionPHP' como referencia para la ruta base
    const verificarSesionURL = cerrarSesionPHP.replace('cerrarSesion.php', 'verificarSesion.php');

    fetch(verificarSesionURL)
        .then(response => response.json())
        .then(data => {
            if (data.loggedin && data.rol !== 'Administrador') {
                // Si está logueado PERO NO es Administrador...
                const navGestionarUsuarios = document.getElementById('nav-gestionar-usuarios');
                if (navGestionarUsuarios) {
                    // Oculta el enlace
                    navGestionarUsuarios.style.display = 'none';
                }
            }
        })
        .catch(error => console.error("Error al verificar rol para nav:", error));
}

function cerrarSesionAdmin() {
    if (confirm('¿Estás seguro de cerrar sesión?')) {
        fetch(cerrarSesionPHP) 
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    localStorage.removeItem('usuarioLogeado'); 
                    window.location.href = loginPageURL; 
                } else {
                    // Fallback por si el servidor responde pero no success
                    localStorage.removeItem('usuarioLogeado'); 
                    window.location.href = loginPageURL;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                // Forzar salida incluso si falla el PHP para que no se quede pegado el usuario
                localStorage.removeItem('usuarioLogeado');
                window.location.href = loginPageURL; 
            });
     }
}

// Crear overlay para cerrar el menú (si no existe ya en el HTML)
const overlay = document.createElement('div');
overlay.className = 'nav-overlay';
overlay.id = 'navOverlay';
document.body.appendChild(overlay);

// Inicializar menú hamburguesa después de cargar el header
setTimeout(function() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mainNav = document.querySelector('.main-nav');
    const navOverlay = document.getElementById('navOverlay');
    
    if (mobileMenuToggle && mainNav) {
        // Toggle del menú
        mobileMenuToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.classList.toggle('active');
            mainNav.classList.toggle('active');
            navOverlay.classList.toggle('active');
            
            // Prevenir scroll del body cuando el menú está abierto
            if (mainNav.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });
        
        // Cerrar menú al hacer click en overlay
        navOverlay.addEventListener('click', function() {
            mainNav.classList.remove('active');
            mobileMenuToggle.classList.remove('active');
            navOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
        
        // Cerrar menú al hacer click en un enlace
        const navLinks = mainNav.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                mainNav.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
                navOverlay.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }
}, 100);

/**
 * Verifica el rol, oculta elementos y MUESTRA DATOS DEL USUARIO EN EL HEADER.
 */
function verificarRolParaNavegacion() {
    const verificarSesionURL = cerrarSesionPHP.replace('cerrarSesion.php', 'verificarSesion.php');

    fetch(verificarSesionURL)
        .then(response => response.json())
        .then(data => {
            if (data.loggedin) {
                
                // 1. Obtener elementos del DOM
                const deskNombre = document.getElementById('deskUserNombre');
                const deskRol = document.getElementById('deskUserRol');
                const movilNombre = document.getElementById('movilUserNombre');
                const movilRol = document.getElementById('movilUserRol');

                // 2. Formatear Nombre (Solo primer nombre para que no ocupe mucho)
                const nombreCompleto = data.nombre || "Usuario";
                const primerNombre = nombreCompleto.split(' ')[0]; 

                // 3. Inyectar en Escritorio
                if(deskNombre) deskNombre.textContent = primerNombre;
                if(deskRol) deskRol.textContent = data.rol;

                // 4. Inyectar en Móvil
                if(movilNombre) movilNombre.textContent = primerNombre;
                if(movilRol) movilRol.textContent = data.rol;

                // 5. Lógica de permisos (Ocultar menú usuarios si no es admin)
                if (data.rol !== 'Administrador') {
                    const navGestionarUsuarios = document.getElementById('nav-gestionar-usuarios');
                    if (navGestionarUsuarios) {
                        navGestionarUsuarios.style.display = 'none';
                    }
                }
            }
        })
        .catch(error => console.error("Error al verificar sesión y datos:", error));
}