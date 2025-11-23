const REPO_OWNER = 'irrssue';
const REPO_NAME = 'irrssue.github.io';
const BRANCH = 'main';
const POSTS_DIR = 'posts';

// Initialize markdown-it with plugins
const md = window.markdownit({
    html: true,
    linkify: true,
    typographer: true,
    breaks: true
});

async function loadPost() {
    const container = document.getElementById('post-content');

    // Get filename from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const filename = urlParams.get('name');

    if (!filename) {
        showError('No post specified', 'Please return to the blog and select a post.');
        return;
    }

    try {
        // Fetch post content
        const rawUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${POSTS_DIR}/${filename}`;
        const response = await fetch(rawUrl);

        if (!response.ok) {
            throw new Error('Post not found');
        }

        const content = await response.text();

        // Parse front matter and content
        const frontMatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);

        if (!frontMatterMatch) {
            throw new Error('Invalid post format');
        }

        const frontMatter = jsyaml.load(frontMatterMatch[1]);
        const markdownContent = frontMatterMatch[2];

        // Check if post is draft
        if (frontMatter.draft === true) {
            showError('Post not available', 'This post is still in draft mode.');
            return;
        }

        // Update page title
        document.title = `${frontMatter.title || 'Post'} - Saw Thura Zaw`;

        // Render post
        renderPost(frontMatter, markdownContent);

    } catch (error) {
        console.error('Error loading post:', error);
        showError('Post not found', 'The requested post could not be loaded. Please check the URL or return to the blog.');
    }
}

function getRelativeTime(date) {
    const now = new Date();
    const postDate = new Date(date);
    const diffInSeconds = Math.floor((now - postDate) / 1000);

    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    if (diffInSeconds < 60) return 'just now';

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(diffInSeconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
        }
    }

    return 'just now';
}

function renderPost(frontMatter, markdownContent) {
    const container = document.getElementById('post-content');

    // Format dates
    const fullDate = frontMatter.date ? new Date(frontMatter.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : '';

    const relativeDate = frontMatter.date ? getRelativeTime(frontMatter.date) : '';

    // Render cover image if exists
    const coverHtml = frontMatter.cover ?
        `<img src="${frontMatter.cover}" alt="${frontMatter.title}" class="post-cover-image">` : '';

    // Get first tag (support both 'tag' and 'tags' fields)
    let tag = '';
    if (frontMatter.tags && frontMatter.tags.length > 0) {
        tag = frontMatter.tags[0];
    } else if (frontMatter.tag) {
        tag = frontMatter.tag;
    }

    // Convert markdown to HTML and sanitize
    const htmlContent = md.render(markdownContent);
    const sanitizedContent = DOMPurify.sanitize(htmlContent);

    // Build post HTML
    container.innerHTML = `
        <article>
            <header class="post-header">
                ${coverHtml}
                <h1 class="post-title">${frontMatter.title || 'Untitled'}</h1>
                <div class="post-meta">
                    <span class="post-date" data-full-date="${fullDate}">${relativeDate || ''}</span>
                    <span class="post-tag">${tag ? `#${tag}` : ''}</span>
                </div>
            </header>
            <div class="post-content">
                ${sanitizedContent}
            </div>
        </article>
    `;

    // Scroll to search match if search parameter is present
    highlightAndScrollToSearch();
}

function highlightAndScrollToSearch() {
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');

    if (!searchQuery) return;

    // Find all text nodes in the post content
    const postContent = document.querySelector('.post-content');
    if (!postContent) return;

    // Use TreeWalker to find text nodes
    const walker = document.createTreeWalker(
        postContent,
        NodeFilter.SHOW_TEXT,
        null
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
        if (node.textContent.trim()) {
            textNodes.push(node);
        }
    }

    // Search for the query in text nodes
    const searchLower = searchQuery.toLowerCase();
    let foundNode = null;

    for (const textNode of textNodes) {
        const text = textNode.textContent;
        const index = text.toLowerCase().indexOf(searchLower);

        if (index !== -1) {
            foundNode = textNode;

            // Highlight the matched text
            const before = text.substring(0, index);
            const match = text.substring(index, index + searchQuery.length);
            const after = text.substring(index + searchQuery.length);

            const span = document.createElement('span');
            span.innerHTML = `${before}<mark class="search-highlight">${match}</mark>${after}`;

            textNode.parentNode.replaceChild(span, textNode);

            // Scroll to the first match
            const markElement = span.querySelector('mark');
            if (markElement) {
                setTimeout(() => {
                    markElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }, 100);
            }

            break; // Only highlight and scroll to first match
        }
    }
}

function showError(title, message) {
    const container = document.getElementById('post-content');
    container.innerHTML = `
        <div class="error">
            <h2>${title}</h2>
            <p>${message}</p>
            <p><a href="writing.html">← Return to writing</a></p>
        </div>
    `;
}

// Load post when page loads
document.addEventListener('DOMContentLoaded', loadPost);
