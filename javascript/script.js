// Simple navigation highlighting
document.addEventListener('DOMContentLoaded', function() {
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
    const isMobile = () => window.innerWidth <= 768;

    themeToggle.addEventListener('click', function() {
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