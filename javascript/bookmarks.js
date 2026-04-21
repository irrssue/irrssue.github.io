let allBookmarks = [];
let currentFilter = null;

function esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function fetchBookmarks() {
    const container = document.getElementById('bookmarks-container');
    try {
        const response = await fetch('/data/bookmarks.json');
        if (!response.ok) throw new Error('fetch failed');

        const bookmarks = await response.json();

        if (bookmarks.length === 0) {
            container.textContent = '';
            const empty = document.createElement('div');
            empty.className = 'bk-empty';
            empty.textContent = 'No bookmarks yet. Check back soon!';
            container.appendChild(empty);
            return;
        }

        allBookmarks = bookmarks.slice().sort((a, b) =>
            new Date(b.date || 0) - new Date(a.date || 0)
        );

        renderHeader();

        const urlParams = new URLSearchParams(window.location.search);
        const tagFilter = urlParams.get('tag');
        if (tagFilter) {
            filterByTag(tagFilter);
        } else {
            renderBookmarks(allBookmarks);
        }
    } catch (error) {
        console.error('Error fetching bookmarks:', error);
        container.textContent = '';
        const err = document.createElement('div');
        err.className = 'bk-error';
        err.textContent = 'Failed to load bookmarks. Please try again later.';
        container.appendChild(err);
    }
}

function getTagCounts() {
    const counts = {};
    allBookmarks.forEach(b => {
        if (b.tag) {
            const t = b.tag.toLowerCase();
            counts[t] = (counts[t] || 0) + 1;
        }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function renderHeader() {
    const header = document.getElementById('bookmarks-header');
    header.textContent = '';
    const tags = getTagCounts();
    const total = allBookmarks.length;
    const earliest = allBookmarks.length
        ? new Date(allBookmarks[allBookmarks.length - 1].date || 0).getFullYear()
        : '—';

    const heading = document.createElement('div');
    heading.className = 'bk-heading';
    heading.textContent = 'Bookmarks';

    const sub = document.createElement('div');
    sub.className = 'bk-sub';
    sub.textContent = 'Articles and pages worth keeping. Updated as I find things.';

    const counts = document.createElement('div');
    counts.className = 'bk-counts';
    counts.innerHTML =
        `<span><b>${total}</b> links</span>` +
        `<span><b>${tags.length}</b> tags</span>` +
        `<span><b>since</b> ${esc(String(earliest))}</span>`;

    const chipsRow = document.createElement('div');
    chipsRow.className = 'bk-chips';

    const makeChip = (tag, label) => {
        const chip = document.createElement('span');
        chip.className = 'bk-chip';
        chip.dataset.tag = tag;
        chip.textContent = label;
        chip.addEventListener('click', () => {
            if (!tag || (currentFilter && currentFilter === tag)) {
                clearFilter();
            } else {
                filterByTag(tag);
            }
        });
        return chip;
    };

    chipsRow.appendChild(makeChip('', 'all'));
    tags.forEach(([tag, count]) => {
        chipsRow.appendChild(makeChip(tag, `${tag} · ${count}`));
    });

    header.appendChild(heading);
    header.appendChild(sub);
    header.appendChild(counts);
    header.appendChild(chipsRow);

    updateChips();
}

function updateChips() {
    document.querySelectorAll('.bk-chip').forEach(chip => {
        const tag = chip.dataset.tag;
        chip.classList.toggle('on', !tag ? !currentFilter : currentFilter === tag);
    });
}

function renderBookmarks(bookmarks) {
    const container = document.getElementById('bookmarks-container');
    container.textContent = '';

    if (bookmarks.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'bk-empty';
        empty.textContent = 'No bookmarks found with this tag.';
        container.appendChild(empty);
        return;
    }

    const groups = {};
    const groupOrder = [];
    bookmarks.forEach(b => {
        const date = new Date(b.date || 0);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!groups[key]) {
            groups[key] = {
                label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                items: []
            };
            groupOrder.push(key);
        }
        groups[key].items.push(b);
    });

    groupOrder.forEach(key => {
        const { label, items } = groups[key];

        const monthDiv = document.createElement('div');
        monthDiv.className = 'bk-month';

        const monthHeader = document.createElement('div');
        monthHeader.className = 'bk-month-header';

        const monthName = document.createElement('span');
        monthName.className = 'bk-month-name';
        monthName.textContent = label;

        const monthCount = document.createElement('span');
        monthCount.className = 'bk-month-count';
        monthCount.textContent = `· ${items.length} link${items.length !== 1 ? 's' : ''}`;

        monthHeader.appendChild(monthName);
        monthHeader.appendChild(monthCount);
        monthDiv.appendChild(monthHeader);

        items.forEach(b => {
            monthDiv.appendChild(renderItem(b));
        });

        container.appendChild(monthDiv);
    });
}

function renderItem(b) {
    let host = b.url || '';
    try { host = new URL(b.url).hostname.replace('www.', ''); } catch (e) {}

    const dateStr = b.date
        ? new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '—';

    const item = document.createElement('div');
    item.className = 'bk-item';

    const dateEl = document.createElement('span');
    dateEl.className = 'bk-item-date';
    dateEl.textContent = dateStr;

    const body = document.createElement('div');
    body.className = 'bk-item-body';

    const titleDiv = document.createElement('div');
    titleDiv.className = 'bk-item-title';
    const link = document.createElement('a');
    link.href = b.url || '#';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = b.title || '(untitled)';
    titleDiv.appendChild(link);
    body.appendChild(titleDiv);

    const noteText = b.note || b.description;
    if (noteText) {
        const desc = document.createElement('div');
        desc.className = 'bk-item-desc';
        desc.textContent = noteText;
        body.appendChild(desc);
    }

    const src = document.createElement('div');
    src.className = 'bk-item-src';
    src.textContent = host;
    body.appendChild(src);

    const tagEl = document.createElement('span');
    if (b.tag) {
        tagEl.className = 'bk-item-tag';
        tagEl.dataset.tag = b.tag.toLowerCase();
        tagEl.textContent = b.tag;
        tagEl.addEventListener('click', () => {
            const tag = tagEl.dataset.tag;
            currentFilter === tag ? clearFilter() : filterByTag(tag);
        });
    }

    item.appendChild(dateEl);
    item.appendChild(body);
    item.appendChild(tagEl);

    return item;
}

function filterByTag(tag) {
    currentFilter = tag;
    updateChips();
    renderBookmarks(allBookmarks.filter(b =>
        b.tag && b.tag.toLowerCase() === tag.toLowerCase()
    ));
    const url = new URL(window.location);
    url.searchParams.set('tag', tag);
    window.history.pushState({}, '', url);
}

function clearFilter() {
    currentFilter = null;
    updateChips();
    renderBookmarks(allBookmarks);
    const url = new URL(window.location);
    url.searchParams.delete('tag');
    window.history.pushState({}, '', url);
}

document.addEventListener('DOMContentLoaded', fetchBookmarks);
