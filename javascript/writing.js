const REPO_OWNER = 'irrssue';
const REPO_NAME = 'irrssue.github.io';
const BRANCH = 'main';
const POSTS_DIR = 'posts';

let allPosts = []; // Store all posts for filtering
let currentFilter = null; // Track current filter

async function fetchPosts() {
    const container = document.getElementById('posts-container');

    try {
        // Fetch list of files in posts directory
        const response = await fetch(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${POSTS_DIR}?ref=${BRANCH}`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch posts');
        }

        const files = await response.json();

        // Filter only .md files and exclude _template.md
        const postFiles = files.filter(file =>
            file.name.endsWith('.md') && file.name !== '_template.md'
        );

        if (postFiles.length === 0) {
            container.innerHTML = '<div class="no-posts">No posts yet. Check back soon!</div>';
            return;
        }

        // Fetch and parse each post
        const posts = await Promise.all(
            postFiles.map(async (file) => {
                try {
                    const contentResponse = await fetch(file.download_url);
                    const content = await contentResponse.text();

                    // Parse front matter
                    const frontMatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
                    if (!frontMatterMatch) return null;

                    const frontMatter = jsyaml.load(frontMatterMatch[1]);

                    // Skip draft posts
                    if (frontMatter.draft === true) return null;

                    // Get tag - support both 'tag' and 'tags' (legacy)
                    let tag = frontMatter.tag || '';
                    if (!tag && frontMatter.tags) {
                        // Legacy support: if tags is array, take first element
                        tag = Array.isArray(frontMatter.tags) ? frontMatter.tags[0] : frontMatter.tags;
                    }

                    // Validate tag - must be single word
                    if (tag && tag.includes(' ')) {
                        console.warn(`Post ${file.name} has invalid tag: "${tag}" - must be a single word`);
                        tag = tag.split(' ')[0]; // Take first word
                    }

                    return {
                        filename: file.name,
                        title: frontMatter.title || 'Untitled',
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
        allPosts = posts
            .filter(post => post !== null)
            .sort((a, b) => b.dateObj - a.dateObj);

        if (allPosts.length === 0) {
            container.innerHTML = '<div class="no-posts">No published posts yet. Check back soon!</div>';
            return;
        }

        // Check for tag filter in URL
        const urlParams = new URLSearchParams(window.location.search);
        const tagFilter = urlParams.get('tag');
        if (tagFilter) {
            filterByTag(tagFilter);
        } else {
            renderPosts(allPosts);
        }

    } catch (error) {
        console.error('Error fetching posts:', error);
        container.innerHTML = '<div class="error">Failed to load posts. Please try again later.</div>';
    }
}

function renderPosts(posts) {
    const container = document.getElementById('posts-container');

    if (posts.length === 0) {
        container.innerHTML = '<div class="no-posts">No posts found with this tag.</div>';
        return;
    }

    // Track displayed years to show only once
    let lastDisplayedYear = null;

    container.innerHTML = posts.map(post => {
        const currentYear = post.date ? new Date(post.date).getFullYear() : '';
        const shouldDisplayYear = currentYear && currentYear !== lastDisplayedYear;

        if (shouldDisplayYear) {
            lastDisplayedYear = currentYear;
        }

        return renderPostRow(post, shouldDisplayYear ? currentYear : '');
    }).join('');

    // Add click handlers to tags
    document.querySelectorAll('.blog-tag').forEach(tagElement => {
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

    // Filter posts
    const filteredPosts = allPosts.filter(post =>
        post.tag && post.tag.toLowerCase() === tag.toLowerCase()
    );

    // Update URL without reload
    const url = new URL(window.location);
    url.searchParams.set('tag', tag);
    window.history.pushState({}, '', url);

    // Render filtered posts
    renderPosts(filteredPosts);
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

    // Render all posts
    renderPosts(allPosts);
}

function renderPostRow(post, displayYear = null) {
    const year = displayYear !== null ? displayYear : '';
    const tagDisplay = post.tag ? `#${post.tag}` : '';

    return `
        <div class="blog-post">
            <div class="blog-year">${year}</div>
            <div class="blog-title"><a href="post.html?name=${encodeURIComponent(post.filename)}">${post.title}</a></div>
            <div class="blog-tag">${tagDisplay}</div>
        </div>
    `;
}

// Load posts when page loads
document.addEventListener('DOMContentLoaded', function() {
    fetchPosts();

    // Add click handler to filter container to clear filter
    document.getElementById('filter-container').addEventListener('click', clearFilter);
});
