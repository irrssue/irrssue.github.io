// Post pages are rendered at build time by scripts/build_site.py. Only the two
// things that can't be baked live here: the date is relative to *now*, and the
// ?search= highlight depends on the URL.

function getRelativeTime(date) {
    const diffInSeconds = Math.floor((new Date() - date) / 1000);
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

function showRelativeDate() {
    const el = document.querySelector('.post-date[data-iso]');
    if (!el) return;
    const date = new Date(el.dataset.iso + 'T00:00:00');
    if (isNaN(date)) return;
    // Built HTML ships the full date so no-JS readers still get one; swap it
    // for the relative form now that we can compute it.
    el.textContent = getRelativeTime(date);
}

function initialiseReadingProgress() {
    const postContent = document.querySelector('.post-content');
    if (!postContent) return;

    const progress = document.createElement('div');
    progress.className = 'reading-progress';
    progress.setAttribute('aria-hidden', 'true');

    const track = document.createElement('div');
    track.className = 'reading-progress__track';

    for (let index = 0; index < 17; index += 1) {
        const tick = document.createElement('span');
        tick.className = 'reading-progress__tick';
        track.appendChild(tick);
    }

    const marker = document.createElement('span');
    marker.className = 'reading-progress__marker';
    track.appendChild(marker);
    progress.appendChild(track);
    document.body.appendChild(progress);

    let animationFrame;

    function updateProgress() {
        animationFrame = undefined;

        const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
        const percentage = scrollableHeight > 0
            ? Math.min(Math.max(window.scrollY / scrollableHeight, 0), 1)
            : 0;
        const travelDistance = Math.max(track.clientWidth - marker.offsetWidth, 0);

        marker.style.setProperty('--reading-progress-x', `${percentage * travelDistance}px`);
        progress.classList.add('is-ready');
    }

    function requestProgressUpdate() {
        if (!animationFrame) {
            animationFrame = window.requestAnimationFrame(updateProgress);
        }
    }

    window.addEventListener('scroll', requestProgressUpdate, { passive: true });
    window.addEventListener('resize', requestProgressUpdate);
    requestProgressUpdate();
}

function highlightAndScrollToSearch() {
    const searchQuery = new URLSearchParams(window.location.search).get('search');
    if (!searchQuery) return;

    const postContent = document.querySelector('.post-content');
    if (!postContent) return;

    const walker = document.createTreeWalker(postContent, NodeFilter.SHOW_TEXT, null);
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
        if (node.textContent.trim()) {
            textNodes.push(node);
        }
    }

    const searchLower = searchQuery.toLowerCase();

    for (const textNode of textNodes) {
        const text = textNode.textContent;
        const index = text.toLowerCase().indexOf(searchLower);
        if (index === -1) continue;

        const span = document.createElement('span');
        span.appendChild(document.createTextNode(text.substring(0, index)));
        const mark = document.createElement('mark');
        mark.className = 'search-highlight';
        mark.textContent = text.substring(index, index + searchQuery.length);
        span.appendChild(mark);
        span.appendChild(document.createTextNode(text.substring(index + searchQuery.length)));

        textNode.parentNode.replaceChild(span, textNode);
        setTimeout(() => mark.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        break; // Only highlight and scroll to the first match
    }
}

showRelativeDate();
initialiseReadingProgress();
highlightAndScrollToSearch();
