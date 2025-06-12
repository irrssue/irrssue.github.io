// Development Notice Protection
document.addEventListener('DOMContentLoaded', function() {
    const overlay = document.getElementById('devNoticeOverlay');
    
    if (overlay) {
        // Disable right-click on overlay
        overlay.addEventListener('contextmenu', function(e) {
            e.preventDefault();
        });
        
        // Disable escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
            }
        });
        
        console.log('🚧 Development notice active - remove from HTML to disable');
    }
});





// Enhanced Dark Mode Functionality with localStorage persistence
class DarkModeToggle {
    constructor() {
        this.darkModeBtn = document.getElementById('darkModeBtn');
        // Check localStorage first, then system preference
        this.currentTheme = localStorage.getItem('theme') || 
                           (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        
        this.init();
    }
    
    init() {
        // Set initial theme
        this.setTheme(this.currentTheme);
        
        // Add event listener
        this.darkModeBtn.addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // Listen for system theme changes (only if no manual preference set)
        this.listenForSystemThemeChange();
    }
    
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        
        // Update button icon
        const icon = this.darkModeBtn.querySelector('i');
        if (theme === 'dark') {
            icon.className = 'fas fa-sun';
            this.darkModeBtn.setAttribute('aria-label', 'Switch to light mode');
        } else {
            icon.className = 'fas fa-moon';
            this.darkModeBtn.setAttribute('aria-label', 'Switch to dark mode');
        }
        
        // Save to localStorage for persistence across pages
        localStorage.setItem('theme', theme);
        
        // Add animation class
        document.body.classList.add('theme-transition');
        setTimeout(() => {
            document.body.classList.remove('theme-transition');
        }, 300);
    }
    
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }
    
    listenForSystemThemeChange() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        mediaQuery.addEventListener('change', (e) => {
            // Only apply system preference if user hasn't manually set a preference
            if (!localStorage.getItem('theme')) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
}

// Single Page Application Router
class SPARouter {
    constructor() {
        this.routes = {
            'home': 'home',
            'writing': 'writing'
        };
        this.currentPage = null;
        this.init();
    }
    
    init() {
        // Handle navigation clicks
        this.setupNavigation();
        
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            this.handleRouteChange(e.state?.page || 'home');
        });
        
        // Load initial page based on URL hash
        const initialPage = this.getPageFromHash() || 'writing'; // Default to writing since this is writing.html
        this.navigateTo(initialPage, true);
    }
    
    setupNavigation() {
        const navLinks = document.querySelectorAll('.sidebar-link[data-page]');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                this.navigateTo(page);
            });
        });
    }
    
    getPageFromHash() {
        const hash = window.location.hash.slice(1); // Remove #
        return this.routes[hash] ? hash : null;
    }
    
    navigateTo(page, isInitial = false) {
        if (!this.routes[page] || this.currentPage === page) return;
        
        // Update URL without page reload
        if (!isInitial) {
            history.pushState({ page }, '', `#${page}`);
        }
        
        // Update page title
        this.updatePageTitle(page);
        
        // Handle route change
        this.handleRouteChange(page);
    }
    
    updatePageTitle(page) {
        const titles = {
            'home': 'Liam Rolert',
            'writing': 'Writing - Liam Rolert'
        };
        document.title = titles[page] || 'Liam Rolert';
    }
    
    handleRouteChange(page) {
        // Hide all sections
        const sections = document.querySelectorAll('main section');
        sections.forEach(section => {
            section.style.display = 'none';
        });
        
        // Show target section
        const targetSection = document.getElementById(page);
        if (targetSection) {
            targetSection.style.display = 'block';
        }
        
        // Update active navigation
        this.updateActiveNavigation(page);
        
        // Update current page
        this.currentPage = page;
        
        // Scroll to top for better UX
        window.scrollTo(0, 0);
    }
    
    updateActiveNavigation(page) {
        // Remove active class from all nav links
        const navLinks = document.querySelectorAll('.sidebar-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to current page link
        const activeLink = document.querySelector(`.sidebar-link[data-page="${page}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }
}

// Enhanced Navigation with SPA support
class Navigation {
    constructor() {
        this.sidebarLinks = document.querySelectorAll('.sidebar-link');
        this.init();
    }
    
    init() {
        // Handle non-SPA links (external links, etc.)
        this.sidebarLinks.forEach(link => {
            if (!link.hasAttribute('data-page')) {
                link.addEventListener('click', (e) => {
                    this.handleExternalNavClick(e, link);
                });
            }
        });
    }
    
    handleExternalNavClick(event, clickedLink) {
        const href = clickedLink.getAttribute('href');
        
        // Handle external links normally
        if (href && (href.startsWith('http') || href.startsWith('mailto') || href.includes('target="_blank"'))) {
            return; // Let browser handle normally
        }
        
        // Handle internal anchor links
        if (href && href.startsWith('#') && !clickedLink.hasAttribute('data-page')) {
            event.preventDefault();
            const targetSection = document.querySelector(href);
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    }
}

// Enhanced Interactions (keeping existing functionality)
class EnhancedInteractions {
    constructor() {
        this.init();
    }
    
    init() {
        this.addHoverEffects();
        this.addClickAnimations();
        this.addKeyboardNavigation();
    }
    
    addHoverEffects() {
        const items = document.querySelectorAll('.work-item, .project-item, .post-item');
        
        items.forEach(item => {
            item.addEventListener('mouseenter', () => {
                item.style.transform = 'translateY(-2px)';
            });
            
            item.addEventListener('mouseleave', () => {
                item.style.transform = 'translateY(0)';
            });
        });
    }
    
    addClickAnimations() {
        const clickableElements = document.querySelectorAll('button, .sidebar-link, .social-link, .project-link, .post-link');
        
        clickableElements.forEach(element => {
            element.addEventListener('click', function(e) {
                // Skip animation for navigation links (handled by router)
                if (this.hasAttribute('data-page')) return;
                
                // Create ripple effect
                const ripple = document.createElement('span');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                
                ripple.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    left: ${x}px;
                    top: ${y}px;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    transform: scale(0);
                    animation: ripple 0.6s linear;
                    pointer-events: none;
                `;
                
                this.style.position = 'relative';
                this.style.overflow = 'hidden';
                this.appendChild(ripple);
                
                setTimeout(() => {
                    ripple.remove();
                }, 600);
            });
        });
        
        // Add CSS for ripple animation
        if (!document.querySelector('#ripple-styles')) {
            const style = document.createElement('style');
            style.id = 'ripple-styles';
            style.textContent = `
                @keyframes ripple {
                    to {
                        transform: scale(4);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    addKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Toggle dark mode with Ctrl/Cmd + D
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                document.getElementById('darkModeBtn').click();
            }
        });
    }
}

// Accessibility Enhancements (keeping existing functionality)
class AccessibilityEnhancements {
    constructor() {
        this.init();
    }
    
    init() {
        this.addAriaLabels();
        this.addSkipNavigation();
        this.handleReducedMotion();
        this.addFocusIndicators();
    }
    
    addAriaLabels() {
        const sidebar = document.querySelector('.sidebar');
        sidebar.setAttribute('role', 'navigation');
        sidebar.setAttribute('aria-label', 'Main navigation');
        
        const mainContent = document.querySelector('.main-content');
        mainContent.setAttribute('role', 'main');
    }
    
    addSkipNavigation() {
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.textContent = 'Skip to main content';
        skipLink.className = 'skip-link';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 6px;
            background: var(--accent-color);
            color: white;
            padding: 8px;
            text-decoration: none;
            border-radius: 4px;
            z-index: 1001;
            transition: top 0.3s;
        `;
        
        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '6px';
        });
        
        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);
    }
    
    handleReducedMotion() {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        
        if (mediaQuery.matches) {
            document.documentElement.style.setProperty('--transition-duration', '0s');
        }
        
        mediaQuery.addEventListener('change', (e) => {
            if (e.matches) {
                document.documentElement.style.setProperty('--transition-duration', '0s');
            } else {
                document.documentElement.style.setProperty('--transition-duration', '0.3s');
            }
        });
    }
    
    addFocusIndicators() {
        if (!document.querySelector('#focus-styles')) {
            const style = document.createElement('style');
            style.id = 'focus-styles';
            style.textContent = `
                .sidebar-link:focus,
                .dark-mode-btn:focus,
                .social-link:focus,
                .project-link:focus,
                .post-link:focus {
                    outline: 2px solid var(--accent-color);
                    outline-offset: 2px;
                }
                
                .sidebar-link:focus-visible,
                .dark-mode-btn:focus-visible {
                    outline: 2px solid var(--accent-color);
                    outline-offset: 2px;
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// Mobile Navigation Handler (keeping existing functionality)
class MobileNavigation {
    constructor() {
        this.sidebar = document.querySelector('.sidebar');
        this.overlay = document.querySelector('.mobile-overlay');
        this.isOpen = false;
        
        this.init();
    }
    
    init() {
        this.createMobileToggle();
        this.handleMobileInteractions();
        this.handleResize();
    }
    
    createMobileToggle() {
        const mobileToggle = document.createElement('button');
        mobileToggle.className = 'mobile-toggle';
        mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
        mobileToggle.setAttribute('aria-label', 'Toggle navigation menu');
        mobileToggle.style.cssText = `
            display: none;
            position: fixed;
            top: 24px;
            left: 24px;
            z-index: 1001;
            width: 48px;
            height: 48px;
            border: 2px solid var(--border-color);
            border-radius: 50%;
            background: var(--bg-secondary);
            color: var(--text-secondary);
            font-size: 18px;
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        
        mobileToggle.addEventListener('click', () => {
            this.toggleMobileNav();
        });
        
        document.body.appendChild(mobileToggle);
        this.mobileToggle = mobileToggle;
    }
    
    handleMobileInteractions() {
        this.overlay.addEventListener('click', () => {
            this.closeMobileNav();
        });
        
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    this.closeMobileNav();
                }
            });
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeMobileNav();
            }
        });
    }
    
    toggleMobileNav() {
        if (this.isOpen) {
            this.closeMobileNav();
        } else {
            this.openMobileNav();
        }
    }
    
    openMobileNav() {
        this.sidebar.style.transform = 'translateX(0)';
        this.overlay.style.display = 'block';
        this.overlay.style.opacity = '1';
        this.isOpen = true;
        document.body.style.overflow = 'hidden';
        
        this.mobileToggle.innerHTML = '<i class="fas fa-times"></i>';
        this.mobileToggle.setAttribute('aria-label', 'Close navigation menu');
    }
    
    closeMobileNav() {
        this.sidebar.style.transform = 'translateX(-100%)';
        this.overlay.style.opacity = '0';
        setTimeout(() => {
            this.overlay.style.display = 'none';
        }, 300);
        this.isOpen = false;
        document.body.style.overflow = '';
        
        this.mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
        this.mobileToggle.setAttribute('aria-label', 'Toggle navigation menu');
    }
    
    handleResize() {
        window.addEventListener('resize', () => {
            if (window.innerWidth <= 768) {
                this.mobileToggle.style.display = 'flex';
                this.overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 999;
                    display: none;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                `;
            } else {
                this.mobileToggle.style.display = 'none';
                this.sidebar.style.transform = '';
                this.overlay.style.display = 'none';
                this.isOpen = false;
                document.body.style.overflow = '';
            }
        });
        
        // Trigger resize check on load
        window.dispatchEvent(new Event('resize'));
    }
}

// Initialize all functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all classes
    new DarkModeToggle();
    new Navigation();
    new EnhancedInteractions();
    new AccessibilityEnhancements();
    new MobileNavigation();
    
    // Add loading animation
    document.body.classList.add('loaded');
    
    // Console message for developers
    console.log(`
    🚀 Enhanced Portfolio Website Loaded Successfully!
    
    New Features:
    - Single Page Application (SPA) Navigation
    - Persistent Dark Mode across pages
    - Client-side Routing (no page refreshes)
    - Enhanced Accessibility
    
    Original Features:
    - Dark/Light Mode Toggle (Ctrl/Cmd + D)
    - Responsive Navigation
    - Smooth Animations
    - Mobile Friendly
    
    Built with ❤️ for modern web development
    `);
});

// Add loading styles
const loadingStyles = document.createElement('style');
loadingStyles.textContent = `
    body {
        opacity: 0;
        transition: opacity 0.5s ease;
    }
    
    body.loaded {
        opacity: 1;
    }
    
    @media (prefers-reduced-motion: reduce) {
        body {
            opacity: 1;
            transition: none;
        }
    }
`;
document.head.appendChild(loadingStyles);