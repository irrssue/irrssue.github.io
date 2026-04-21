const REPO_OWNER = 'irrssue';
const REPO_NAME = 'irrssue.github.io';
const BRANCH = 'main';
const POSTS_DIR = 'posts';

let allPosts = [];
let currentFilter = null;

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_UPPER = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

async function fetchPosts() {
    const container = document.getElementById('posts-container');

    try {
        const response = await fetch(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${POSTS_DIR}?ref=${BRANCH}`
        );

        if (!response.ok) throw new Error('Failed to fetch posts');

        const files = await response.json();
        const postFiles = files.filter(file =>
            file.name.endsWith('.md') && file.name !== '_template.md'
        );

        if (postFiles.length === 0) {
            container.textContent = '';
            container.appendChild(Object.assign(document.createElement('div'), { className: 'no-posts', textContent: 'No posts yet. Check back soon!' }));
            return;
        }

        const posts = await Promise.all(
            postFiles.map(async (file) => {
                try {
                    const contentResponse = await fetch(file.download_url);
                    const content = await contentResponse.text();

                    const frontMatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
                    if (!frontMatterMatch) return null;

                    const frontMatter = jsyaml.load(frontMatterMatch[1]);
                    if (frontMatter.draft === true) return null;

                    // Tag — supports both 'tag' and legacy 'tags'
                    let tag = frontMatter.tag || '';
                    if (!tag && frontMatter.tags) {
                        tag = Array.isArray(frontMatter.tags) ? frontMatter.tags[0] : frontMatter.tags;
                    }
                    if (tag && tag.includes(' ')) {
                        console.warn(`Post ${file.name} has invalid tag: "${tag}"`);
                        tag = tag.split(' ')[0];
                    }

                    // Excerpt: prefer frontmatter summary, else first prose paragraph
                    const fmEnd = content.indexOf('---', 3);
                    const body = fmEnd >= 0 ? content.slice(fmEnd + 3).trim() : '';
                    let rawExcerpt = '';
                    for (const line of body.split('\n')) {
                        const t = line.trim();
                        if (t && !t.startsWith('#') && !t.startsWith('!') &&
                            !t.startsWith('```') && !t.startsWith('---') && !t.startsWith('>')) {
                            rawExcerpt = t
                                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                                .replace(/[*_`]/g, '');
                            break;
                        }
                    }
                    const excerpt = frontMatter.summary ||
                        (rawExcerpt.length > 160 ? rawExcerpt.slice(0, 157) + '…' : rawExcerpt);

                    // Read time (~200 wpm)
                    const wordCount = body.split(/\s+/).filter(Boolean).length;
                    const readTime = Math.max(1, Math.round(wordCount / 200));

                    const dateObj = new Date(frontMatter.date || 0);
                    const slug = file.name.replace(/\.md$/, '');
                    const year = isNaN(dateObj) ? '' : dateObj.getFullYear();
                    const url = year
                        ? `/writing/${year}/${encodeURIComponent(slug)}`
                        : `/writing?name=${encodeURIComponent(file.name)}`;

                    return {
                        filename: file.name,
                        title: frontMatter.title || 'Untitled',
                        date: frontMatter.date || '',
                        tag: tag || '',
                        dateObj,
                        url,
                        excerpt,
                        readTime
                    };
                } catch (error) {
                    console.error(`Error parsing ${file.name}:`, error);
                    return null;
                }
            })
        );

        allPosts = posts
            .filter(post => post !== null)
            .sort((a, b) => b.dateObj - a.dateObj);

        if (allPosts.length === 0) {
            container.textContent = '';
            container.appendChild(Object.assign(document.createElement('div'), { className: 'no-posts', textContent: 'No published posts yet. Check back soon!' }));
            return;
        }

        // Populate writing counts (count, since date)
        const countsEl = document.getElementById('writing-counts');
        if (countsEl && allPosts.length > 0) {
            const oldest = allPosts[allPosts.length - 1];
            const count = allPosts.length;
            const sinceStr = `${MONTHS_SHORT[oldest.dateObj.getMonth()]} ${oldest.dateObj.getFullYear()}`;
            [
                [String(count), ` ${count === 1 ? 'essay' : 'essays'}`],
                ['since', ` ${sinceStr}`]
            ].forEach(([bold, rest]) => {
                const span = document.createElement('span');
                const b = document.createElement('b');
                b.textContent = bold;
                span.appendChild(b);
                span.appendChild(document.createTextNode(rest));
                countsEl.appendChild(span);
            });
        }

        const urlParams = new URLSearchParams(window.location.search);
        const tagFilter = urlParams.get('tag');
        if (tagFilter) {
            filterByTag(tagFilter);
        } else {
            renderPosts(allPosts);
        }

    } catch (error) {
        console.error('Error fetching posts:', error);
        const container = document.getElementById('posts-container');
        container.textContent = '';
        container.appendChild(Object.assign(document.createElement('div'), { className: 'error', textContent: 'Failed to load posts. Please try again later.' }));
    }
}

function renderPosts(posts) {
    const container = document.getElementById('posts-container');
    container.textContent = '';

    if (posts.length === 0) {
        container.appendChild(Object.assign(document.createElement('div'), { className: 'no-posts', textContent: 'No posts found with this tag.' }));
        return;
    }

    const [featured, ...archivePosts] = posts;
    container.appendChild(buildFeaturedPost(featured));

    if (archivePosts.length > 0) {
        const archiveSection = document.createElement('div');
        archiveSection.className = 'archive-section';

        let lastYear = null;
        for (const post of archivePosts) {
            const year = post.dateObj.getFullYear();
            if (year !== lastYear) {
                const yearEl = document.createElement('div');
                yearEl.className = 'archive-year';
                yearEl.textContent = String(year);
                archiveSection.appendChild(yearEl);
                lastYear = year;
            }
            archiveSection.appendChild(buildArchiveRow(post));
        }

        container.appendChild(archiveSection);
    }
}

function buildFeaturedPost(post) {
    const dateStr = post.dateObj && !isNaN(post.dateObj)
        ? `${MONTHS_UPPER[post.dateObj.getMonth()]} ${post.dateObj.getDate()}, ${post.dateObj.getFullYear()}`
        : '';
    const readStr = `${post.readTime} MIN READ`;
    const kickerParts = ['LATEST', dateStr, readStr].filter(Boolean).join(' · ');

    const wrap = document.createElement('div');
    wrap.className = 'featured-post';

    // Kicker
    const kicker = document.createElement('div');
    kicker.className = 'featured-kicker';
    const dot = document.createElement('span');
    dot.className = 'kicker-dot';
    dot.textContent = '●';
    kicker.appendChild(dot);
    kicker.appendChild(document.createTextNode(kickerParts));
    wrap.appendChild(kicker);

    // Title
    const titleEl = document.createElement('h2');
    titleEl.className = 'featured-title';
    const titleLink = document.createElement('a');
    titleLink.href = post.url;
    titleLink.textContent = post.title;
    titleEl.appendChild(titleLink);
    wrap.appendChild(titleEl);

    // Excerpt
    if (post.excerpt) {
        const excerptEl = document.createElement('p');
        excerptEl.className = 'featured-excerpt';
        excerptEl.textContent = post.excerpt;
        wrap.appendChild(excerptEl);
    }

    // Footer
    const foot = document.createElement('div');
    foot.className = 'featured-foot';
    if (post.tag) {
        const tagEl = document.createElement('span');
        tagEl.className = 'featured-tag';
        tagEl.dataset.tag = post.tag;
        tagEl.textContent = `#${post.tag}`;
        tagEl.addEventListener('click', makeTagHandler(post.tag));
        foot.appendChild(tagEl);
    }
    const readEl = document.createElement('span');
    readEl.textContent = readStr.toLowerCase();
    foot.appendChild(readEl);
    wrap.appendChild(foot);

    return wrap;
}

function buildArchiveRow(post) {
    const dateStr = post.dateObj && !isNaN(post.dateObj)
        ? `${MONTHS_SHORT[post.dateObj.getMonth()]} ${post.dateObj.getDate()}`
        : '';

    const row = document.createElement('div');
    row.className = 'archive-row';

    // Date
    const dateEl = document.createElement('span');
    dateEl.className = 'archive-date';
    dateEl.textContent = dateStr;
    row.appendChild(dateEl);

    // Title + excerpt
    const titleBlock = document.createElement('div');
    titleBlock.className = 'archive-title-block';
    const link = document.createElement('a');
    link.href = post.url;
    link.textContent = post.title;
    titleBlock.appendChild(link);
    if (post.excerpt) {
        const excerptEl = document.createElement('div');
        excerptEl.className = 'archive-excerpt';
        excerptEl.textContent = post.excerpt;
        titleBlock.appendChild(excerptEl);
    }
    row.appendChild(titleBlock);

    // Tag
    const tagEl = document.createElement('span');
    tagEl.className = 'archive-tag';
    if (post.tag) {
        tagEl.dataset.tag = post.tag;
        tagEl.textContent = `#${post.tag}`;
        tagEl.addEventListener('click', makeTagHandler(post.tag));
    }
    row.appendChild(tagEl);

    // Read time
    const readEl = document.createElement('span');
    readEl.className = 'archive-read';
    readEl.textContent = `${post.readTime} min`;
    row.appendChild(readEl);

    return row;
}

function makeTagHandler(tag) {
    return function(e) {
        e.preventDefault();
        if (currentFilter && currentFilter.toLowerCase() === tag.toLowerCase()) {
            clearFilter();
        } else {
            filterByTag(tag);
        }
    };
}

function filterByTag(tag) {
    currentFilter = tag;

    const filterContainer = document.getElementById('filter-container');
    const filterTagText = document.getElementById('filter-tag');
    filterContainer.style.display = 'flex';
    filterTagText.textContent = '#' + tag;

    const filteredPosts = allPosts.filter(post =>
        post.tag && post.tag.toLowerCase() === tag.toLowerCase()
    );

    const url = new URL(window.location);
    url.searchParams.set('tag', tag);
    window.history.pushState({}, '', url);

    renderPosts(filteredPosts);
}

function clearFilter() {
    currentFilter = null;

    const filterContainer = document.getElementById('filter-container');
    filterContainer.style.display = 'none';

    const url = new URL(window.location);
    url.searchParams.delete('tag');
    window.history.pushState({}, '', url);

    renderPosts(allPosts);
}

document.addEventListener('DOMContentLoaded', function() {
    fetchPosts();
    document.getElementById('filter-container').addEventListener('click', clearFilter);
});
