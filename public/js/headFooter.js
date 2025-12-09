// 1. Definimos las variables al principio para que sean accesibles en todo el archivo
const isAdminPage = window.location.pathname.includes('/admin/');

// RUTAS (Definidas globalmente)
const headerURL = isAdminPage ? '../includes/header.html' : 'includes/header.html';
const footerURL = isAdminPage ? '../includes/footer.html' : 'includes/footer.html';
const headerAdminURL = isAdminPage ? '../includes/headerAdmin.html' : 'includes/headerAdmin.html';

// Rutas de PHP
const cerrarSesionPHP = isAdminPage ? '../../php/admin/cerrarSesion.php' : '../php/admin/cerrarSesion.php';
const loginPageURL = isAdminPage ? '../login.html' : 'login.html';

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
            // A. Insertamos el HTML
            headerPlaceholder.innerHTML = html;

            // B. ¡AQUÍ ES EL MOMENTO SEGURO! Inicializamos el menú ahora que ya existe el HTML
            initMenuHamburguesa();

            // C. Lógica específica de admin
            if (isAdminPage) {
                ajustarTituloAdminHeader();
                verificarRolParaNavegacion();
                inicializarLogout(); // Movi la lógica de logout a una función para limpiar
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

// ==========================================
// 4. FUNCIONES AUXILIARES
// ==========================================

/* Inicializa la lógica del botón hamburguesa (Móvil) */
function initMenuHamburguesa() {
    // Buscamos los elementos AHORA (ya existen en el DOM)
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle'); // Usamos clase o ID, asegúrate que coincida con tu HTML
    const mainNav = document.querySelector('.main-nav');
    
    // Creamos o buscamos el overlay
    let navOverlay = document.getElementById('navOverlay');
    if (!navOverlay) {
        navOverlay = document.createElement('div');
        navOverlay.className = 'nav-overlay';
        navOverlay.id = 'navOverlay';
        document.body.appendChild(navOverlay);
    }
    
    if (mobileMenuToggle && mainNav) {
        // 1. Abrir/Cerrar al dar click en el botón
        mobileMenuToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation(); // Evita que el click se propague
            
            this.classList.toggle('active');
            mainNav.classList.toggle('active');
            navOverlay.classList.toggle('active');
            
            // Bloquear scroll del fondo
            if (mainNav.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });
        
        // 2. Cerrar al dar click en el fondo oscuro (Overlay)
        navOverlay.addEventListener('click', function() {
            cerrarMenuMovil(mobileMenuToggle, mainNav, navOverlay);
        });
        
        // 3. Cerrar al dar click en cualquier enlace del menú
        const navLinks = mainNav.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                cerrarMenuMovil(mobileMenuToggle, mainNav, navOverlay);
            });
        });
    } else {
        console.warn("No se encontró el botón .mobile-menu-toggle o el menú .main-nav");
    }
}

/* Helper para cerrar el menú limpiamente */
function cerrarMenuMovil(btn, menu, overlay) {
    if(btn) btn.classList.remove('active');
    if(menu) menu.classList.remove('active');
    if(overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

function inicializarLogout() {
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
            // Cerramos menú visualmente
            const mainNav = document.querySelector('.main-nav');
            const toggle = document.querySelector('.mobile-menu-toggle');
            const navOverlay = document.getElementById('navOverlay');
            cerrarMenuMovil(toggle, mainNav, navOverlay);
            
            cerrarSesionAdmin();
        });
    }
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
    if (currentPage === 'gestionar-usuario.html') subtitulo = "Gestión de Usuarios";
    h1.textContent = tituloPrincipal;
    p.textContent = subtitulo;
}

/* Verifica el rol, oculta elementos y MUESTRA DATOS DEL USUARIO EN EL HEADER.*/
function verificarRolParaNavegacion() {
    const verificarSesionURL = cerrarSesionPHP.replace('cerrarSesion.php', 'verificarSesion.php');

    fetch(verificarSesionURL)
        .then(response => {
            if (!response.ok) throw new Error("Error de red");
            return response.json();
        })
        .then(data => {
            if (data.loggedin) {
                
                // A. Obtener elementos del DOM
                const deskNombre = document.getElementById('deskUserNombre');
                const deskRol = document.getElementById('deskUserRol');
                const movilNombre = document.getElementById('movilUserNombre');
                const movilRol = document.getElementById('movilUserRol');

                // B. Formatear Nombre (Solo primer nombre para que no ocupe mucho)
                const nombreCompleto = data.nombre || "Usuario";
                const primerNombre = nombreCompleto.split(' ')[0]; 

                // C. Inyectar en Escritorio
                if(deskNombre) deskNombre.textContent = primerNombre;
                if(deskRol) deskRol.textContent = data.rol;

                // D. Inyectar en Móvil
                if(movilNombre) movilNombre.textContent = primerNombre;
                if(movilRol) movilRol.textContent = data.rol;

                // E. Lógica de permisos (Ocultar menú si no es admin)
                if (data.rol !== 'Administrador') {
                    const navGestionarUsuarios = document.getElementById('nav-gestionar-usuarios');
                    if (navGestionarUsuarios) navGestionarUsuarios.style.display = 'none';
                    
                    const navGestionarPeriodos = document.getElementById('nav-gestionar-periodos');
                    if (navGestionarPeriodos) navGestionarPeriodos.style.display = 'none';
                }

            } else {
                // Si estamos en una página de admin, sacamos al usuario inmediatamente.
                if (isAdminPage) {
                    alert(data.mensaje || "Tu sesión ha expirado o se ha iniciado en otro lugar.");
                    window.location.href = loginPageURL;
                }
            }
        })
        .catch(error => {
            console.error("Error al verificar sesión y datos:", error);
        });
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
                    localStorage.removeItem('usuarioLogeado'); 
                    window.location.href = loginPageURL;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                localStorage.removeItem('usuarioLogeado');
                window.location.href = loginPageURL; 
            });
     }
}