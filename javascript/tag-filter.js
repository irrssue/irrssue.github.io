// Shared by /writing and /bookmarks. Both lists are rendered at build time by
// scripts/build_site.py, so this only filters what's already in the DOM and
// both pages read fine without JS.
//
// Container opts in with: <div data-tag-filter data-noun="essay">

(function () {
    const container = document.querySelector('[data-tag-filter]');
    if (!container) return;

    const noun = container.dataset.noun || 'item';
    let currentFilter = null;

    const empty = document.createElement('div');
    empty.className = 'bk-empty';
    empty.textContent = `No ${noun}s found with this tag.`;
    empty.hidden = true;
    container.appendChild(empty);

    function apply(tag) {
        currentFilter = tag || null;
        let shown = 0;

        container.querySelectorAll('.bk-month').forEach(month => {
            let visible = 0;
            month.querySelectorAll('.bk-item').forEach(item => {
                const match = !currentFilter || item.dataset.tag === currentFilter;
                item.hidden = !match;
                if (match) visible++;
            });
            month.hidden = visible === 0;
            shown += visible;

            const count = month.querySelector('.bk-month-count');
            if (count) count.textContent = `· ${visible} ${noun}${visible === 1 ? '' : 's'}`;
        });

        empty.hidden = shown > 0;

        document.querySelectorAll('.bk-chip').forEach(chip => {
            chip.classList.toggle(
                'on',
                chip.dataset.tag ? chip.dataset.tag === currentFilter : !currentFilter
            );
        });

        const url = new URL(window.location);
        if (currentFilter) {
            url.searchParams.set('tag', currentFilter);
        } else {
            url.searchParams.delete('tag');
        }
        window.history.replaceState({}, '', url);
    }

    function toggle(tag) {
        apply(currentFilter === tag ? null : tag);
    }

    document.querySelectorAll('.bk-chip').forEach(chip => {
        chip.addEventListener('click', () => toggle(chip.dataset.tag));
    });
    container.querySelectorAll('.bk-item-tag').forEach(tagEl => {
        tagEl.addEventListener('click', () => toggle(tagEl.dataset.tag));
    });

    const initial = new URLSearchParams(window.location.search).get('tag');
    if (initial) apply(initial.toLowerCase());
}());
