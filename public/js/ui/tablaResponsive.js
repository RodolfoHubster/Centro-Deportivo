/* ==========================================================================
   TABLAS RESPONSIVAS
   Ruta: public/js/ui/tablaResponsive.js
   Descripción: En móvil las tablas .admin-table dejan de necesitar scroll
                horizontal y se muestran como tarjetas, una por registro.

   En lugar de tocar cada generador de <td> (están repartidos entre
   verInscripciones.js y participantes.js), copiamos el texto de cada <th> al
   atributo data-label de su celda. El CSS lo pinta como etiqueta con ::before.
   Ventaja: si mañana se agrega o quita una columna, esto sigue funcionando
   solo, sin tocar nada más.
   ========================================================================== */

(function () {
    'use strict';

    function etiquetarCeldas(tabla) {
        const encabezados = Array.from(tabla.querySelectorAll('thead th'))
            .map(th => th.textContent.replace(/[▼▲]/g, '').trim());

        if (!encabezados.length) return;

        tabla.querySelectorAll('tbody tr').forEach(fila => {
            const celdas = fila.children;

            // Filas de aviso ("Cargando...", "Sin resultados") usan un colspan:
            // no llevan etiqueta, se muestran centradas a lo ancho.
            if (celdas.length === 1 && celdas[0].hasAttribute('colspan')) {
                fila.classList.add('fila-aviso');
                return;
            }

            Array.prototype.forEach.call(celdas, (celda, i) => {
                if (encabezados[i] && !celda.hasAttribute('colspan')) {
                    celda.setAttribute('data-label', encabezados[i]);
                }
            });
        });
    }

    function iniciar() {
        document.querySelectorAll('table.admin-table').forEach(tabla => {
            etiquetarCeldas(tabla);

            // Las filas llegan por AJAX, así que hay que volver a etiquetar
            // cada vez que se repinta el cuerpo de la tabla.
            const cuerpo = tabla.querySelector('tbody');
            if (cuerpo && window.MutationObserver) {
                // Solo observamos childList: escribir data-label no vuelve a disparar.
                new MutationObserver(() => etiquetarCeldas(tabla))
                    .observe(cuerpo, { childList: true });
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();
