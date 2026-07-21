/**
 * InscripcionPausa.js
 * Maneja el flujo de inscripción a Pausas Activas en la parte pública.
 * - Usa delegación de eventos (los botones se crean dinámicamente).
 * - Registro anónimo (no requiere sesión).
 * - Abre modal con facultades, cupos por sexo, y botón "Unirme".
 */

(function () {
    let eventoSeleccionadoId = null;
    let sexoSeleccionado = null; // 'Hombre' o 'Mujer'

    // ─── Delegación de eventos: escuchar clics en botones de sexo ───────────
    document.addEventListener('click', function (e) {
        const btnSexo = e.target.closest('.btn-pausa-sexo');
        if (!btnSexo) return;

        eventoSeleccionadoId = btnSexo.dataset.eventoId;
        sexoSeleccionado     = btnSexo.dataset.sexo; // 'Hombre' o 'Mujer'

        if (!eventoSeleccionadoId || !sexoSeleccionado) return;

        // Indicador visual en el modal
        const labelSexo = document.getElementById('modalPausa-sexoLabel');
        if (labelSexo) {
            labelSexo.textContent = sexoSeleccionado === 'Hombre' ? '♂ Hombre' : '♀ Mujer';
            labelSexo.style.color = sexoSeleccionado === 'Hombre' ? '#1a73e8' : '#e91e8c';
        }

        cargarFacultadesPausa(eventoSeleccionadoId, sexoSeleccionado);
        abrirModalPausa();
    });

    // ─── Cargar facultades con sus cupos ────────────────────────────────────
    function cargarFacultadesPausa(eventoId, sexo) {
        const contenedor = document.getElementById('lista-facultades-pausa');
        if (!contenedor) return;

        contenedor.innerHTML = '<p style="text-align:center;color:#666;padding:20px;">Cargando facultades...</p>';

        fetch(`../php/public/obtenerFacultadesPausa.php?evento_id=${eventoId}`)
            .then(r => r.json())
            .then(data => {
                if (!data.success || !data.facultades || data.facultades.length === 0) {
                    contenedor.innerHTML = '<p style="text-align:center;color:#e53e3e;padding:20px;">No hay facultades configuradas para este evento.</p>';
                    return;
                }

                contenedor.innerHTML = '';

                data.facultades.forEach(fac => {
                    const esHombre   = (sexo === 'Hombre');
                    const ocupados   = esHombre ? fac.ocupados_hombres   : fac.ocupadas_mujeres;
                    const cupo       = esHombre ? fac.cupo_hombres       : fac.cupo_mujeres;
                    const disponible = esHombre ? fac.disponibles_hombres : fac.disponibles_mujeres;
                    const lleno      = disponible <= 0;

                    const porcentaje = cupo > 0 ? Math.round((ocupados / cupo) * 100) : 0;
                    const colorBarra = porcentaje >= 100 ? '#e53e3e' : porcentaje >= 80 ? '#f6ad55' : '#48bb78';

                    const div = document.createElement('div');
                    div.style.cssText = 'background:#f8f9fa;border:1px solid #e2e8f0;border-radius:10px;padding:15px;margin-bottom:12px;';
                    div.innerHTML = `
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                            <strong style="font-size:1rem;color:#1a202c;">${fac.facultad_nombre}</strong>
                            <span style="font-size:0.85rem;color:${lleno ? '#e53e3e' : '#38a169'};font-weight:bold;">
                                ${lleno ? 'LLENO' : `${disponible} disponibles`}
                            </span>
                        </div>
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                            <div style="flex:1;background:#e2e8f0;border-radius:999px;height:8px;overflow:hidden;">
                                <div style="width:${Math.min(porcentaje,100)}%;background:${colorBarra};height:100%;border-radius:999px;transition:width 0.4s;"></div>
                            </div>
                            <span style="font-size:0.85rem;color:#4a5568;white-space:nowrap;">
                                ${ocupados} / ${cupo}
                            </span>
                        </div>
                        <button
                            class="btn-unirme-pausa"
                            data-evento-id="${eventoId}"
                            data-facultad-id="${fac.facultad_id}"
                            data-facultad-nombre="${fac.facultad_nombre}"
                            ${lleno ? 'disabled' : ''}
                            style="width:100%;padding:10px;background:${lleno ? '#a0aec0' : 'linear-gradient(135deg,#006633,#00a651)'};
                                   color:#fff;border:none;border-radius:7px;font-weight:bold;font-size:0.95rem;
                                   cursor:${lleno ? 'not-allowed' : 'pointer'};transition:opacity 0.2s;">
                            ${lleno ? 'Sin espacios disponibles' : 'Unirme a esta facultad'}
                        </button>
                    `;
                    contenedor.appendChild(div);
                });
            })
            .catch(() => {
                contenedor.innerHTML = '<p style="text-align:center;color:#e53e3e;padding:20px;">Error al cargar las facultades. Intenta de nuevo.</p>';
            });
    }

    // ─── Delegación: escuchar clics en botones "Unirme" ─────────────────────
    document.addEventListener('click', function (e) {
        const btnUnirme = e.target.closest('.btn-unirme-pausa');
        if (!btnUnirme || btnUnirme.disabled) return;

        const facultadId     = btnUnirme.dataset.facultadId;
        const facultadNombre = btnUnirme.dataset.facultadNombre;

        if (!eventoSeleccionadoId || !facultadId || !sexoSeleccionado) return;

        ejecutarRegistroPausa(eventoSeleccionadoId, facultadId, sexoSeleccionado, facultadNombre, btnUnirme);
    });

    // ─── Registro en el backend ──────────────────────────────────────────────
    function ejecutarRegistroPausa(eventoId, facultadId, sexo, facultadNombre, btnOrigen) {
        btnOrigen.disabled     = true;
        btnOrigen.textContent  = 'Registrando...';

        const formData = new URLSearchParams();
        formData.append('evento_id',   eventoId);
        formData.append('facultad_id', facultadId);
        formData.append('sexo',        sexo);

        fetch('../php/public/inscribirPausaActiva.php', {
            method: 'POST',
            body: formData
        })
        .then(r => r.json())
        .then(data => {
            cerrarModalPausa();
            if (data.success) {
                mostrarToast(`✅ ¡Registro exitoso! Quedaste anotado en <strong>${facultadNombre}</strong> como ${sexo}.`, 'success');
                // Recargar los datos de la tarjeta sin recargar página completa
                cargarFacultadesPausa(eventoId, sexo);
            } else {
                mostrarToast(`⚠️ ${data.message || 'Error al registrarse.'}`, 'error');
                btnOrigen.disabled    = false;
                btnOrigen.textContent = 'Unirme a esta facultad';
            }
        })
        .catch(() => {
            cerrarModalPausa();
            mostrarToast('❌ Error de conexión. Intenta de nuevo.', 'error');
            btnOrigen.disabled    = false;
            btnOrigen.textContent = 'Unirme a esta facultad';
        });
    }

    // ─── Modal de facultades ─────────────────────────────────────────────────
    function abrirModalPausa() {
        const modal = document.getElementById('modalFacultadesPausa');
        if (!modal) return;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function cerrarModalPausa() {
        const modal = document.getElementById('modalFacultadesPausa');
        if (!modal) return;
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    // ─── Toast de notificación ───────────────────────────────────────────────
    function mostrarToast(html, tipo) {
        const toast = document.createElement('div');
        const bg = tipo === 'success' ? '#276749' : '#9b2335';
        toast.innerHTML = html;
        toast.style.cssText = `
            position:fixed; bottom:30px; right:30px; z-index:999999;
            background:${bg}; color:#fff; padding:16px 22px; border-radius:10px;
            box-shadow:0 4px 20px rgba(0,0,0,0.25); font-size:0.95rem;
            max-width:340px; line-height:1.4;
            animation: slideInToast 0.4s ease forwards;
        `;
        if (!document.getElementById('toastStylePausa')) {
            const style = document.createElement('style');
            style.id = 'toastStylePausa';
            style.textContent = `@keyframes slideInToast { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }`;
            document.head.appendChild(style);
        }
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4500);
    }

    // ─── Inicializar botones de cerrar modal ─────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        const modal = document.getElementById('modalFacultadesPausa');
        if (!modal) return;

        // Botón X
        const btnCerrar = modal.querySelector('.btn-cerrar-modal-pausa');
        if (btnCerrar) btnCerrar.addEventListener('click', cerrarModalPausa);

        // Clic en fondo oscuro
        modal.addEventListener('click', function (e) {
            if (e.target === modal) cerrarModalPausa();
        });
    });

})();