// Simple navigation highlighting
document.addEventListener('DOMContentLoaded', function () {
    const navLinks = document.querySelectorAll('.mobile-nav a');

    // Navigation functionality
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');

            // Only prevent default for anchor links (starting with #)
            if (href && href.startsWith('#')) {
                e.preventDefault();
            }

            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));

            // Add active class to clicked link
            this.classList.add('active');
        });
    });

    // Sliding hover pill effect for mobile nav
    const mobileNav = document.querySelector('.mobile-nav');
    const navItems = document.querySelectorAll('.mobile-nav-item');

    if (mobileNav && navItems.length > 0) {
        function updateHoverPillPosition(element) {
            const navRect = mobileNav.getBoundingClientRect();
            const itemRect = element.getBoundingClientRect();

            // Calculate position relative to the nav container
            const left = itemRect.left - navRect.left;
            const top = itemRect.top - navRect.top;
            const width = itemRect.width;
            const height = itemRect.height;

            mobileNav.style.setProperty('--hover-left', left + 'px');
            mobileNav.style.setProperty('--hover-top', top + 'px');
            mobileNav.style.setProperty('--hover-width', width + 'px');
            mobileNav.style.setProperty('--hover-height', height + 'px');
        }

        // Initialize pill position to the active item
        const activeItem = document.querySelector('.mobile-nav-item.active');
        if (activeItem) {
            updateHoverPillPosition(activeItem);
        }

        navItems.forEach(item => {
            item.addEventListener('mouseenter', function () {
                updateHoverPillPosition(this);
                // Force reflow
                void mobileNav.offsetWidth;
                mobileNav.classList.add('nav-hover-active');
            });
        });

        mobileNav.addEventListener('mouseleave', function () {
            mobileNav.classList.remove('nav-hover-active');

            // Wait for transition to finish then smoothly reset position to active item
            setTimeout(() => {
                const currentActive = document.querySelector('.mobile-nav-item.active');
                if (currentActive) {
                    mobileNav.style.setProperty('transition', 'none');
                    updateHoverPillPosition(currentActive);
                    void mobileNav.offsetWidth;
                    mobileNav.style.removeProperty('transition');
                }
            }, 250); // wait roughly same duration as CSS transition
        });

        window.addEventListener('resize', function () {
            if (!mobileNav.classList.contains('nav-hover-active')) {
                const currentActive = document.querySelector('.mobile-nav-item.active');
                if (currentActive) {
                    updateHoverPillPosition(currentActive);
                }
            }
        });
    }
});

// Warm the browser cache for /gems photos on every page load, so they're
// already loaded by the time the user visits the Gems page. Runs at idle
// priority to not compete with the current page's own assets.
(function preloadGemPhotos() {
    const load = () => {
        fetch('/data/gems.json')
            .then(r => r.ok ? r.json() : [])
            .then(gems => {
                (Array.isArray(gems) ? gems : []).forEach(g => {
                    if (g.type === 'photo' && g.src) new Image().src = g.src;
                });
            })
            .catch(() => {});
    };
    if ('requestIdleCallback' in window) requestIdleCallback(load);
    else setTimeout(load, 1000);
})();
