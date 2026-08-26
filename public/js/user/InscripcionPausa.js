/**
 * InscripcionPausa.js
 * Maneja el flujo de inscripción a Pausas Activas en la parte pública.
 * - Usa delegación de eventos (los botones se crean dinámicamente).
 * - Registro anónimo (no requiere sesión).
 * - Abre modal con facultades, carreras y botón "Unirme".
 *   No muestra cupos ni numero de inscritos: es informacion interna.
 */

(function () {
    let eventoSeleccionadoId = null;
    let sexoSeleccionado = null; // 'Hombre' o 'Mujer'

    // ─── Función Global para iniciar el flujo ───────────
    window.abrirFlujoPausa = function(eventoId, sexo) {
        if (!eventoId || !sexo) return;
        
        eventoSeleccionadoId = eventoId;
        sexoSeleccionado = sexo;

        // Indicador visual en el modal
        const labelSexo = document.getElementById('modalPausa-sexoLabel');
        if (labelSexo) {
            labelSexo.textContent = sexoSeleccionado === 'Hombre' ? '♂ Hombre' : '♀ Mujer';
            labelSexo.style.color = sexoSeleccionado === 'Hombre' ? '#1a73e8' : '#e91e8c';
        }

        reiniciarBuscador();
        cargarFacultadesPausa(eventoSeleccionadoId, sexoSeleccionado);
        precargarCarreras(eventoSeleccionadoId);
        abrirModalPausa();
    };

    // ─── Buscador de carreras ─────────────────────────────────
    /* Guardamos TODAS las carreras del evento una sola vez para poder filtrar
       al instante, sin pedirle al servidor en cada tecla ni obligar al usuario
       a adivinar en que facultad esta su carrera. */
    let carrerasDelEvento = [];

    function precargarCarreras(eventoId) {
        carrerasDelEvento = [];
        fetch(`../php/public/obtenerCarrerasPausa.php?evento_id=${eventoId}`)
            .then(r => r.json())
            .then(data => { if (data.success) carrerasDelEvento = data.carreras || []; })
            .catch(() => { /* sin precarga el buscador queda inactivo; las
                              facultades siguen funcionando normalmente */ });
    }

    /* Minusculas y sin acentos, para que "matematicas" encuentre "Matemáticas" */
    function normalizar(texto) {
        return String(texto || '')
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .toLowerCase().trim();
    }

    function reiniciarBuscador() {
        const campo = document.getElementById('buscarCarreraPausa');
        const info  = document.getElementById('buscarCarreraPausaInfo');
        if (campo) campo.value = '';
        if (info)  info.textContent = '';
    }

    function pintarResultadosBusqueda(termino) {
        const contenedor = document.getElementById('lista-facultades-pausa');
        const info = document.getElementById('buscarCarreraPausaInfo');
        if (!contenedor) return;

        const buscado = normalizar(termino);

        // Sin texto: volvemos a la vista por facultades
        if (buscado.length < 2) {
            if (info) info.textContent = buscado.length === 1 ? 'Escribe al menos 2 letras.' : '';
            if (buscado.length === 0) cargarFacultadesPausa(eventoSeleccionadoId, sexoSeleccionado);
            return;
        }

        const esHombre = sexoSeleccionado === 'Hombre';
        const encontradas = carrerasDelEvento.filter(c => normalizar(c.carrera_nombre).includes(buscado));

        if (info) {
            info.textContent = encontradas.length === 0
                ? 'Ninguna carrera coincide.'
                : `${encontradas.length} carrera${encontradas.length === 1 ? '' : 's'} encontrada${encontradas.length === 1 ? '' : 's'}.`;
        }

        contenedor.innerHTML = '';
        encontradas.forEach(car => {
            const lleno = esHombre ? car.lleno_hombres : car.lleno_mujeres;
            const div = document.createElement('div');
            div.style.cssText = 'background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:10px;';
            div.innerHTML = `
                <div style="margin-bottom:4px;">
                    <strong style="font-size:0.95rem;color:#2d3748;">${car.carrera_nombre}</strong>
                </div>
                <div style="margin-bottom:10px;font-size:0.78rem;color:#718096;">${car.facultad_nombre}</div>
                <button
                    class="btn-unirme-pausa"
                    data-evento-id="${eventoSeleccionadoId}"
                    data-facultad-id="${car.facultad_id}"
                    data-carrera-id="${car.carrera_id}"
                    data-carrera-nombre="${car.carrera_nombre}"
                    ${lleno ? 'disabled' : ''}
                    style="width:100%;padding:10px;background:${lleno ? '#a0aec0' : 'linear-gradient(135deg,var(--color-verde-uabc),#00a651)'};
                           color:#fff;border:none;border-radius:5px;font-weight:bold;font-size:0.9rem;
                           cursor:${lleno ? 'not-allowed' : 'pointer'};">
                    ${lleno ? 'Sin espacios disponibles' : 'Unirme a esta carrera'}
                </button>`;
            contenedor.appendChild(div);
        });
    }

    // ─── Cargar facultades ────────────────────────────────────
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
                    const div = document.createElement('div');
                    // Sin cursor:pointer aqui: la tarjeta entera no es clicable,
                    // solo su cabecera. Antes la mano aparecia tambien sobre las
                    // carreras y sobre el espacio vacio de la tarjeta.
                    div.style.cssText = 'background:#f8f9fa;border:1px solid #e2e8f0;border-radius:10px;padding:15px;margin-bottom:12px;';
                    div.innerHTML = `
                        <div class="facultad-header" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;">
                            <strong style="font-size:1rem;color:#1a202c;">${fac.facultad_nombre}</strong>
                            <span style="font-size:0.85rem;color:#4a5568;">Ver Carreras ▼</span>
                        </div>
                        <div class="carreras-container" id="carreras-${fac.facultad_id}" style="display:none;margin-top:15px;border-top:1px solid #e2e8f0;padding-top:15px;">
                            <!-- Carreras cargadas dinámicamente -->
                        </div>
                    `;
                    
                    div.querySelector('.facultad-header').addEventListener('click', () => {
                        const carrerasContainer = div.querySelector('.carreras-container');
                        const isHidden = carrerasContainer.style.display === 'none';
                        carrerasContainer.style.display = isHidden ? 'block' : 'none';
                        if (isHidden && carrerasContainer.innerHTML.trim() === '<!-- Carreras cargadas dinámicamente -->') {
                            cargarCarrerasPausa(eventoId, fac.facultad_id, fac.facultad_nombre, sexo, carrerasContainer);
                        }
                    });

                    contenedor.appendChild(div);
                });
            })
            .catch(() => {
                contenedor.innerHTML = '<p style="text-align:center;color:#e53e3e;padding:20px;">Error al cargar las facultades. Intenta de nuevo.</p>';
            });
    }

    function cargarCarrerasPausa(eventoId, facultadId, facultadNombre, sexo, contenedor) {
        contenedor.innerHTML = '<p style="font-size:0.85rem;color:#666;">Cargando carreras...</p>';
        fetch(`../php/public/obtenerCarrerasPausa.php?evento_id=${eventoId}&facultad_id=${facultadId}`)
            .then(r => r.json())
            .then(data => {
                if (!data.success || !data.carreras || data.carreras.length === 0) {
                    contenedor.innerHTML = '<p style="font-size:0.85rem;color:#e53e3e;">No hay carreras configuradas.</p>';
                    return;
                }
                contenedor.innerHTML = '';
                data.carreras.forEach(car => {
                    const esHombre   = (sexo === 'Hombre');
                    // El endpoint solo informa si esa carrera ya se lleno para
                    // este sexo. Nunca cuantos van ni cuantos caben.
                    const lleno = esHombre ? car.lleno_hombres : car.lleno_mujeres;

                    const carDiv = document.createElement('div');
                    carDiv.style.cssText = 'background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:10px;';

                    /* Solo nombre de carrera y boton. Los cupos y el numero de
                       inscritos ya no llegan a esta pantalla: son informacion
                       interna y el endpoint publico dejo de enviarlos. */
                    carDiv.innerHTML = `
                        <div style="margin-bottom:10px;">
                            <strong style="font-size:0.95rem;color:#2d3748;">${car.carrera_nombre}</strong>
                        </div>
                        <button
                            class="btn-unirme-pausa"
                            data-evento-id="${eventoId}"
                            data-facultad-id="${facultadId}"
                            data-carrera-id="${car.carrera_id}"
                            data-carrera-nombre="${car.carrera_nombre}"
                            ${lleno ? 'disabled' : ''}
                            style="width:100%;padding:10px;background:${lleno ? '#a0aec0' : 'linear-gradient(135deg,var(--color-verde-uabc),#00a651)'};
                                   color:#fff;border:none;border-radius:5px;font-weight:bold;font-size:0.9rem;
                                   cursor:${lleno ? 'not-allowed' : 'pointer'};transition:opacity 0.2s;">
                            ${lleno ? 'Sin espacios disponibles' : 'Unirme a esta carrera'}
                        </button>
                    `;
                    contenedor.appendChild(carDiv);
                });
            })
            .catch(() => {
                contenedor.innerHTML = '<p style="font-size:0.85rem;color:#e53e3e;">Error al cargar carreras.</p>';
            });
    }

    // ─── Delegación: escuchar clics en botones "Unirme" ─────────────────────
    document.addEventListener('click', function (e) {
        const btnUnirme = e.target.closest('.btn-unirme-pausa');
        if (!btnUnirme || btnUnirme.disabled) return;

        const facultadId    = btnUnirme.dataset.facultadId;
        const carreraId     = btnUnirme.dataset.carreraId;
        const carreraNombre = btnUnirme.dataset.carreraNombre;

        if (!eventoSeleccionadoId || !facultadId || !carreraId || !sexoSeleccionado) return;

        // No registramos de inmediato: primero confirmamos.
        pedirConfirmacion(facultadId, carreraId, carreraNombre, btnUnirme);
    });

    // ─── Paso de confirmación ────────────────────────────────────────────────
    /* El registro no se puede deshacer desde aqui, y las carreras se parecen
       mucho entre si (varios "Tronco Comun", nombres largos que se recortan).
       Este paso muestra en grande lo que se eligio antes de mandarlo. */
    function pedirConfirmacion(facultadId, carreraId, carreraNombre, btnOrigen) {
        const contenedor = document.getElementById('lista-facultades-pausa');
        if (!contenedor) return;

        // Nombre de la facultad: en la vista de busqueda va debajo del titulo,
        // en la vista por facultades hay que buscarlo en los datos precargados.
        const datos = carrerasDelEvento.find(c => String(c.carrera_id) === String(carreraId));
        const facultadNombre = datos ? datos.facultad_nombre : '';

        const etiquetaSexo = sexoSeleccionado === 'Hombre' ? '♂ Hombre' : '♀ Mujer';
        const colorSexo    = sexoSeleccionado === 'Hombre' ? '#1a73e8' : '#e91e8c';


        contenedor.innerHTML = `
            <div style="display:flex;flex-direction:column;justify-content:center;min-height:100%;padding:10px 4px;">
                <p style="margin:0 0 14px;font-size:0.9rem;color:#4a5568;text-align:center;">
                    Estás a punto de registrarte en:
                </p>

                <div style="background:#f0f7f3;border:2px solid var(--color-verde-uabc);border-radius:10px;padding:16px;margin-bottom:14px;text-align:center;">
                    <strong style="display:block;font-size:1.05rem;color:var(--color-azul-uabc);line-height:1.35;margin-bottom:6px;">
                        ${carreraNombre}
                    </strong>
                    ${facultadNombre ? `<span style="display:block;font-size:0.8rem;color:#718096;margin-bottom:10px;">${facultadNombre}</span>` : ''}
                    <span style="display:inline-block;font-size:0.85rem;font-weight:700;color:${colorSexo};">
                        ${etiquetaSexo}
                    </span>
                </div>

                <p style="margin:0 0 18px;font-size:0.82rem;color:#8a5d00;background:#fdf6e3;border-radius:8px;padding:10px 12px;text-align:center;">
                    Revisa que sea la carrera correcta. Una vez registrado no podrás cambiarlo desde aquí.
                </p>

                <button id="btnConfirmarPausa"
                    style="width:100%;padding:13px;margin-bottom:10px;background:linear-gradient(135deg,var(--color-verde-uabc),#00a651);
                           color:#fff;border:none;border-radius:8px;font-weight:bold;font-size:0.95rem;cursor:pointer;">
                    Sí, registrarme
                </button>

                <button id="btnCancelarConfirmPausa"
                    style="width:100%;padding:12px;background:#fff;color:#4a5568;border:1px solid #cbd5e0;
                           border-radius:8px;font-weight:600;font-size:0.9rem;cursor:pointer;">
                    No, elegir otra carrera
                </button>
            </div>
        `;

        contenedor.scrollTop = 0;

        document.getElementById('btnConfirmarPausa').addEventListener('click', function () {
            this.disabled = true;
            this.textContent = 'Registrando...';
            ejecutarRegistroPausa(eventoSeleccionadoId, facultadId, carreraId,
                                  sexoSeleccionado, carreraNombre, this);
        });

        document.getElementById('btnCancelarConfirmPausa').addEventListener('click', restaurarVistaCarreras);
    }

    /* Vuelve a la vista que estaba antes de confirmar.
       Se redibuja en vez de restaurar el HTML guardado: reponer innerHTML crea
       nodos nuevos y deja sin listeners a las cabeceras de facultad, con lo que
       "Ver Carreras" dejaba de responder despues de cancelar. */
    function restaurarVistaCarreras() {
        const campo = document.getElementById('buscarCarreraPausa');
        const termino = campo ? campo.value.trim() : '';

        if (termino.length >= 2) {
            pintarResultadosBusqueda(termino);
        } else {
            cargarFacultadesPausa(eventoSeleccionadoId, sexoSeleccionado);
        }
    }

    // ─── Registro en el backend ──────────────────────────────────────────────
    /* Marca local de "ya me registre a este evento".
       No es seguridad (se salta con una ventana de incognito): evita el doble
       clic y el registro repetido por descuido. */
    const claveRegistro = (eventoId) => `pausa_activa_registrado_${eventoId}`;

    function yaRegistrado(eventoId) {
        try { return localStorage.getItem(claveRegistro(eventoId)) !== null; }
        catch (e) { return false; }   // modo privado puede bloquear localStorage
    }

    function marcarRegistrado(eventoId) {
        try {
            localStorage.setItem(claveRegistro(eventoId), new Date().toISOString());
        } catch (e) { /* sin localStorage seguimos igual */ }
    }

    function ejecutarRegistroPausa(eventoId, facultadId, carreraId, sexo, carreraNombre, btnOrigen) {
        if (yaRegistrado(eventoId)) {
            mostrarToast('⚠️ Ya te registraste en esta actividad desde este dispositivo.', 'error');
            return;
        }

        /* Recordamos la etiqueta original: este boton puede ser el de la lista
           ("Unirme a esta carrera") o el de confirmacion ("Si, registrarme"),
           y al fallar hay que devolverle la suya, no una fija. */
        const etiquetaOriginal = btnOrigen.textContent;
        btnOrigen.disabled     = true;
        btnOrigen.textContent  = 'Registrando...';

        const formData = new URLSearchParams();
        formData.append('evento_id',   eventoId);
        formData.append('facultad_id', facultadId);
        formData.append('carrera_id',  carreraId);
        formData.append('sexo',        sexo);

        fetch('../php/public/inscribirPausaActiva.php', {
            method: 'POST',
            body: formData
        })
        .then(r => r.json())
        .then(data => {
            cerrarModalPausa();
            if (data.success) {
                marcarRegistrado(eventoId);
                mostrarToast(`✅ ¡Registro exitoso! Quedaste anotado en <strong>${carreraNombre}</strong> como ${sexo}.`, 'success');
                // Al volver a abrir recargará los datos
            } else {
                mostrarToast(`⚠️ ${data.message || 'Error al registrarse.'}`, 'error');
                btnOrigen.disabled    = false;
                btnOrigen.textContent = etiquetaOriginal;
            }
        })
        .catch(() => {
            cerrarModalPausa();
            mostrarToast('❌ Error de conexión. Intenta de nuevo.', 'error');
            btnOrigen.disabled    = false;
            btnOrigen.textContent = etiquetaOriginal;
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

        // Buscador: filtra mientras se escribe
        const campoBuscar = document.getElementById('buscarCarreraPausa');
        if (campoBuscar) {
            campoBuscar.addEventListener('input', function () {
                pintarResultadosBusqueda(this.value);
            });
        }

        /* Hay DOS elementos con esta clase: la X de arriba y el boton Cancelar
           de abajo. Con querySelector solo se conectaba el primero, por eso
           Cancelar no hacia nada. */
        modal.querySelectorAll('.btn-cerrar-modal-pausa')
             .forEach(btn => btn.addEventListener('click', cerrarModalPausa));

        // Clic en fondo oscuro
        modal.addEventListener('click', function (e) {
            if (e.target === modal) cerrarModalPausa();
        });
    });

})();