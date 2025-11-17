// public/js/admin/gestUsuarios.js
import { mostrarMensaje } from '../utils/utilidades.js';

// === VARIABLES GLOBALES ===
let todosLosUsuarios = [];
let modoEdicion = false;
let editandoId = null;

// === INICIALIZACIÓN ===
document.addEventListener('DOMContentLoaded', () => {
    cargarUsuarios();
    configurarListeners();
});

function configurarListeners() {
    document.getElementById('btnNuevoUsuario').addEventListener('click', prepararModalParaCrear);
    document.getElementById('btnCancelar').addEventListener('click', cerrarModal);
    document.getElementById('btnCerrarModalX').addEventListener('click', cerrarModal);
    document.getElementById('formUsuario').addEventListener('submit', guardarUsuario);
    
    // --- NUEVO LISTENER AÑADIDO ---
    document.getElementById('btnEliminarPermanente').addEventListener('click', handleEliminarPermanenteClick);
    
    // Listener para la lista (delegación de eventos)
    document.getElementById('lista-usuarios').addEventListener('click', handleListaClick);
}

// === FUNCIONES PRINCIPALES ===

async function cargarUsuarios() {
    try {
        const response = await fetch('../../php/admin/obtenerUsuarios.php');
        const data = await response.json();

        if (data.success) {
            todosLosUsuarios = data.usuarios;
            mostrarUsuarios(todosLosUsuarios);
        } else {
            mostrarMensaje(data.mensaje, 'error');
            if (response.status === 403) {
                setTimeout(() => window.location.href = 'admin.html', 2000);
            }
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

    container.innerHTML = ''; // Limpiar
    usuarios.forEach(user => {
        
        // --- LÓGICA DE BOTONES DINÁMICOS ---
        let botonAccion = '';
        let estadoLabel = '';
        let colorBorde = user.rol === 'Administrador' ? '#f9b233' : '#003366';

        if (user.activo == 1) {
            // Usuario ACTIVO
            estadoLabel = `<span style="font-weight: bold; color: #28a745;">Activo</span>`;
            botonAccion = `<button class="btn-eliminar-usuario" data-id="${user.id}" data-nombre="${user.nombre}" style="padding: 8px 15px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Desactivar</button>`;
        } else {
            // Usuario INACTIVO
            estadoLabel = `<span style="font-weight: bold; color: #6c757d;">Inactivo</span>`;
            botonAccion = `<button class="btn-reactivar-usuario" data-id="${user.id}" data-nombre="${user.nombre}" style="padding: 8px 15px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Reactivar</button>`;
            colorBorde = '#6c757d'; // Gris si está inactivo
        }
        // --- FIN LÓGICA DE BOTONES ---

        container.innerHTML += `
            <div class="evento-card" style="background: white; padding: 20px; margin: 15px 0; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); border-left: 4px solid ${colorBorde};">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <h3 style="margin: 0 0 10px 0; color: #003366;">${user.apellido_paterno} ${user.apellido_materno || ''} ${user.nombre}</h3>
                        <p style="margin: 5px 0; color: #666;"><strong>Correo:</strong> ${user.correo}</p>
                        <p style="margin: 5px 0; color: #666;"><strong>Matrícula:</strong> ${user.matricula}</p>
                        <p style="margin: 5px 0; color: #666;"><strong>Rol:</strong> <span style="font-weight: bold; color: ${user.rol === 'Administrador' ? '#f9b233' : '#003366'};">${user.rol}</span></p>
                        <p style="margin: 5px 0; color: #666;"><strong>Estado:</strong> ${estadoLabel}</p>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 10px; margin-left: 20px;">
                        <button class="btn-editar-usuario" data-id="${user.id}" style="padding: 8px 15px; background: #ffc107; color: #333; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Editar</button>
                        ${botonAccion}
                    </div>
                </div>
            </div>
        `;
    });
}

async function guardarUsuario(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    if (modoEdicion && editandoId) {
        formData.append('id', editandoId);
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
        const response = await fetch('../../php/admin/crearUsuario.php', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            mostrarMensaje(data.mensaje, 'success');
            cerrarModal();
            cargarUsuarios(); // Recargar la lista
        } else {
            mostrarMensaje(data.mensaje, 'error');
        }
    } catch (error) {
        mostrarMensaje('Error de conexión al guardar', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Guardar Usuario';
    }
}

function handleListaClick(e) {
    const target = e.target;
    const id = target.dataset.id;
    const nombre = target.dataset.nombre;

    if (target.classList.contains('btn-eliminar-usuario')) {
        if (confirm(`¿Estás seguro de DESACTIVAR al usuario "${nombre}"?`)) {
            eliminarUsuario(id); // Llama al (soft delete)
        }
    }
    
    if (target.classList.contains('btn-reactivar-usuario')) {
        if (confirm(`¿Estás seguro de REACTIVAR al usuario "${nombre}"?`)) {
            reactivarUsuario(id);
        }
    }
    
    if (target.classList.contains('btn-editar-usuario')) {
        prepararModalParaEditar(id);
    }
}

// --- NUEVO HANDLER ---
function handleEliminarPermanenteClick() {
    const nombre = document.getElementById('usuario-nombre').value;
    if (!modoEdicion || !editandoId) return;

    // Doble confirmación
    if (confirm(`ADVERTENCIA: Estás a punto de eliminar permanentemente a "${nombre}". Esta acción no se puede deshacer.\n\n¿Estás seguro?`)) {
        if (confirm(`SEGUNDA CONFIRMACIÓN: ¿Realmente deseas BORRAR a "${nombre}" de la base de datos?`)) {
            eliminarUsuarioPermanente(editandoId);
        }
    }
}

async function eliminarUsuario(id) { // (Soft Delete)
    try {
        const response = await fetch('../../php/admin/desactivarUsuario.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        });
        const data = await response.json();
        
        mostrarMensaje(data.mensaje, data.success ? 'success' : 'error');
        
        if (data.success) {
            cargarUsuarios(); // Recargar la lista
        }
    } catch (error) {
        mostrarMensaje('Error de conexión al desactivar', 'error');
    }
}

async function reactivarUsuario(id) {
    try {
        const response = await fetch('../../php/admin/reactivarUsuario.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        });
        const data = await response.json();
        
        mostrarMensaje(data.mensaje, data.success ? 'success' : 'error');
        
        if (data.success) {
            cargarUsuarios(); // Recargar la lista
        }
    } catch (error) {
        mostrarMensaje('Error de conexión al reactivar', 'error');
    }
}

// --- NUEVA FUNCIÓN ---
async function eliminarUsuarioPermanente(id) {
    try {
        const response = await fetch('../../php/admin/eliminarUsuarios.php', { // <-- Nuevo endpoint
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        });
        const data = await response.json();
        
        mostrarMensaje(data.mensaje, data.success ? 'success' : 'error');
        
        if (data.success) {
            cerrarModal(); // Cerrar el modal de edición
            cargarUsuarios(); // Recargar la lista
        }
    } catch (error) {
        mostrarMensaje('Error de conexión al eliminar permanentemente', 'error');
    }
}


// === FUNCIONES DEL MODAL ===

function prepararModalParaCrear() {
    modoEdicion = false;
    editandoId = null;
    document.getElementById('formUsuario').reset();
    document.getElementById('tituloModal').textContent = 'Crear Nuevo Usuario';
    document.getElementById('password-required').style.display = 'inline';
    document.querySelector('.help-text').style.display = 'none';
    document.getElementById('usuario-password').required = true;
    
    // Oculta la zona peligrosa
    document.getElementById('danger-zone').style.display = 'none';
    
    abrirModal();
}

function prepararModalParaEditar(id) {
    const usuario = todosLosUsuarios.find(u => u.id == id);
    if (!usuario) return;

    modoEdicion = true;
    editandoId = id;
    
    document.getElementById('tituloModal').textContent = 'Editar Usuario';
    document.getElementById('usuario-id').value = usuario.id;
    document.getElementById('usuario-nombre').value = usuario.nombre;
    document.getElementById('usuario-paterno').value = usuario.apellido_paterno;
    document.getElementById('usuario-materno').value = usuario.apellido_materno || '';
    document.getElementById('usuario-matricula').value = usuario.matricula;
    document.getElementById('usuario-correo').value = usuario.correo;
    document.getElementById('usuario-rol').value = usuario.rol;
    
    // Contraseña
    document.getElementById('password-required').style.display = 'none';
    document.querySelector('.help-text').style.display = 'block';
    document.getElementById('usuario-password').value = '';
    document.getElementById('usuario-password').required = false;

    // Muestra la zona peligrosa
    document.getElementById('danger-zone').style.display = 'block';

    abrirModal();
}

function abrirModal() {
    document.getElementById('modalUsuario').style.display = 'flex';
}

function cerrarModal() {
    document.getElementById('modalUsuario').style.display = 'none';
}