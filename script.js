// Dark Mode Functionality
class DarkModeToggle {
    constructor() {
        this.darkModeBtn = document.getElementById('darkModeBtn');
        this.currentTheme = localStorage.getItem('theme') || 'light';
        
        this.init();
    }
    
    init() {
        // Set initial theme
        this.setTheme(this.currentTheme);
        
        // Add event listener
        this.darkModeBtn.addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // Listen for system theme changes
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
        
        // Save to localStorage
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
        
        // Only apply system preference if user hasn't manually set a preference
        if (!localStorage.getItem('theme')) {
            this.setTheme(mediaQuery.matches ? 'dark' : 'light');
        }
        
        mediaQuery.addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
}

// Navigation Functionality
class Navigation {
    constructor() {
        this.sidebarLinks = document.querySelectorAll('.sidebar-link');
        this.init();
    }
    
    init() {
        this.sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                this.handleNavClick(e, link);
            });
        });
        
        // Handle scroll-based active states
        this.handleScrollNavigation();
    }
    
    handleNavClick(event, clickedLink) {
        const href = clickedLink.getAttribute('href');
        
        // Only handle internal navigation links
        if (href && href.startsWith('#')) {
            event.preventDefault();
            
            // Remove active class from all links
            this.sidebarLinks.forEach(link => {
                link.classList.remove('active');
            });
            
            // Add active class to clicked link
            clickedLink.classList.add('active');
            
            // Smooth scroll to section if it exists
            const targetSection = document.querySelector(href);
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    }
    
    handleScrollNavigation() {
        // This would be expanded for multiple sections
        const sections = document.querySelectorAll('section[id]');
        
        if (sections.length > 0) {
            window.addEventListener('scroll', () => {
                this.updateActiveNavOnScroll(sections);
            });
        }
    }
    
    updateActiveNavOnScroll(sections) {
        const scrollPosition = window.scrollY + 100;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                // Remove active from all links
                this.sidebarLinks.forEach(link => {
                    link.classList.remove('active');
                });
                
                // Add active to corresponding nav link
                const activeLink = document.querySelector(`.sidebar-link[href="#${sectionId}"]`);
                if (activeLink) {
                    activeLink.classList.add('active');
                }
            }
        });
    }
}

// Enhanced Interactions
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
        // Add subtle animations to project and work items
        const items = document.querySelectorAll('.work-item, .project-item');
        
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
        // Add click feedback to buttons and links
        const clickableElements = document.querySelectorAll('button, .sidebar-link, .social-link, .project-link');
        
        clickableElements.forEach(element => {
            element.addEventListener('click', function(e) {
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
        const style = document.createElement('style');
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
    
    addKeyboardNavigation() {
        // Enhanced keyboard navigation
        document.addEventListener('keydown', (e) => {
            // Toggle dark mode with Ctrl/Cmd + D
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                document.getElementById('darkModeBtn').click();
            }
            
            // Focus management for sidebar navigation
            if (e.key === 'Tab') {
                this.handleTabNavigation(e);
            }
        });
    }
    
    handleTabNavigation(event) {
        const focusableElements = document.querySelectorAll(
            'a[href], button, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
        }
    }
}

// Performance and Accessibility Enhancements
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
        // Add ARIA labels for better screen reader support
        const sidebar = document.querySelector('.sidebar');
        sidebar.setAttribute('role', 'navigation');
        sidebar.setAttribute('aria-label', 'Main navigation');
        
        const mainContent = document.querySelector('.main-content');
        mainContent.setAttribute('role', 'main');
        
        // Add aria-current for active navigation
        const activeLink = document.querySelector('.sidebar-link.active');
        if (activeLink) {
            activeLink.setAttribute('aria-current', 'page');
        }
    }
    
    addSkipNavigation() {
        // Add skip to main content link for keyboard users
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
        // Respect user's motion preferences
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
        // Enhanced focus indicators for keyboard navigation
        const style = document.createElement('style');
        style.textContent = `
            .sidebar-link:focus,
            .dark-mode-btn:focus,
            .social-link:focus,
            .project-link:focus {
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

// Mobile Navigation Handler
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
        // Create mobile menu toggle button
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
        // Close mobile nav when clicking overlay
        this.overlay.addEventListener('click', () => {
            this.closeMobileNav();
        });
        
        // Close mobile nav when clicking nav links
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    this.closeMobileNav();
                }
            });
        });
        
        // Handle escape key
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
        
        // Update mobile toggle icon
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
        
        // Update mobile toggle icon
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
    🚀 Portfolio Website Loaded Successfully!
    
    Features:
    - Dark/Light Mode Toggle (Ctrl/Cmd + D)
    - Responsive Navigation
    - Accessibility Enhancements
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