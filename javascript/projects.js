(function () {
    var EXTERNAL_ICON = '<svg class="external-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>';

    function esc(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    fetch('/data/projects.json')
        .then(function (r) { return r.json(); })
        .then(function (projects) {
            var list = document.querySelector('.projects-list');
            if (!list || !projects.length) return;

            list.innerHTML = projects.map(function (p) {
                var attrs = p.external
                    ? ' target="_blank" rel="noopener noreferrer"'
                    : '';
                return '<li class="project-item reveal-item">' +
                    '<a href="' + esc(p.url) + '" class="project-link' + (p.external ? ' external' : '') + '"' + attrs + '>' +
                    '<span class="project-name">' + esc(p.name) + '</span>' +
                    '<span class="project-description">' + esc(p.description) + '</span>' +
                    (p.external ? EXTERNAL_ICON : '') +
                    '</a></li>';
            }).join('');
        })
        .catch(function () { /* fallback: static HTML remains */ });
}());
