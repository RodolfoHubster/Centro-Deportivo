// public/js/headFooter.js

// 1. Definimos las variables al principio
const isAdminPage = window.location.pathname.includes('/admin/');

// --- RUTAS ---
const headerURL = isAdminPage ? '../includes/header.html' : 'includes/header.html';
const footerURL = isAdminPage ? '../includes/footer.html' : 'includes/footer.html';
const headerAdminURL = isAdminPage ? '../includes/headerAdmin.html' : 'includes/headerAdmin.html';
const cerrarSesionPHP = isAdminPage ? '../../php/admin/cerrarSesion.php' : '../php/admin/cerrarSesion.php';
const loginPageURL = isAdminPage ? '../login.html' : 'login.html';

// 2. Lógica del Header
const headerPlaceholder = document.getElementById('header-placeholder');

if (headerPlaceholder) {
    const urlToFetch = isAdminPage ? headerAdminURL : headerURL;

    fetch(urlToFetch)
        .then(response => {
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            return response.text();
        })
        .then(html => {
            headerPlaceholder.innerHTML = html;
            
            // === CORRECCIÓN CLAVE AQUÍ ===
            // Inicializamos el menú JUSTO AHORA que sabemos que el HTML existe
            inicializarMenuMovil(); 

            if (isAdminPage) {
                ajustarTituloAdminHeader();
                verificarRolParaNavegacion();
                configurarBotonesLogout();
            }
        })
        .catch(error => {
            console.error('Error al cargar el header:', error);
        });
}

// 3. Lógica del Footer
const footerPlaceholder = document.getElementById('footer-placeholder');
if (footerPlaceholder) {
    fetch(footerURL)
        .then(r => r.text())
        .then(html => footerPlaceholder.innerHTML = html)
        .catch(e => console.error('Error footer:', e));
}

// ==========================================
// 4. FUNCIONES (Organizadas y Seguras)
// ==========================================

function inicializarMenuMovil() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mainNav = document.querySelector('.main-nav'); // O usa ID si lo tienes: document.getElementById('mainNav')
    
    // Si no existe el overlay en el HTML, lo creamos dinámicamente
    let navOverlay = document.getElementById('navOverlay');
    if (!navOverlay) {
        navOverlay = document.createElement('div');
        navOverlay.className = 'nav-overlay';
        navOverlay.id = 'navOverlay';
        document.body.appendChild(navOverlay);
    }

    if (mobileMenuToggle && mainNav) {
        // Usamos 'click' (funciona bien en iOS si el elemento es <button> o <a>)
        mobileMenuToggle.addEventListener('click', function(e) {
            e.stopPropagation(); // Evita que el click se propague al document
            
            this.classList.toggle('active');
            mainNav.classList.toggle('active');
            navOverlay.classList.toggle('active');
            
            // Bloquear scroll del fondo
            document.body.style.overflow = mainNav.classList.contains('active') ? 'hidden' : '';
        });

        // Cerrar al dar click en el overlay (fondo oscuro)
        navOverlay.addEventListener('click', function() {
            cerrarMenuMovil(mobileMenuToggle, mainNav, navOverlay);
        });

        // Cerrar al dar click en cualquier enlace del menú
        const navLinks = mainNav.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                cerrarMenuMovil(mobileMenuToggle, mainNav, navOverlay);
            });
        });
    }
}

function cerrarMenuMovil(btn, nav, overlay) {
    btn.classList.remove('active');
    nav.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

function configurarBotonesLogout() {
    // 1. Escritorio
    const btnLogoutHeader = document.getElementById('btnCerrarSesion');
    if (btnLogoutHeader) {
        btnLogoutHeader.addEventListener('click', (e) => {
            e.preventDefault();
            cerrarSesionAdmin();
        });
    }
    // 2. Móvil
    const btnLogoutMovil = document.getElementById('btnCerrarSesionMovil');
    if (btnLogoutMovil) {
        btnLogoutMovil.addEventListener('click', (e) => {
            e.preventDefault();
            cerrarMenuMovil(
                document.getElementById('mobileMenuToggle'), 
                document.querySelector('.main-nav'), 
                document.getElementById('navOverlay')
            );
            cerrarSesionAdmin();
        });
    }
}

function ajustarTituloAdminHeader() {
    const headerTitleDiv = document.querySelector('#header-placeholder .main-header .title');
    if (!headerTitleDiv) return;
    const h1 = headerTitleDiv.querySelector('h1');
    const p = headerTitleDiv.querySelector('p');
    
    // ... (Tu lógica existente para títulos) ...
    // Puedes copiar tu switch case original aquí si lo necesitas
}

function verificarRolParaNavegacion() {
    // Definimos la ruta a verificarSesion.php
    const verificarSesionURL = cerrarSesionPHP.replace('cerrarSesion.php', 'verificarSesion.php');

    fetch(verificarSesionURL)
        .then(response => response.json())
        .then(data => {
            if (data.loggedin) {
                // Inyectar datos de usuario (Nombre y Rol)
                const deskNombre = document.getElementById('deskUserNombre');
                const deskRol = document.getElementById('deskUserRol');
                const movilNombre = document.getElementById('movilUserNombre');
                const movilRol = document.getElementById('movilUserRol');

                const primerNombre = (data.nombre || "Usuario").split(' ')[0]; 

                if(deskNombre) deskNombre.textContent = primerNombre;
                if(deskRol) deskRol.textContent = data.rol;
                if(movilNombre) movilNombre.textContent = primerNombre;
                if(movilRol) movilRol.textContent = data.rol;

                // Ocultar menú usuarios si no es admin
                if (data.rol !== 'Administrador') {
                    const navUsuarios = document.getElementById('nav-gestionar-usuarios');
                    if (navUsuarios) navUsuarios.style.display = 'none';
                    
                    const navPeriodos = document.getElementById('nav-gestionar-periodos');
                    if (navPeriodos) navPeriodos.style.display = 'none';
                }
            }
        })
        .catch(error => console.error("Error sesión:", error));
}

function cerrarSesionAdmin() {
    if (confirm('¿Estás seguro de cerrar sesión?')) {
        fetch(cerrarSesionPHP) 
            .then(r => r.json())
            .then(data => {
                localStorage.removeItem('usuarioLogeado'); 
                window.location.href = loginPageURL; 
            })
            .catch(error => {
                localStorage.removeItem('usuarioLogeado');
                window.location.href = loginPageURL; 
            });
     }
}