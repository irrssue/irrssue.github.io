// Simple navigation highlighting
document.addEventListener('DOMContentLoaded', function () {
    const navLinks = document.querySelectorAll('.mobile-nav a');
    const themeToggle = document.getElementById('themeToggle');
    const sunIcon = themeToggle.querySelector('.sun-icon');
    const moonIcon = themeToggle.querySelector('.moon-icon');

    // Update theme toggle icons based on current mode
    function updateThemeIcons() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        if (isDarkMode) {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        } else {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        }
    }

    // Initialize icons on page load
    updateThemeIcons();

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

    // Theme toggle functionality
    const isMobile = () => window.innerWidth <= 768;

    themeToggle.addEventListener('click', function () {
        // Only allow manual toggle on desktop
        if (!isMobile()) {
            document.body.classList.toggle('dark-mode');

            // Save theme preference to localStorage
            const isDarkMode = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDarkMode);

            // Update icons
            updateThemeIcons();
        }
    });

    // Listen for system theme changes on mobile
    if (window.matchMedia) {
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

        darkModeQuery.addEventListener('change', (e) => {
            // Only apply system preference on mobile
            if (isMobile()) {
                if (e.matches) {
                    document.body.classList.add('dark-mode');
                } else {
                    document.body.classList.remove('dark-mode');
                }
                updateThemeIcons();
            }
        });
    }
});
