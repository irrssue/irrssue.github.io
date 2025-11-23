// Simple navigation highlighting
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.navbar a');
    const themeToggle = document.getElementById('themeToggle');
    const searchIconBtn = document.getElementById('searchIconBtn');
    const searchBox = document.getElementById('searchBox');
    const searchCloseBtn = document.getElementById('searchCloseBtn');
    const searchInput = document.getElementById('searchInput');

    // Navigation functionality
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
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

    // Theme toggle functionality - only on desktop
    const isMobile = () => window.innerWidth <= 768;

    themeToggle.addEventListener('click', function() {
        // Only allow manual toggle on desktop
        if (!isMobile()) {
            document.body.classList.toggle('dark-mode');

            // Save theme preference to localStorage
            const isDarkMode = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDarkMode);
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
            }
        });
    }

    // Search functionality
    searchIconBtn.addEventListener('click', function() {
        searchIconBtn.style.display = 'none';
        searchBox.classList.add('active');
        searchInput.focus();
    });

    searchCloseBtn.addEventListener('click', function() {
        searchBox.classList.remove('active');
        searchIconBtn.style.display = 'flex';
        searchInput.value = '';
    });

    // Handle search submission
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                // Redirect to index.html with search query
                // Use root-relative path to work from any page
                const isInHtmlFolder = window.location.pathname.includes('/html/');
                const indexPath = isInHtmlFolder ? '../index.html' : 'index.html';
                window.location.href = `${indexPath}?q=${encodeURIComponent(query)}`;
            }
        }
    });

    // Close search box when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchBox.contains(e.target) && !searchIconBtn.contains(e.target)) {
            if (searchBox.classList.contains('active')) {
                searchBox.classList.remove('active');
                searchIconBtn.style.display = 'flex';
                searchInput.value = '';
            }
        }
    });
});