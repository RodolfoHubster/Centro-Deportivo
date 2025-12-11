// public/js/admin/gestUsuarios.js
import { mostrarMensaje } from '../utils/utilidades.js';

let todosLosUsuarios = [];
let modoEdicion = false;
let editandoId = null;

document.addEventListener('DOMContentLoaded', () => {
    cargarUsuarios();
    configurarListeners();
});

function configurarListeners() {
    const modal = document.getElementById('modalUsuario');

    // Botones existentes
    document.getElementById('btnNuevoUsuario').addEventListener('click', prepararModalParaCrear);
    document.getElementById('btnCancelar').addEventListener('click', cerrarModal); // Este es el botón "Cancelar" explícito (podemos hacer que este sí borre el formulario si quieres)
    document.getElementById('btnCerrarModalX').addEventListener('click', cerrarModal);
    document.getElementById('formUsuario').addEventListener('submit', guardarUsuario);
    document.getElementById('btnEliminarPermanente').addEventListener('click', handleEliminarPermanenteClick);
    document.getElementById('lista-usuarios').addEventListener('click', handleListaClick);

    // --- CERRAR AL DAR CLICK AFUERA ---
    window.addEventListener('click', (e) => {
        // Si el elemento clickeado es el fondo oscuro (modalUsuario) y no el contenido blanco
        if (e.target === modal) {
            cerrarModal(); // Cierra sin borrar los datos
        }
    });

    // --- CERRAR CON TECLA ESC ---
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            cerrarModal(); // Cierra sin borrar los datos
        }
    });
}

// === Función para mostrar el modal de éxito dinámico ===
function mostrarModalExitoUsuario(titulo, mensajeDetalle, onAceptarCallback = null) {
    const modal = document.getElementById('modalExitoGlobal');
    if (!modal) {
        // Fallback: usar el mensaje normal si el modal no se encuentra
        return mostrarMensaje(titulo + ' - ' + mensajeDetalle, 'success'); 
    } 

    const tituloEl = document.getElementById('tituloExito');
    const mensajeEl = document.getElementById('mensajeExito');
    const btnAceptar = document.getElementById('btnAceptarExito');

    tituloEl.textContent = titulo;
    mensajeEl.innerHTML = mensajeDetalle;

    modal.style.display = 'flex'; // Mostrar el modal

    const cerrarModal = () => {
        modal.style.display = 'none';
        
        if (onAceptarCallback && typeof onAceptarCallback === 'function') {
            onAceptarCallback();
        }

        btnAceptar.removeEventListener('click', cerrarModal);
        modal.removeEventListener('click', cerrarFueraDeContenido);
    };
    
    // Listener para cerrar al hacer clic fuera del contenido
    const cerrarFueraDeContenido = (e) => {
        if (e.target === modal) {
            cerrarModal();
        }
    }
    
    // Asignar listeners
    btnAceptar.addEventListener('click', cerrarModal);
    modal.addEventListener('click', cerrarFueraDeContenido);
}

async function cargarUsuarios() {
    try {
        const response = await fetch('../../php/admin/obtenerUsuarios.php');
        const data = await response.json();

        if (data.success) {
            todosLosUsuarios = data.usuarios;
            mostrarUsuarios(todosLosUsuarios);
        } else {
            mostrarMensaje(data.mensaje, 'error');
        }
    } catch (error) {
        mostrarMensaje('Error de conexión al cargar usuarios', 'error');
    }
}

