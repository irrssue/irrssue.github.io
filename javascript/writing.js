const REPO_OWNER = 'irrssue';
const REPO_NAME = 'irrssue.github.io';
const BRANCH = 'main';
const POSTS_DIR = 'posts';

let allPosts = [];
let currentFilter = null;

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

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
            container.appendChild(Object.assign(document.createElement('div'), { className: 'bk-empty', textContent: 'No posts yet. Check back soon!' }));
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
                        excerpt
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
            container.appendChild(Object.assign(document.createElement('div'), { className: 'bk-empty', textContent: 'No published posts yet. Check back soon!' }));
            return;
        }

        renderHeader();

        const urlParams = new URLSearchParams(window.location.search);
        const tagFilter = urlParams.get('tag');
        if (tagFilter) {
            filterByTag(tagFilter);
        } else {
            renderPosts(allPosts);
        }

    } catch (error) {
        console.error('Error fetching posts:', error);
        container.textContent = '';
        container.appendChild(Object.assign(document.createElement('div'), { className: 'bk-error', textContent: 'Failed to load posts. Please try again later.' }));
    }
}

function getTagCounts() {
    const counts = {};
    allPosts.forEach(p => {
        if (p.tag) {
            const t = p.tag.toLowerCase();
            counts[t] = (counts[t] || 0) + 1;
        }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function renderHeader() {
    const header = document.getElementById('writing-header');
    header.textContent = '';
    const tags = getTagCounts();
    const total = allPosts.length;
    const oldest = allPosts[allPosts.length - 1];
    const sinceStr = `${MONTHS_SHORT[oldest.dateObj.getMonth()]} ${oldest.dateObj.getFullYear()}`;

    const heading = document.createElement('div');
    heading.className = 'bk-heading';
    heading.textContent = 'Writing.';

    const sub = document.createElement('div');
    sub.className = 'bk-sub';
    sub.textContent = 'Things I found in life as in blog format';

    const counts = document.createElement('div');
    counts.className = 'bk-counts';
    [
        [String(total), ` ${total === 1 ? 'essay' : 'essays'}`],
        [String(tags.length), ` ${tags.length === 1 ? 'tag' : 'tags'}`],
        ['since', ` ${sinceStr}`]
    ].forEach(([bold, rest]) => {
        const span = document.createElement('span');
        const b = document.createElement('b');
        b.textContent = bold;
        span.appendChild(b);
        span.appendChild(document.createTextNode(rest));
        counts.appendChild(span);
    });

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

function renderPosts(posts) {
    const container = document.getElementById('posts-container');
    container.textContent = '';

    if (posts.length === 0) {
        container.appendChild(Object.assign(document.createElement('div'), { className: 'bk-empty', textContent: 'No posts found with this tag.' }));
        return;
    }

    const groups = {};
    const groupOrder = [];
    posts.forEach(p => {
        const date = p.dateObj;
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!groups[key]) {
            groups[key] = {
                label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                items: []
            };
            groupOrder.push(key);
        }
        groups[key].items.push(p);
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
        monthCount.textContent = `· ${items.length} essay${items.length !== 1 ? 's' : ''}`;

        monthHeader.appendChild(monthName);
        monthHeader.appendChild(monthCount);
        monthDiv.appendChild(monthHeader);

        items.forEach(p => {
            monthDiv.appendChild(renderItem(p));
        });

        container.appendChild(monthDiv);
    });
}

function renderItem(post) {
    const dateStr = post.dateObj && !isNaN(post.dateObj)
        ? post.dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
    link.href = post.url;
    link.textContent = post.title;
    titleDiv.appendChild(link);
    body.appendChild(titleDiv);

    if (post.excerpt) {
        const desc = document.createElement('div');
        desc.className = 'bk-item-desc';
        desc.textContent = post.excerpt;
        body.appendChild(desc);
    }

    const tagEl = document.createElement('span');
    if (post.tag) {
        tagEl.className = 'bk-item-tag';
        tagEl.dataset.tag = post.tag.toLowerCase();
        tagEl.textContent = post.tag;
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
    renderPosts(allPosts.filter(post =>
        post.tag && post.tag.toLowerCase() === tag.toLowerCase()
    ));
    const url = new URL(window.location);
    url.searchParams.set('tag', tag);
    window.history.pushState({}, '', url);
}

function clearFilter() {
    currentFilter = null;
    updateChips();
    renderPosts(allPosts);
    const url = new URL(window.location);
    url.searchParams.delete('tag');
    window.history.pushState({}, '', url);
}

document.addEventListener('DOMContentLoaded', fetchPosts);
