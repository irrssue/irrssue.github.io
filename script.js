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

    // Theme toggle functionality
    themeToggle.addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');

        // Save theme preference to localStorage
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);
    });

    // Load saved theme preference or default to dark mode
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme === null || savedTheme === 'true') {
        document.body.classList.add('dark-mode');
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