document.addEventListener("DOMContentLoaded", function() {

    const headerURL = '/Centro-Deportivo/includes/header.html';
    const footerURL = '/Centro-Deportivo/includes/footer.html';

    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {
        fetch(headerURL)
        .then(response => response.ok ? response.text() : Promise.reject(response.statusText))
        .then(html => {
            headerPlaceholder.innerHTML = html;
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
});