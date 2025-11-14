const REPO_OWNER = 'irrssue';
const REPO_NAME = 'irrssue.github.io';
const BRANCH = 'main';
const BOOKMARKS_DIR = 'bookmarks';

let allBookmarks = []; // Store all bookmarks for filtering
let currentFilter = null; // Track current filter

async function fetchBookmarks() {
    const container = document.getElementById('bookmarks-container');

    try {
        // Fetch list of files in bookmarks directory
        const response = await fetch(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${BOOKMARKS_DIR}?ref=${BRANCH}`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch bookmarks');
        }

        const files = await response.json();

        // Filter only .md files and exclude _template.md
        const bookmarkFiles = files.filter(file =>
            file.name.endsWith('.md') && file.name !== '_template.md'
        );

        if (bookmarkFiles.length === 0) {
            container.innerHTML = '<div class="no-bookmarks">No bookmarks yet. Check back soon!</div>';
            return;
        }

        // Fetch and parse each bookmark
        const bookmarks = await Promise.all(
            bookmarkFiles.map(async (file) => {
                try {
                    const contentResponse = await fetch(file.download_url);
                    const content = await contentResponse.text();

                    // Parse front matter
                    const frontMatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
                    if (!frontMatterMatch) return null;

                    const frontMatter = jsyaml.load(frontMatterMatch[1]);

                    // Get tag
                    let tag = frontMatter.tag || '';

                    // Validate tag - must be single word
                    if (tag && tag.includes(' ')) {
                        console.warn(`Bookmark ${file.name} has invalid tag: "${tag}" - must be a single word`);
                        tag = tag.split(' ')[0]; // Take first word
                    }

                    return {
                        filename: file.name,
                        title: frontMatter.title || 'Untitled',
                        url: frontMatter.url || '#',
                        date: frontMatter.date || '',
                        tag: tag || '',
                        dateObj: new Date(frontMatter.date || 0)
                    };
                } catch (error) {
                    console.error(`Error parsing ${file.name}:`, error);
                    return null;
                }
            })
        );

        // Filter out null values and sort by date (newest first)
        allBookmarks = bookmarks
            .filter(bookmark => bookmark !== null)
            .sort((a, b) => b.dateObj - a.dateObj);

        if (allBookmarks.length === 0) {
            container.innerHTML = '<div class="no-bookmarks">No bookmarks yet. Check back soon!</div>';
            return;
        }

        // Check for tag filter in URL
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

    container.innerHTML = bookmarks.map(bookmark => {
        return renderBookmarkRow(bookmark);
    }).join('');

    // Add click handlers to tags
    document.querySelectorAll('.bookmark-tag').forEach(tagElement => {
        tagElement.style.cursor = 'pointer';
        tagElement.addEventListener('click', function(e) {
            e.preventDefault();
            const tagText = this.textContent.replace('#', '').trim();
            if (tagText) {
                // Toggle filter: clear if clicking the same tag
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

    // Show filter UI
    const filterContainer = document.getElementById('filter-container');
    const filterTagText = document.getElementById('filter-tag');
    filterContainer.style.display = 'flex';
    filterTagText.textContent = '#' + tag;

    // Filter bookmarks
    const filteredBookmarks = allBookmarks.filter(bookmark =>
        bookmark.tag && bookmark.tag.toLowerCase() === tag.toLowerCase()
    );

    // Update URL without reload
    const url = new URL(window.location);
    url.searchParams.set('tag', tag);
    window.history.pushState({}, '', url);

    // Render filtered bookmarks
    renderBookmarks(filteredBookmarks);
}

function clearFilter() {
    currentFilter = null;

    // Hide filter UI
    const filterContainer = document.getElementById('filter-container');
    filterContainer.style.display = 'none';

    // Update URL without reload
    const url = new URL(window.location);
    url.searchParams.delete('tag');
    window.history.pushState({}, '', url);

    // Render all bookmarks
    renderBookmarks(allBookmarks);
}

function renderBookmarkRow(bookmark) {
    // Extract domain from URL for display
    let displayUrl = bookmark.url;
    try {
        const urlObj = new URL(bookmark.url);
        displayUrl = urlObj.hostname.replace('www.', '');
    } catch (e) {
        // If URL parsing fails, use the original URL
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

// Load bookmarks when page loads
document.addEventListener('DOMContentLoaded', function() {
    fetchBookmarks();

    // Add click handler to filter container to clear filter
    document.getElementById('filter-container').addEventListener('click', clearFilter);
});
