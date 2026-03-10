let allBookmarks = [];
let currentFilter = null;

async function fetchBookmarks() {
    const container = document.getElementById('bookmarks-container');

    try {
        const response = await fetch('/data/bookmarks.json');
        if (!response.ok) throw new Error('Failed to fetch bookmarks');

        const bookmarks = await response.json();

        if (bookmarks.length === 0) {
            container.innerHTML = '<div class="no-bookmarks">No bookmarks yet. Check back soon!</div>';
            return;
        }

        allBookmarks = bookmarks.slice().sort((a, b) =>
            new Date(b.date || 0) - new Date(a.date || 0)
        );

        const urlParams = new URLSearchParams(window.location.search);
        const tagFilter = urlParams.get('tag');
        if (tagFilter) {
            filterByTag(tagFilter);
        } else {
            renderBookmarks(allBookmarks);
        }
    } catch (error) {
        console.error('Error fetching bookmarks:', error);
        container.innerHTML = '<div class="error">Failed to load bookmarks. Please try again later.</div>';
    }
}

function renderBookmarks(bookmarks) {
    const container = document.getElementById('bookmarks-container');

    if (bookmarks.length === 0) {
        container.innerHTML = '<div class="no-bookmarks">No bookmarks found with this tag.</div>';
        return;
    }

    container.innerHTML = bookmarks.map(renderBookmarkRow).join('');

    document.querySelectorAll('.bookmark-tag').forEach(tagElement => {
        tagElement.style.cursor = 'pointer';
        tagElement.addEventListener('click', function (e) {
            e.preventDefault();
            const tagText = this.textContent.replace('#', '').trim();
            if (tagText) {
                if (currentFilter && currentFilter.toLowerCase() === tagText.toLowerCase()) {
                    clearFilter();
                } else {
                    filterByTag(tagText);
                }
            }
        });
    });
}

function filterByTag(tag) {
    currentFilter = tag;

    const filterContainer = document.getElementById('filter-container');
    const filterTagText = document.getElementById('filter-tag');
    filterContainer.style.display = 'flex';
    filterTagText.textContent = '#' + tag;

    const filtered = allBookmarks.filter(b =>
        b.tag && b.tag.toLowerCase() === tag.toLowerCase()
    );

    const url = new URL(window.location);
    url.searchParams.set('tag', tag);
    window.history.pushState({}, '', url);

    renderBookmarks(filtered);
}

function clearFilter() {
    currentFilter = null;

    const filterContainer = document.getElementById('filter-container');
    filterContainer.style.display = 'none';

    const url = new URL(window.location);
    url.searchParams.delete('tag');
    window.history.pushState({}, '', url);

    renderBookmarks(allBookmarks);
}

function renderBookmarkRow(bookmark) {
    let displayUrl = bookmark.url;
    try {
        const urlObj = new URL(bookmark.url);
        displayUrl = urlObj.hostname.replace('www.', '');
    } catch (e) {
        displayUrl = bookmark.url;
    }

    const tagDisplay = bookmark.tag ? `#${bookmark.tag}` : '';

    return `
        <div class="bookmark-item">
            <div class="bookmark-link">
                <a href="${bookmark.url}" target="_blank" rel="noopener noreferrer">${displayUrl}</a>
                <span class="url-tooltip">${bookmark.url}</span>
            </div>
            <div class="bookmark-title"><a href="${bookmark.url}" target="_blank" rel="noopener noreferrer">${bookmark.title}</a></div>
            <div class="bookmark-tag">${tagDisplay}</div>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', function () {
    fetchBookmarks();
    document.getElementById('filter-container').addEventListener('click', clearFilter);
});
