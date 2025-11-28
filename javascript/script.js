// Simple navigation highlighting
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.navbar a');
    const themeToggle = document.getElementById('themeToggle');
    const searchIconBtn = document.getElementById('searchIconBtn');
    const searchBox = document.getElementById('searchBox');
    const searchCloseBtn = document.getElementById('searchCloseBtn');
    const searchInput = document.getElementById('searchInput');
    const mobileSearchBtn = document.getElementById('mobileSearchBtn');

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

    // Mobile Search Functionality
    if (mobileSearchBtn) {
        // Create mobile search overlay
        const mobileSearchOverlay = document.createElement('div');
        mobileSearchOverlay.className = 'mobile-search-overlay';
        mobileSearchOverlay.innerHTML = `
            <div class="mobile-search-container">
                <div class="mobile-search-header">
                    <input type="text" class="mobile-search-input" placeholder="Search...">
                    <button class="mobile-search-close">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(mobileSearchOverlay);

        const mobileSearchInput = mobileSearchOverlay.querySelector('.mobile-search-input');
        const mobileSearchClose = mobileSearchOverlay.querySelector('.mobile-search-close');

        // Open mobile search
        mobileSearchBtn.addEventListener('click', function(e) {
            e.preventDefault();
            mobileSearchOverlay.classList.add('active');
            // Small delay to ensure overlay is visible before focusing
            setTimeout(() => {
                mobileSearchInput.focus();
            }, 100);
        });

        // Close mobile search
        mobileSearchClose.addEventListener('click', function() {
            mobileSearchOverlay.classList.remove('active');
            mobileSearchInput.value = '';
        });

        // Handle search submission on mobile
        mobileSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const query = mobileSearchInput.value.trim();
                if (query) {
                    const isInHtmlFolder = window.location.pathname.includes('/html/');
                    const indexPath = isInHtmlFolder ? '../index.html' : 'index.html';
                    window.location.href = `${indexPath}?q=${encodeURIComponent(query)}`;
                }
            }
        });

        // Close overlay when clicking outside
        mobileSearchOverlay.addEventListener('click', function(e) {
            if (e.target === mobileSearchOverlay) {
                mobileSearchOverlay.classList.remove('active');
                mobileSearchInput.value = '';
            }
        });
    }

    // Fetch and display most recent blog post in Projects section
    fetchRecentPost();
});

async function fetchRecentPost() {
    const REPO_OWNER = 'irrssue';
    const REPO_NAME = 'irrssue.github.io';
    const BRANCH = 'main';
    const POSTS_DIR = 'posts';

    const writingDescElement = document.querySelector('.project-link[href="html/writing.html"] .project-description');

    // If we're not on the homepage or element doesn't exist, skip
    if (!writingDescElement) return;

    try {
        // Fetch list of files in posts directory
        const response = await fetch(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${POSTS_DIR}?ref=${BRANCH}`
        );

        if (!response.ok) {
            return; // Keep default description on error
        }

        const files = await response.json();

        // Filter only .md files and exclude _template.md
        const postFiles = files.filter(file =>
            file.name.endsWith('.md') && file.name !== '_template.md'
        );

        if (postFiles.length === 0) {
            return; // Keep default description if no posts
        }

        // Fetch and parse each post's front matter
        const posts = await Promise.all(
            postFiles.map(async (file) => {
                try {
                    const contentResponse = await fetch(file.download_url);
                    const content = await contentResponse.text();

                    // Parse front matter
                    const frontMatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
                    if (!frontMatterMatch) return null;

                    const frontMatter = jsyaml.load(frontMatterMatch[1]);

                    // Skip draft posts
                    if (frontMatter.draft === true) return null;

                    return {
                        title: frontMatter.title || 'Untitled',
                        date: frontMatter.date || '',
                        dateObj: new Date(frontMatter.date || 0)
                    };
                } catch (error) {
                    console.error(`Error parsing ${file.name}:`, error);
                    return null;
                }
            })
        );

        // Filter out null values and sort by date (newest first)
        const validPosts = posts
            .filter(post => post !== null)
            .sort((a, b) => b.dateObj - a.dateObj);

        if (validPosts.length > 0) {
            // Update with most recent post title
            writingDescElement.textContent = validPosts[0].title;
        }

    } catch (error) {
        console.error('Error fetching recent post:', error);
        // Keep default description on error
    }
}