function mostrarUsuarios(usuarios) {
    const container = document.getElementById('lista-usuarios');
    if (usuarios.length === 0) {
        container.innerHTML = '<p style="text-align: center;">No hay usuarios promotores o administradores.</p>';
        return;
    }

    container.innerHTML = ''; 
    usuarios.forEach(user => {
        
        // 1. Lógica de Roles y Colores
        let colorRol = user.rol === 'Administrador' ? '#f9b233' : '#003366'; 
        let estadoLabel = '';
        let botonAccion = '';

        if (user.activo == 0) {
            colorRol = '#6c757d'; 
            estadoLabel = `<span style="font-weight: bold; color: #6c757d;">Inactivo</span>`;
            // Botón REACTIVAR (Verde forzado)
            botonAccion = `<button class="btn-reactivar-usuario" data-id="${user.id}" data-nombre="${user.nombre}" style="background-color: #28a745 !important; color: white !important;">Reactivar</button>`;
        } else {
            estadoLabel = `<span style="font-weight: bold; color: #28a745;">Activo</span>`;
            // Botón DESACTIVAR (Rojo forzado)
            botonAccion = `<button class="btn-eliminar-usuario" data-id="${user.id}" data-nombre="${user.nombre}" style="background-color: #dc3545 !important; color: white !important;">Desactivar</button>`;
        }

        // 2. Generar HTML
        container.innerHTML += `
            <div class="usuario-card" style="--color-rol: ${colorRol};">
                
                <div class="info-usuario">
                    <h3 style="color: #003366;">${user.apellido_paterno} ${user.apellido_materno || ''} ${user.nombre}</h3>
                    <p><strong>Correo:</strong> ${user.correo}</p>
                    <p><strong>Matrícula:</strong> ${user.matricula}</p>
                    <p><strong>Rol:</strong> <span style="font-weight: bold; color: var(--color-rol);">${user.rol}</span></p>
                    <p><strong>Estado:</strong> ${estadoLabel}</p>
                </div>

                <div class="acciones-usuario">
                    <button class="btn-editar-usuario" data-id="${user.id}" style="background-color: #ffc107 !important; color: #333 !important;">Editar</button>
                    ${botonAccion}
                </div>

            </div>
        `;
    });
}

// ... (MANTÉN EL RESTO DE TUS FUNCIONES: guardarUsuario, handleListaClick, etc. IGUAL QUE ANTES)
// Solo asegúrate de cerrar la llave de la función mostrarUsuarios antes de pegar el resto.

async function guardarUsuario(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    // Si estamos en modo edición, adjuntamos el ID del usuario
    if (modoEdicion && editandoId) {
        formData.append('id', editandoId);
    }

    try {
        const response = await fetch('../../php/admin/crearUsuario.php', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            // OBTENER EL NOMBRE DEL USUARIO
            const nombreCompleto = `${formData.get('nombre')} ${formData.get('apellido_paterno')} ${formData.get('apellido_materno') || ''}`.trim();
            
            const operacion = modoEdicion ? '¡Operación Exitosa!' : '¡Operación Exitosa!';
            const mensajeDetalle = modoEdicion 
                ? `El usuario <strong>${nombreCompleto}</strong> se actualizó correctamente.`
                : `El usuario <strong>${nombreCompleto}</strong> se creó correctamente.`;
            
            cerrarModal();
            form.reset(); 
            
            mostrarModalExitoUsuario(operacion, mensajeDetalle, cargarUsuarios); 
        } else {
            mostrarMensaje(data.mensaje, 'error');
        }
    } catch (error) {
        mostrarMensaje('Error de conexión al guardar', 'error');
    }
}

function handleListaClick(e) {
    const target = e.target;
    const id = target.dataset.id;
    const nombre = target.dataset.nombre;

    if (target.classList.contains('btn-eliminar-usuario')) {
        if (confirm(`¿Desactivar a "${nombre}"?`)) eliminarUsuario(id);
    }
    if (target.classList.contains('btn-reactivar-usuario')) {
        if (confirm(`¿Reactivar a "${nombre}"?`)) reactivarUsuario(id);
    }
    if (target.classList.contains('btn-editar-usuario')) {
        prepararModalParaEditar(id);
    }
}

function handleEliminarPermanenteClick() {
    const nombre = document.getElementById('usuario-nombre').value;
    if (confirm(`¿Eliminar PERMANENTEMENTE a "${nombre}"?`)) {
        eliminarUsuarioPermanente(editandoId);
    }
}

async function eliminarUsuario(id) {
    // OBTENER EL NOMBRE DEL USUARIO ANTES DE DESACTIVAR
    const usuario = todosLosUsuarios.find(u => u.id == id);
    const nombreCompleto = usuario ? `${usuario.nombre} ${usuario.apellido_paterno} ${usuario.apellido_materno || ''}`.trim() : 'el usuario';
    
    const response = await fetch('../../php/admin/desactivarUsuario.php', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({id}) 
    });
    const data = await response.json();
    
    if (data.success) {
        const mensajeDetalle = `El usuario <strong>${nombreCompleto}</strong> se desactivó correctamente.`;
        mostrarModalExitoUsuario('¡Operación Exitosa!', mensajeDetalle, cargarUsuarios);
    } else {
        mostrarMensaje(data.mensaje, 'error');
    }
}

