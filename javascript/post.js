// Post pages are rendered at build time by scripts/build_site.py. Only the two
// things that can't be baked live here: the date is relative to *now*, and the
// ?search= highlight depends on the URL.

// A post's date has no time of day, so it is compared with today in whole
// calendar days -- measuring from its midnight read "15 hours ago" for a post
// published today, and "just now" for one dated tomorrow in the reader's
// timezone. Returns null for a date still ahead of the reader.
function getRelativeTime(date) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // Rounded, not floored: a day across a DST change is 23 or 25 hours.
    const days = Math.round((today - date) / 86400000);
    const plural = (count, unit) => `${count} ${unit}${count > 1 ? 's' : ''} ago`;

    if (days < 0) return null;
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return plural(days, 'day');
    if (days < 30) return plural(Math.floor(days / 7), 'week');

    // Calendar months, so a post from the 5th of last October is "11 months
    // ago" on the 4th, not "12 months ago" because 360 days have passed.
    let months = (today.getFullYear() - date.getFullYear()) * 12 + (today.getMonth() - date.getMonth());
    if (today.getDate() < date.getDate()) months--;
    if (months < 12) return plural(Math.max(1, months), 'month');
    return plural(Math.floor(months / 12), 'year');
}

function showRelativeDate() {
    const el = document.querySelector('.post-date[data-iso]');
    if (!el) return;
    const date = new Date(el.dataset.iso + 'T00:00:00');
    if (isNaN(date)) return;
    const relative = getRelativeTime(date);
    // A date still ahead of the reader keeps the full date the build wrote.
    if (!relative) return;
    // Built HTML ships the full date so no-JS readers still get one; swap it
    // for the relative form now that we can compute it.
    el.textContent = relative;
    // The full date now only shows in the tooltip, so let keyboard users
    // reach it too (css/post.css shows it on focus).
    el.tabIndex = 0;
}

function setupDateTooltip() {
    // The full date only ever showed on :hover, which touch devices have no
    // real equivalent for. Add a tap toggle so it's reachable there too;
    // desktop keeps working via the existing :hover CSS.
    //
    // One listener on document for the whole visit: javascript/pjax.js runs
    // this file again for every post opened by soft navigation, and a
    // listener per run would pile up, each holding a date that is long gone.
    if (window.postDateTooltipBound) return;
    window.postDateTooltipBound = true;
    document.addEventListener('click', (event) => {
        const date = event.target.closest && event.target.closest('.post-date[data-full-date]');
        document.querySelectorAll('.post-date.is-shown').forEach((el) => {
            if (el !== date) el.classList.remove('is-shown');
        });
        if (date) date.classList.toggle('is-shown');
    });
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
setupDateTooltip();
highlightAndScrollToSearch();
