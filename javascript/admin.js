    const REPO  = 'irrssue/irrssue.github.io';
    const API   = 'https://api.github.com/repos/' + REPO + '/contents';
    const BRANCH = 'main';

    // Keep credentials in memory only. Persistent browser storage is readable
    // by any same-origin script, including a future content-rendering bug.
    let pat = '';
    try {
        // Remove tokens persisted by older versions once, then never write
        // credentials back to browser storage.
        localStorage.removeItem('cms_pat');
        localStorage.removeItem('uploadToken');
    } catch (_) {}

    // Tracked SHAs for JSON files (required by GitHub API for updates)
    let projectsSHA  = null;
    let bookmarksSHA = null;
    let gemsSHA      = null;

    // In-memory data
    let projectsData  = [];
    let bookmarksData = [];
    let postsData     = [];
    let gemsData      = [];

    // Edit state
    let editingProjectIdx  = -1;
    let editingBookmarkIdx = -1;
    let editingGemIdx      = -1;
    let editingPost = null; // { filename, sha }

    // ── Init ─────────────────────────────────────────
    function init() {
        setToday('bm-date');
        setFormattedDate('post-date');

        if (pat) {
            hidePATModal();
            updatePATStatus(true);
            loadProjects();
        }
    }

    function setToday(id) {
        document.getElementById(id).value = new Date().toISOString().split('T')[0];
    }

    function setFormattedDate(id) {
        const d = new Date();
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        document.getElementById(id).value = months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }

    // ── PAT ──────────────────────────────────────────
    function savePAT() {
        const val = document.getElementById('pat-input').value.trim();
        if (!val) return;
        pat = val;
        hidePATModal();
        updatePATStatus(true);
        loadProjects();
    }

    function showPATModal() {
        document.getElementById('pat-modal').style.display = 'flex';
    }

    function hidePATModal() {
        document.getElementById('pat-modal').style.display = 'none';
    }

    function updatePATStatus(connected) {
        const el = document.getElementById('pat-status');
        el.textContent = connected ? 'Connected' : 'Not connected';
        el.className = 'pat-status' + (connected ? ' connected' : '');
    }

    document.getElementById('pat-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') savePAT();
    });

    // ── Tabs ─────────────────────────────────────────
    function switchTab(name, btn) {
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
        document.getElementById('tab-' + name).classList.add('active');
        // Activate matching buttons in both navs
        const sideBtn = document.querySelector('.tab-btn[data-tab="' + name + '"]');
        const botBtn  = document.getElementById('btn-nav-' + name);
        if (sideBtn) sideBtn.classList.add('active');
        if (botBtn)  botBtn.classList.add('active');
        if (name === 'projects')  loadProjects();
        if (name === 'bookmarks') loadBookmarks();
        if (name === 'posts')     loadPosts();
        if (name === 'gems')      loadGems();
    }

    // ── GitHub API helpers ────────────────────────────
    function apiHeaders() {
        return {
            'Authorization': 'Bearer ' + pat,
            'Content-Type': 'application/json'
        };
    }

    async function ghGet(path) {
        const res = await fetch(API + '/' + path + '?ref=' + BRANCH, { headers: apiHeaders() });
        if (!res.ok) throw new Error('GET ' + path + ' failed: ' + res.status);
        return res.json();
    }

    async function ghPut(path, textContent, sha, message) {
        const encoded = b64encode(textContent);
        const body = { message, content: encoded, branch: BRANCH };
        if (sha) body.sha = sha;
        const res = await fetch(API + '/' + path, {
            method: 'PUT',
            headers: apiHeaders(),
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'PUT failed: ' + res.status);
        }
        return res.json();
    }

    async function ghDelete(path, sha, message) {
        const res = await fetch(API + '/' + path, {
            method: 'DELETE',
            headers: apiHeaders(),
            body: JSON.stringify({ message, sha, branch: BRANCH })
        });
        if (!res.ok) throw new Error('DELETE failed: ' + res.status);
        return res.json();
    }

    function b64encode(str) {
        return btoa(unescape(encodeURIComponent(str)));
    }

    function b64decode(str) {
        return decodeURIComponent(escape(atob(str.replace(/\n/g, ''))));
    }

    // ── Toast ─────────────────────────────────────────
    let toastTimer;
    function toast(msg, type = 'info') {
        const el = document.getElementById('toast');
        el.textContent = msg;
        el.className = type;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { el.className = ''; }, 3800);
    }

    // ── HTML escape ───────────────────────────────────
    function esc(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function isHttpUrl(value) {
        try {
            const url = new URL(value);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }

    function isRelativeUrl(value) {
        try {
            const url = new URL(value, location.origin);
            return !value.startsWith('//') && url.origin === location.origin &&
                !/^[a-z][a-z0-9+.-]*:/i.test(value);
        } catch (_) {
            return false;
        }
    }

    // ─────────────────────────────────────────────────
    // DRAG & DROP
    // ─────────────────────────────────────────────────
    let _dragIdx  = -1;
    let _dragType = '';

    function onDragStart(e, i, type, row) {
        _dragIdx  = i;
        _dragType = type;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => (row || e.currentTarget).classList.add('dragging'), 0);
    }

    function onDragOver(e, row) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        (row || e.currentTarget).classList.add('drag-over');
    }

    function onDragLeave(e, row) {
        (row || e.currentTarget).classList.remove('drag-over');
    }

    function onDragEnd(e) {
        document.querySelectorAll('.item-row').forEach(r => r.classList.remove('drag-over', 'dragging'));
        _dragIdx = -1;
    }

    function onDrop(e, i, type, row) {
        e.preventDefault();
        (row || e.currentTarget).classList.remove('drag-over');
        if (_dragIdx < 0 || _dragIdx === i || _dragType !== type) return;
        if (type === 'project') {
            const [item] = projectsData.splice(_dragIdx, 1);
            projectsData.splice(i, 0, item);
            writeProjects('Reorder projects');
        } else if (type === 'bookmark') {
            const [item] = bookmarksData.splice(_dragIdx, 1);
            bookmarksData.splice(i, 0, item);
            writeBookmarks('Reorder bookmarks');
        } else if (type === 'post') {
            const [item] = postsData.splice(_dragIdx, 1);
            postsData.splice(i, 0, item);
            renderPosts();
        } else if (type === 'gem') {
            const [item] = gemsData.splice(_dragIdx, 1);
            gemsData.splice(i, 0, item);
            writeGems('Reorder gems');
        }
        _dragIdx = -1;
    }

    // Touch-safe fallback for the mouse-only drag handle above: move-up/
    // move-down buttons that reuse the same reorder-and-save logic as onDrop.
    function moveItem(type, i, delta) {
        let arr, save;
        if (type === 'project') { arr = projectsData; save = () => writeProjects('Reorder projects'); }
        else if (type === 'bookmark') { arr = bookmarksData; save = () => writeBookmarks('Reorder bookmarks'); }
        else if (type === 'post') { arr = postsData; save = renderPosts; }
        else if (type === 'gem') { arr = gemsData; save = () => writeGems('Reorder gems'); }
        else return;

        const j = i + delta;
        if (j < 0 || j >= arr.length) return;
        const [item] = arr.splice(i, 1);
        arr.splice(j, 0, item);
        save();
    }

    // ─────────────────────────────────────────────────
    // PROJECTS
    // ─────────────────────────────────────────────────
    async function loadProjects() {
        const list = document.getElementById('projects-list');
        list.innerHTML = '<div class="loading-state">Loading...</div>';
        try {
            const data = await ghGet('data/projects.json');
            projectsSHA  = data.sha;
            projectsData = JSON.parse(b64decode(data.content));
            renderProjects();
        } catch (e) {
            list.innerHTML = '<div class="empty-state">Could not load — check your token.</div>';
        }
    }

    function renderProjects() {
        const list = document.getElementById('projects-list');
        if (!projectsData.length) {
            list.innerHTML = '<div class="empty-state">No projects yet.</div>';
            return;
        }
        list.innerHTML = projectsData.map((p, i) => `
<div class="item-row" draggable="true" data-type="project" data-index="${i}">
                <span class="drag-handle" title="Drag to reorder">⠿</span>
                <div class="reorder-btns">
                    <button type="button" title="Move up" aria-label="Move up" data-action="move-item" data-type="project" data-index="${i}" data-delta="-1" ${i === 0 ? 'disabled' : ''}>▲</button>
                    <button type="button" title="Move down" aria-label="Move down" data-action="move-item" data-type="project" data-index="${i}" data-delta="1" ${i === projectsData.length - 1 ? 'disabled' : ''}>▼</button>
                </div>
                <div class="item-info">
                    <div class="item-name">${esc(p.name)}${p.external ? ' <span class="tag-badge">↗ external</span>' : ''}</div>
                    <div class="item-meta">${esc(p.url)} — ${esc(p.description)}</div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-ghost btn-sm" data-action="edit-item" data-type="project" data-index="${i}">Edit</button>
                    <button class="btn btn-danger btn-sm" data-action="delete-item" data-type="project" data-index="${i}">Delete</button>
                </div>
            </div>
        `).join('');
    }

    function editProject(i) {
        editingProjectIdx = i;
        const p = projectsData[i];
        document.getElementById('proj-name').value     = p.name;
        document.getElementById('proj-url').value      = p.url;
        document.getElementById('proj-desc').value     = p.description;
        document.getElementById('proj-external').checked = !!p.external;
        document.getElementById('proj-form-title').textContent = 'Edit Project';
        document.getElementById('proj-cancel').style.display = '';
        document.getElementById('proj-name').focus();
        document.querySelector('#tab-projects').scrollIntoView({ behavior: 'smooth' });
    }

    function resetProjectForm() {
        editingProjectIdx = -1;
        document.getElementById('proj-name').value     = '';
        document.getElementById('proj-url').value      = '';
        document.getElementById('proj-desc').value     = '';
        document.getElementById('proj-external').checked = false;
        document.getElementById('proj-form-title').textContent = 'New Project';
        document.getElementById('proj-cancel').style.display = 'none';
    }

    async function saveProject() {
        const name        = document.getElementById('proj-name').value.trim();
        const url         = document.getElementById('proj-url').value.trim();
        const description = document.getElementById('proj-desc').value.trim();
        const external    = document.getElementById('proj-external').checked;

        if (!name || !url) return toast('Name and URL are required.', 'error');
        if (external ? !isHttpUrl(url) : !isRelativeUrl(url)) {
            return toast(external ? 'External project URLs must use http(s).' : 'Internal project URLs must be relative.', 'error');
        }

        const project = { name, url, description, external };

        if (editingProjectIdx >= 0) {
            projectsData[editingProjectIdx] = project;
        } else {
            projectsData.push(project);
        }

        await writeProjects(editingProjectIdx >= 0 ? `Update project: ${name}` : `Add project: ${name}`);
        resetProjectForm();
    }

    async function deleteProject(i) {
        if (!confirm(`Delete "${projectsData[i].name}"?`)) return;
        projectsData.splice(i, 1);
        await writeProjects('Remove project');
    }

    async function writeProjects(message) {
        try {
            const result = await ghPut('data/projects.json', JSON.stringify(projectsData, null, 2), projectsSHA, message);
            projectsSHA = result.content.sha;
            renderProjects();
            toast(message, 'success');
        } catch (e) {
            toast('Error: ' + e.message, 'error');
            loadProjects(); // Re-sync to get fresh SHA
        }
    }

    // ─────────────────────────────────────────────────
    // BOOKMARKS
    // ─────────────────────────────────────────────────
    async function loadBookmarks() {
        const list = document.getElementById('bookmarks-list');
        list.innerHTML = '<div class="loading-state">Loading...</div>';
        try {
            const data = await ghGet('data/bookmarks.json');
            bookmarksSHA  = data.sha;
            bookmarksData = JSON.parse(b64decode(data.content));
            renderBookmarks();
        } catch (e) {
            list.innerHTML = '<div class="empty-state">Could not load — check your token.</div>';
        }
    }

    function renderBookmarks() {
        const list = document.getElementById('bookmarks-list');
        if (!bookmarksData.length) {
            list.innerHTML = '<div class="empty-state">No bookmarks yet.</div>';
            return;
        }
        list.innerHTML = bookmarksData.map((b, i) => `
<div class="item-row" draggable="true" data-type="bookmark" data-index="${i}">
                <span class="drag-handle" title="Drag to reorder">⠿</span>
                <div class="reorder-btns">
                    <button type="button" title="Move up" aria-label="Move up" data-action="move-item" data-type="bookmark" data-index="${i}" data-delta="-1" ${i === 0 ? 'disabled' : ''}>▲</button>
                    <button type="button" title="Move down" aria-label="Move down" data-action="move-item" data-type="bookmark" data-index="${i}" data-delta="1" ${i === bookmarksData.length - 1 ? 'disabled' : ''}>▼</button>
                </div>
                <div class="item-info">
                    <div class="item-name">
                        ${esc(b.title)}
                        ${b.tag ? `<span class="tag-badge">#${esc(b.tag)}</span>` : ''}
                    </div>
                    <div class="item-meta">${esc(b.url)}${b.date ? ' · ' + esc(b.date) : ''}</div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-ghost btn-sm" data-action="edit-item" data-type="bookmark" data-index="${i}">Edit</button>
                    <button class="btn btn-danger btn-sm" data-action="delete-item" data-type="bookmark" data-index="${i}">Delete</button>
                </div>
            </div>
        `).join('');
    }

    function editBookmark(i) {
        editingBookmarkIdx = i;
        const b = bookmarksData[i];
        document.getElementById('bm-title').value = b.title;
        document.getElementById('bm-url').value   = b.url;
        document.getElementById('bm-tag').value   = b.tag  || '';
        document.getElementById('bm-date').value  = b.date || '';
        document.getElementById('bm-note').value  = b.note || '';
        document.getElementById('bm-form-title').textContent = 'Edit Bookmark';
        document.getElementById('bm-cancel').style.display = '';
        document.getElementById('bm-title').focus();
    }

    function resetBookmarkForm() {
        editingBookmarkIdx = -1;
        document.getElementById('bm-title').value = '';
        document.getElementById('bm-url').value   = '';
        document.getElementById('bm-tag').value   = '';
        document.getElementById('bm-note').value  = '';
        document.getElementById('bm-form-title').textContent = 'New Bookmark';
        document.getElementById('bm-cancel').style.display = 'none';
        setToday('bm-date');
    }

    async function saveBookmark() {
        const title = document.getElementById('bm-title').value.trim();
        const url   = document.getElementById('bm-url').value.trim();
        const tag   = document.getElementById('bm-tag').value.trim();
        const date  = document.getElementById('bm-date').value.trim();
        const note  = document.getElementById('bm-note').value.trim();

        if (!title || !url) return toast('Title and URL are required.', 'error');
        if (!isHttpUrl(url)) return toast('Bookmark URLs must use http(s).', 'error');
        if (tag && tag.includes(' ')) return toast('Tag must be a single word.', 'error');

        const bookmark = { title, url, tag, date, note };

        if (editingBookmarkIdx >= 0) {
            bookmarksData[editingBookmarkIdx] = bookmark;
        } else {
            bookmarksData.unshift(bookmark); // newest first
        }

        await writeBookmarks(editingBookmarkIdx >= 0 ? `Update bookmark: ${title}` : `Add bookmark: ${title}`);
        resetBookmarkForm();
    }

    async function deleteBookmark(i) {
        if (!confirm(`Delete "${bookmarksData[i].title}"?`)) return;
        bookmarksData.splice(i, 1);
        await writeBookmarks('Remove bookmark');
    }

    async function writeBookmarks(message) {
        try {
            const result = await ghPut('data/bookmarks.json', JSON.stringify(bookmarksData, null, 2), bookmarksSHA, message);
            bookmarksSHA = result.content.sha;
            renderBookmarks();
            toast(message, 'success');
        } catch (e) {
            toast('Error: ' + e.message, 'error');
            loadBookmarks();
        }
    }

    // ─────────────────────────────────────────────────
    // GEMS
    // ─────────────────────────────────────────────────
    const GEM_FIELDS = ['title','type','orient','src','desc','place','coords','maps','camera','lens','iso','aperture','shutter'];

    async function loadGems() {
        const list = document.getElementById('gems-list');
        list.innerHTML = '<div class="loading-state">Loading...</div>';
        try {
            const data = await ghGet('data/gems.json');
            gemsSHA  = data.sha;
            gemsData = JSON.parse(b64decode(data.content));
            renderGems();
        } catch (e) {
            list.innerHTML = '<div class="empty-state">Could not load — check your token.</div>';
        }
    }

    function renderGems() {
        const list = document.getElementById('gems-list');
        if (!gemsData.length) {
            list.innerHTML = '<div class="empty-state">No gems yet.</div>';
            return;
        }
        list.innerHTML = gemsData.map((g, i) => `
<div class="item-row" draggable="true" data-type="gem" data-index="${i}">
                <span class="drag-handle" title="Drag to reorder">⠿</span>
                <div class="reorder-btns">
                    <button type="button" title="Move up" aria-label="Move up" data-action="move-item" data-type="gem" data-index="${i}" data-delta="-1" ${i === 0 ? 'disabled' : ''}>▲</button>
                    <button type="button" title="Move down" aria-label="Move down" data-action="move-item" data-type="gem" data-index="${i}" data-delta="1" ${i === gemsData.length - 1 ? 'disabled' : ''}>▼</button>
                </div>
                <div class="item-info">
                    <div class="item-name">
                        ${esc(g.title || '(untitled)')}
                        <span class="tag-badge">${esc(g.type || 'photo')}</span>
                    </div>
                    <div class="item-meta">${esc(g.place || '')}${g.src ? ' · ' + esc(g.src) : ' · no media'}</div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-ghost btn-sm" data-action="edit-item" data-type="gem" data-index="${i}">Edit</button>
                    <button class="btn btn-danger btn-sm" data-action="delete-item" data-type="gem" data-index="${i}">Delete</button>
                </div>
            </div>
        `).join('');
    }

    function editGem(i) {
        editingGemIdx = i;
        const g = gemsData[i];
        GEM_FIELDS.forEach(f => {
            const el = document.getElementById('gem-' + f);
            if (el) el.value = g[f] != null ? g[f] : '';
        });
        document.getElementById('gem-form-title').textContent = 'Edit Gem';
        document.getElementById('gem-cancel').style.display = '';
        document.getElementById('gem-title').focus();
        document.querySelector('#tab-gems').scrollIntoView({ behavior: 'smooth' });
    }

    function resetGemForm() {
        editingGemIdx = -1;
        GEM_FIELDS.forEach(f => {
            const el = document.getElementById('gem-' + f);
            if (!el) return;
            if (f === 'type')   el.value = 'photo';
            else if (f === 'orient') el.value = 'landscape';
            else el.value = '';
        });
        document.getElementById('gem-form-title').textContent = 'New Gem';
        document.getElementById('gem-cancel').style.display = 'none';
    }

    // ── Inline media upload (upload.irrssue.com) ─────
    const UPLOAD_URL  = 'https://upload.irrssue.com/upload';
    const DROP_LABEL  = 'drag & drop a photo/video here, or click to choose';
    const gemDrop     = document.getElementById('gem-drop');
    const gemPicker   = document.getElementById('gem-picker');
    const uploadToken = document.getElementById('upload-token');

    async function uploadGemMedia(file) {
        const token = uploadToken.value.trim();
        if (!token) {
            uploadToken.focus();
            return toast('Upload token required.', 'error');
        }
        gemDrop.classList.add('busy');
        gemDrop.textContent = 'Uploading ' + file.name + '…';
        try {
            const res  = await fetch(UPLOAD_URL + '?name=' + encodeURIComponent(file.name), {
                method: 'POST',
                headers: { 'X-Upload-Token': token },
                body: file
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);

            document.getElementById('gem-src').value = data.url;
            if (file.type.startsWith('video/')) document.getElementById('gem-type').value = 'video';
            if (file.type.startsWith('image/')) {
                const img = new Image();
                img.onload = () => {
                    document.getElementById('gem-orient').value =
                        img.width > img.height ? 'landscape' :
                        img.width < img.height ? 'portrait'  : 'square';
                    URL.revokeObjectURL(img.src);
                };
                img.src = URL.createObjectURL(file);
            }
            toast('Uploaded: ' + data.url, 'success');
        } catch (e) {
            toast('Upload error: ' + e.message, 'error');
        } finally {
            gemDrop.classList.remove('busy');
            gemDrop.textContent = DROP_LABEL;
        }
    }

    gemPicker.addEventListener('change', () => {
        if (gemPicker.files.length) uploadGemMedia(gemPicker.files[0]);
        gemPicker.value = '';
    });
    ['dragenter', 'dragover'].forEach(ev => gemDrop.addEventListener(ev, e => {
        e.preventDefault();
        gemDrop.classList.add('over');
    }));
    ['dragleave', 'drop'].forEach(ev => gemDrop.addEventListener(ev, e => {
        e.preventDefault();
        gemDrop.classList.remove('over');
    }));
    gemDrop.addEventListener('drop', e => {
        if (e.dataTransfer && e.dataTransfer.files.length) uploadGemMedia(e.dataTransfer.files[0]);
    });

    function slugify(str) {
        return String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    async function saveGem() {
        const gem = {};
        GEM_FIELDS.forEach(f => { gem[f] = document.getElementById('gem-' + f).value.trim(); });

        if (!gem.title) return toast('Title is required.', 'error');

        // Only allow HTTPS map links — blocks script-bearing and mixed-content URLs.
        if (gem.maps) {
            let ok = false;
            try { const u = new URL(gem.maps); ok = u.protocol === 'https:'; } catch (_) {}
            if (!ok) return toast('Google Maps link must be a valid HTTPS URL.', 'error');
        }

        // Media URL/path can be a relative path (assets/foo.jpg) or an absolute
        // HTTPS URL, but never javascript:/data:/vbscript: — those would run
        // as script wherever this field is later rendered as a src attribute.
        if (gem.src && /^\s*(javascript|data|vbscript):/i.test(gem.src)) {
            return toast('Media URL must be a relative path or an HTTPS URL.', 'error');
        }
        if (gem.src && /^[a-z][a-z0-9+.-]*:\/\//i.test(gem.src)) {
            let ok = false;
            try { const u = new URL(gem.src); ok = u.protocol === 'https:'; } catch (_) {}
            if (!ok) return toast('Media URL must be a relative path or an HTTPS URL.', 'error');
        }

        // Stable id: keep existing on edit, otherwise derive from title.
        if (editingGemIdx >= 0 && gemsData[editingGemIdx].id) {
            gem.id = gemsData[editingGemIdx].id;
        } else {
            let base = slugify(gem.title) || 'gem';
            let id = base, n = 2;
            while (gemsData.some((x, idx) => x.id === id && idx !== editingGemIdx)) id = base + '-' + (n++);
            gem.id = id;
        }

        if (editingGemIdx >= 0) {
            gemsData[editingGemIdx] = gem;
        } else {
            gemsData.push(gem);
        }

        await writeGems(editingGemIdx >= 0 ? `Update gem: ${gem.title}` : `Add gem: ${gem.title}`);
        resetGemForm();
    }

    async function deleteGem(i) {
        if (!confirm(`Delete "${gemsData[i].title}"?`)) return;
        gemsData.splice(i, 1);
        await writeGems('Remove gem');
    }

    async function writeGems(message) {
        try {
            const result = await ghPut('data/gems.json', JSON.stringify(gemsData, null, 2), gemsSHA, message);
            gemsSHA = result.content.sha;
            renderGems();
            toast(message, 'success');
        } catch (e) {
            toast('Error: ' + e.message, 'error');
            loadGems(); // Re-sync to get fresh SHA
        }
    }

    // ─────────────────────────────────────────────────
    // POSTS
    // ─────────────────────────────────────────────────
    async function loadPosts() {
        const list = document.getElementById('posts-list');
        list.innerHTML = '<div class="loading-state">Loading...</div>';
        try {
            const files = await ghGet('posts');
            const mdFiles = files.filter(f => f.name.endsWith('.md') && f.name !== '_template.md');

            if (!mdFiles.length) {
                postsData = [];
                list.innerHTML = '<div class="empty-state">No posts yet.</div>';
                return;
            }

            const posts = await Promise.all(mdFiles.map(async f => {
                const fileData = await ghGet('posts/' + encodeURIComponent(f.name));
                const text = b64decode(fileData.content);
                const fm   = parseFrontMatter(text);
                return { filename: f.name, sha: f.sha, ...fm };
            }));

            posts.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
            postsData = posts;
            renderPosts();
        } catch (e) {
            document.getElementById('posts-list').innerHTML = '<div class="empty-state">Could not load — check your token.</div>';
        }
    }

    function renderPosts() {
        const list = document.getElementById('posts-list');
        if (!postsData.length) {
            list.innerHTML = '<div class="empty-state">No posts yet.</div>';
            return;
        }
        list.innerHTML = postsData.map((p, i) => `
<div class="item-row" draggable="true" data-type="post" data-index="${i}">
                <span class="drag-handle" title="Drag to reorder">⠿</span>
                <div class="reorder-btns">
                    <button type="button" title="Move up" aria-label="Move up" data-action="move-item" data-type="post" data-index="${i}" data-delta="-1" ${i === 0 ? 'disabled' : ''}>▲</button>
                    <button type="button" title="Move down" aria-label="Move down" data-action="move-item" data-type="post" data-index="${i}" data-delta="1" ${i === postsData.length - 1 ? 'disabled' : ''}>▼</button>
                </div>
                <div class="item-info">
                    <div class="item-name">
                        ${esc(p.title || p.filename)}
                        ${p.draft ? '<span class="tag-badge">draft</span>' : ''}
                    </div>
                    <div class="item-meta">${esc(p.filename)}${p.date ? ' · ' + esc(p.date) : ''}</div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-ghost btn-sm" data-action="edit-item" data-type="post" data-index="${i}">Edit</button>
                    <button class="btn btn-danger btn-sm" data-action="delete-item" data-type="post" data-index="${i}">Delete</button>
                </div>
            </div>
        `).join('');
    }

    async function editPost(filename, sha) {
        try {
            const data    = await ghGet('posts/' + filename);
            const content = b64decode(data.content);
            const fm      = parseFrontMatter(content);
            const body    = content.replace(/^---[\s\S]*?---\n*/, '');

            document.getElementById('post-title').value = fm.title || '';
            document.getElementById('post-date').value  = fm.date  || '';
            document.getElementById('post-draft').checked = fm.draft !== false;
            document.getElementById('post-body').value  = body;

            editingPost = { filename, sha: data.sha };
            document.getElementById('post-form-title').textContent = 'Edit Post';
            document.getElementById('post-submit-btn').textContent = 'Update Post';
            document.getElementById('post-cancel').style.display = '';
            document.getElementById('post-title').focus();
            document.querySelector('.main-panel').scrollTo({ top: 0, behavior: 'smooth' });
            toast('Post loaded for editing.', 'info');
        } catch (e) {
            toast('Error loading post: ' + e.message, 'error');
        }
    }

    function resetPostForm() {
        editingPost = null;
        document.getElementById('post-title').value = '';
        document.getElementById('post-body').value  = '';
        document.getElementById('post-draft').checked = true;
        document.getElementById('post-form-title').textContent = 'New Post';
        document.getElementById('post-submit-btn').textContent = 'Create Post';
        document.getElementById('post-cancel').style.display = 'none';
        setFormattedDate('post-date');
    }

    async function submitPost() {
        const title = document.getElementById('post-title').value.replace(/[\r\n]+/g, ' ').trim();
        const date  = document.getElementById('post-date').value.replace(/[\r\n]+/g, ' ').trim();
        const draft = document.getElementById('post-draft').checked;
        const body  = document.getElementById('post-body').value;

        if (!title) return toast('Title is required.', 'error');

        const content = `---\ntitle: ${JSON.stringify(title)}\ndate: ${JSON.stringify(date)}\ncover: ""\ndraft: ${draft}\n---\n\n${body}`;

        try {
            if (editingPost) {
                // Update existing file
                await ghPut('posts/' + editingPost.filename, content, editingPost.sha, `Update post: ${title}`);
                toast('Post updated: ' + editingPost.filename, 'success');
            } else {
                // Create new file
                const slug = slugify(title);
                if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
                    return toast('Title must contain at least one letter or number.', 'error');
                }
                const filename = 'posts/' + slug + '.md';
                try {
                    await ghGet(filename);
                    return toast(`Post "${slug}.md" already exists. Use Edit instead.`, 'error');
                } catch (_) { /* 404 = ok to create */ }
                await ghPut(filename, content, null, `Add post: ${title}`);
                toast('Post created: ' + filename, 'success');
            }
            resetPostForm();
            loadPosts();
        } catch (e) {
            toast('Error: ' + e.message, 'error');
        }
    }

    async function deletePost(filename, sha) {
        if (!confirm(`Delete "${filename}"?`)) return;
        try {
            await ghDelete('posts/' + filename, sha, 'Delete post: ' + filename);
            toast('Post deleted.', 'success');
            loadPosts();
        } catch (e) {
            toast('Error: ' + e.message, 'error');
        }
    }

    // ── Front matter parser ───────────────────────────
    function parseFrontMatter(content) {
        const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
        if (!match) return {};
        const result = {};
        match[1].split('\n').forEach(line => {
            const colon = line.indexOf(':');
            if (colon < 0) return;
            const key = line.slice(0, colon).trim();
            const val = line.slice(colon + 1).trim().replace(/^["']|["']$/g, '');
            if (val === 'true')       result[key] = true;
            else if (val === 'false') result[key] = false;
            else                      result[key] = val;
        });
        return result;
    }


    // ── Delegated controls ─────────────────────────────
    // Data attributes keep user-controlled values out of executable markup.
    function itemRowFromEvent(event) {
        return event.target instanceof Element
            ? event.target.closest('.item-row[data-type][data-index]')
            : null;
    }

    function itemIndex(value) {
        const index = Number(value);
        return Number.isInteger(index) && index >= 0 ? index : -1;
    }

    async function handleAction(control) {
        const { action, tab, type } = control.dataset;
        const index = itemIndex(control.dataset.index);

        switch (action) {
            case 'save-pat':
                savePAT();
                break;
            case 'show-pat-modal':
                showPATModal();
                document.getElementById('pat-input').focus();
                break;
            case 'switch-tab':
                switchTab(tab);
                break;
            case 'refresh-projects':
                await loadProjects();
                break;
            case 'save-project':
                await saveProject();
                break;
            case 'reset-project':
                resetProjectForm();
                break;
            case 'refresh-bookmarks':
                await loadBookmarks();
                break;
            case 'save-bookmark':
                await saveBookmark();
                break;
            case 'reset-bookmark':
                resetBookmarkForm();
                break;
            case 'refresh-posts':
                await loadPosts();
                break;
            case 'submit-post':
                await submitPost();
                break;
            case 'reset-post':
                resetPostForm();
                break;
            case 'refresh-gems':
                await loadGems();
                break;
            case 'save-gem':
                await saveGem();
                break;
            case 'reset-gem':
                resetGemForm();
                break;
            case 'choose-gem-media':
                gemPicker.click();
                break;
            case 'move-item':
                if (index >= 0) moveItem(type, index, Number(control.dataset.delta));
                break;
            case 'edit-item':
                if (index < 0) break;
                if (type === 'project') editProject(index);
                if (type === 'bookmark') editBookmark(index);
                if (type === 'gem') editGem(index);
                if (type === 'post') {
                    const post = postsData[index];
                    if (post) await editPost(post.filename, post.sha);
                }
                break;
            case 'delete-item':
                if (index < 0) break;
                if (type === 'project') await deleteProject(index);
                if (type === 'bookmark') await deleteBookmark(index);
                if (type === 'gem') await deleteGem(index);
                if (type === 'post') {
                    const post = postsData[index];
                    if (post) await deletePost(post.filename, post.sha);
                }
                break;
        }
    }

    document.addEventListener('click', event => {
        const control = event.target instanceof Element ? event.target.closest('[data-action]') : null;
        if (control) void handleAction(control);
    });

    document.addEventListener('keydown', event => {
        const control = event.target instanceof Element ? event.target.closest('[data-action="choose-gem-media"]') : null;
        if (control && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            gemPicker.click();
        }
    });

    document.addEventListener('dragstart', event => {
        const row = itemRowFromEvent(event);
        if (row) onDragStart(event, itemIndex(row.dataset.index), row.dataset.type, row);
    });
    document.addEventListener('dragover', event => {
        const row = itemRowFromEvent(event);
        if (row) onDragOver(event, row);
    });
    document.addEventListener('dragleave', event => {
        const row = itemRowFromEvent(event);
        if (row) onDragLeave(event, row);
    });
    document.addEventListener('drop', event => {
        const row = itemRowFromEvent(event);
        if (row) onDrop(event, itemIndex(row.dataset.index), row.dataset.type, row);
    });
    document.addEventListener('dragend', event => {
        const row = itemRowFromEvent(event);
        if (row) onDragEnd(event);
    });

    // ── Bottom nav hover pill ─────────────────────────
    (function () {
        const nav   = document.getElementById('admin-bottom-nav');
        if (!nav) return;
        const items = nav.querySelectorAll('.admin-nav-item');

        function setPill(item) {
            const nr = nav.getBoundingClientRect();
            const ir = item.getBoundingClientRect();
            nav.style.setProperty('--hover-left',   (ir.left   - nr.left) + 'px');
            nav.style.setProperty('--hover-top',    (ir.top    - nr.top)  + 'px');
            nav.style.setProperty('--hover-width',  ir.width  + 'px');
            nav.style.setProperty('--hover-height', ir.height + 'px');
        }

        items.forEach(item => {
            item.addEventListener('mouseenter', () => { setPill(item); nav.classList.add('nav-hover-active'); });
        });
        nav.addEventListener('mouseleave', () => nav.classList.remove('nav-hover-active'));
    })();

    // ── Start ─────────────────────────────────────────
    init();
