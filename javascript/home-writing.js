(function () {
    var REPO_OWNER = 'irrssue';
    var REPO_NAME  = 'irrssue.github.io';
    var BRANCH     = 'main';
    var POSTS_DIR  = 'posts';
    var MAX_POSTS  = 4;

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
            var m = block.match(new RegExp('^' + key + ':\\s*["\']?([^"\'\\n]+)["\']?', 'm'));
            return m ? m[1].trim() : '';
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
                        return { title: fm.title, date: fm.date, filename: f.name, dateObj: new Date(fm.date || 0) };
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
                    '<a href="html/post.html?name=' + encodeURIComponent(p.filename) + '" class="writing-post-link">' +
                    esc(p.title) +
                    '</a></li>';
            }).join('');
        })
        .catch(function () { /* silently fail — section just stays empty */ });
}());
