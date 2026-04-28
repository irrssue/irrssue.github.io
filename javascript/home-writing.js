(function () {
    var REPO_OWNER = 'irrssue';
    var REPO_NAME  = 'irrssue.github.io';
    var BRANCH     = 'main';
    var POSTS_DIR  = 'posts';
    var MAX_POSTS  = 3;

    function esc(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function parseFrontMatter(content) {
        var match = content.match(/^---\s*\n([\s\S]*?)\n---/);
        if (!match) return null;
        // Minimal YAML parse: extract title, date, draft
        var block = match[1];
        var get = function (key) {
            var re = new RegExp('^' + key + ':\\s*(?:"((?:[^"\\\\]|\\\\.)*)"|\'((?:[^\'\\\\]|\\\\.)*)\'|([^\\n]+))', 'm');
            var m = block.match(re);
            if (!m) return '';
            return (m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : m[3]).trim();
        };
        if (get('draft') === 'true') return null;
        return { title: get('title'), date: get('date') };
    }

    fetch('https://api.github.com/repos/' + REPO_OWNER + '/' + REPO_NAME + '/contents/' + POSTS_DIR + '?ref=' + BRANCH)
        .then(function (r) { return r.json(); })
        .then(function (files) {
            if (!Array.isArray(files)) return;

            var mdFiles = files.filter(function (f) {
                return f.name.endsWith('.md') && f.name !== '_template.md';
            });

            return Promise.all(mdFiles.map(function (f) {
                return fetch(f.download_url)
                    .then(function (r) { return r.text(); })
                    .then(function (content) {
                        var fm = parseFrontMatter(content);
                        if (!fm) return null;
                        var d = new Date(fm.date || 0);
                        var slug = f.name.replace(/\.md$/, '');
                        var year = isNaN(d) ? '' : d.getFullYear();
                        var url = year ? '/writing/' + year + '/' + encodeURIComponent(slug) : '/writing';
                        return { title: fm.title, date: fm.date, filename: f.name, dateObj: d, url: url };
                    })
                    .catch(function () { return null; });
            }));
        })
        .then(function (posts) {
            if (!posts) return;
            var list = document.getElementById('recent-posts-list');
            if (!list) return;

            var valid = posts
                .filter(function (p) { return p !== null; })
                .sort(function (a, b) { return b.dateObj - a.dateObj; })
                .slice(0, MAX_POSTS);

            if (valid.length === 0) return;

            list.innerHTML = valid.map(function (p) {
                return '<li class="writing-post-item reveal-item">' +
                    '<a href="' + p.url + '" class="writing-post-link">' +
                    esc(p.title) +
                    '</a></li>';
            }).join('');
        })
        .catch(function () { /* silently fail — section just stays empty */ });
}());