async function reactivarUsuario(id) {
    // OBTENER EL NOMBRE DEL USUARIO ANTES DE REACTIVAR
    const usuario = todosLosUsuarios.find(u => u.id == id);
    const nombreCompleto = usuario ? `${usuario.nombre} ${usuario.apellido_paterno} ${usuario.apellido_materno || ''}`.trim() : 'el usuario';
    
    const response = await fetch('../../php/admin/reactivarUsuario.php', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({id}) 
    });
    const data = await response.json();
    
    if (data.success) {
        const mensajeDetalle = `El usuario <strong>${nombreCompleto}</strong> se reactivó correctamente.`;
        mostrarModalExitoUsuario('¡Operación Exitosa!', mensajeDetalle, cargarUsuarios);
    } else {
        mostrarMensaje(data.mensaje, 'error');
    }
}

async function eliminarUsuarioPermanente(id) {
    // OBTENER EL NOMBRE DEL USUARIO ANTES DE ELIMINAR
    const usuario = todosLosUsuarios.find(u => u.id == id);
    const nombreCompleto = usuario ? `${usuario.nombre} ${usuario.apellido_paterno} ${usuario.apellido_materno || ''}`.trim() : 'el usuario';
    
    const response = await fetch('../../php/admin/eliminarUsuarios.php', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({id}) 
    });
    const data = await response.json();
    
    if (data.success) {
        const mensajeDetalle = `El usuario <strong>${nombreCompleto}</strong> se eliminó permanentemente.`;
        cerrarModal();
        mostrarModalExitoUsuario('¡Operación Exitosa!', mensajeDetalle, cargarUsuarios);
    } else {
        mostrarMensaje(data.mensaje, 'error');
    }
}

// public/js/admin/gestUsuarios.js

function prepararModalParaCrear() {
    // 1. LÓGICA INTELIGENTE:
    // Si venimos de "Editar" (modoEdicion === true), limpiamos el formulario para empezar de cero.
    // Si ya estábamos en "Crear" (modoEdicion === false), NO limpiamos para no perder datos si cerraste por error.
    if (modoEdicion === true) {
        document.getElementById('formUsuario').reset();
        document.getElementById('usuario-id').value = ''; // Aseguramos borrar el ID oculto
    }

    // 2. Configurar el estado para CREAR
    modoEdicion = false;
    editandoId = null;
    
    document.getElementById('tituloModal').textContent = 'Crear Nuevo Usuario';
    
    // Configuración de contraseña obligatoria para nuevos usuarios
    const passReq = document.getElementById('password-required');
    if(passReq) passReq.style.display = 'inline';
    
    const helpText = document.querySelector('.help-text');
    if(helpText) helpText.style.display = 'none';
    
    const passInput = document.getElementById('usuario-password');
    if(passInput) passInput.required = true;
    
    // Ocultar zona de peligro
    const dangerZone = document.getElementById('danger-zone');
    if(dangerZone) dangerZone.style.display = 'none';
    
    abrirModal();
}

function prepararModalParaEditar(id) {
    const usuario = todosLosUsuarios.find(u => u.id == id);
    if (!usuario) return;
    modoEdicion = true;
    editandoId = id;
    document.getElementById('tituloModal').textContent = 'Editar Usuario';
    document.getElementById('usuario-nombre').value = usuario.nombre;
    document.getElementById('usuario-paterno').value = usuario.apellido_paterno;
    document.getElementById('usuario-materno').value = usuario.apellido_materno;
    document.getElementById('usuario-matricula').value = usuario.matricula;
    document.getElementById('usuario-correo').value = usuario.correo;
    document.getElementById('usuario-rol').value = usuario.rol;
    document.getElementById('danger-zone').style.display = 'block';
    abrirModal();
}

function abrirModal() { document.getElementById('modalUsuario').style.display = 'flex'; }
function cerrarModal() { document.getElementById('modalUsuario').style.display = 'none'; }