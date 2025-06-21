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
        if (this.darkModeBtn) {
            this.darkModeBtn.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
        
        // Listen for system theme changes (only if no manual preference set)
        this.listenForSystemThemeChange();
    }
    
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        
        if (this.darkModeBtn) {
            // Update button icon
            const icon = this.darkModeBtn.querySelector('i');
            if (theme === 'dark') {
                icon.className = 'fas fa-sun';
                this.darkModeBtn.setAttribute('aria-label', 'Switch to light mode');
            } else {
                icon.className = 'fas fa-moon';
                this.darkModeBtn.setAttribute('aria-label', 'Switch to dark mode');
            }
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

// Enhanced Single Page Application Router with Blog Popup
class SPARouter {
    constructor() {
        this.routes = {
            'home': 'home',
            'writing': 'writing'
        };
        this.currentPage = null;
        this.blogPosts = [];
        this.markdownCache = new Map();
        this.init();
    }
    
    async init() {
        this.setupNavigation();
        this.setupBlogPopup();
        await this.loadBlogPosts();
        this.handleInitialRoute();
        
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            const page = e.state?.page || this.getPageFromHash() || 'home';
            this.navigateTo(page, false);
        });
    }
    
    setupNavigation() {
        // Handle SPA navigation links
        document.addEventListener('click', (e) => {
            const spaLink = e.target.closest('.spa-nav');
            if (spaLink) {
                e.preventDefault();
                const page = spaLink.getAttribute('data-page');
                if (page) {
                    this.navigateTo(page);
                }
            }
        });
    }
    
    setupBlogPopup() {
        const popup = document.getElementById('blogPopup');
        const overlay = document.getElementById('blogPopupOverlay');
        const closeBtn = document.getElementById('blogPopupClose');
        
        if (!popup || !overlay || !closeBtn) return;
        
        // Close popup when clicking overlay
        overlay.addEventListener('click', () => {
            this.closeBlogPopup();
        });
        
        // Close popup when clicking close button
        closeBtn.addEventListener('click', () => {
            this.closeBlogPopup();
        });
        
        // Close popup with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && popup.classList.contains('active')) {
                this.closeBlogPopup();
            }
        });
    }
    
    async loadBlogPosts() {
        try {
            // Try to load from your existing blog.json
            const response = await fetch('./writing/blog.json');
            if (response.ok) {
                const data = await response.json();
                this.blogPosts = data.posts || [];
                console.log('📄 Loaded blog posts:', this.blogPosts.length);
            } else {
                throw new Error('Could not load blog.json');
            }
        } catch (error) {
            console.log('Using fallback blog posts');
            // Fallback blog posts
            this.blogPosts = [
                {
                    id: "team-communication-broken",
                    title: "Team communication is broken",
                    date: "August 7, 2024",
                    excerpt: "How poor communication patterns are destroying team productivity and what we can do about it.",
                    markdown: "writing/blogs/team-communication-broken.md"  // ← Fixed typo
                },
                {
                    id: "test",
                    title: "testing",
                    date: "August 9, 2024",
                    excerpt: "How poor communication patterns are destroying team productivity and what we can do about it.",
                    markdown: "writing/blogs/testing.md"
                }
            ];
        }
        
        this.renderBlogPosts();
    }
    
    renderBlogPosts() {
        const container = document.getElementById('blogPostsPreview');
        if (!container) return;
        
        container.innerHTML = this.blogPosts.map(post => `
            <article class="blog-post-preview" onclick="router.openBlogPost('${post.id}')" tabindex="0" role="button">
                <h3>${this.escapeHtml(post.title)}</h3>
                <div class="post-date">${this.escapeHtml(post.date)}</div>
                <p class="post-excerpt">${this.escapeHtml(post.excerpt)}</p>
            </article>
        `).join('');
        
        // Add keyboard support for blog post previews
        container.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('blog-post-preview') && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                e.target.click();
            }
        });
    }
    
    async openBlogPost(postId) {
        const post = this.blogPosts.find(p => p.id === postId);
        if (!post) return;
        
        const popup = document.getElementById('blogPopup');
        const title = document.getElementById('popupBlogTitle');
        const date = document.getElementById('popupBlogDate');
        const content = document.getElementById('popupBlogContent');
        
        if (!popup || !title || !date || !content) return;
        
        // Show popup immediately
        popup.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Set basic info
        title.textContent = post.title;
        date.textContent = post.date;
        
        // Show loading state
        content.innerHTML = `
            <div style="text-align: center; padding: 48px 0; color: var(--text-secondary);">
                <i class="fas fa-spinner fa-spin fa-2x"></i>
                <p style="margin-top: 16px;">Loading content...</p>
            </div>
        `;
        
        try {
            // Load markdown content if available
            if (post.markdown) {
                const htmlContent = await this.loadMarkdownContent(post.markdown);
                content.innerHTML = htmlContent;
            } else if (post.content) {
                content.innerHTML = post.content;
            } else {
                content.innerHTML = '<p>No content available for this post.</p>';
            }
        } catch (error) {
            console.error('Error loading blog post:', error);
            content.innerHTML = '<p>Error loading post content. Please try again.</p>';
        }
        
        // Scroll to top of popup content
        const popupBody = popup.querySelector('.blog-popup-body');
        if (popupBody) {
            popupBody.scrollTop = 0;
        }
        
        // Focus management for accessibility
        const closeButton = document.getElementById('blogPopupClose');
        if (closeButton) {
            closeButton.focus();
        }
    }
    
    async loadMarkdownContent(markdownPath) {
        try {
            if (this.markdownCache.has(markdownPath)) {
                console.log('📋 Loading from cache:', markdownPath);
                return this.markdownCache.get(markdownPath);
            }
            
            console.log('📡 Fetching markdown file:', markdownPath);
            const response = await fetch(markdownPath);
            
            if (!response.ok) {
                throw new Error(`Failed to load markdown: ${response.status}`);
            }
            
            const markdownText = await response.text();
            const htmlContent = this.parseMarkdown(markdownText);
            
            this.markdownCache.set(markdownPath, htmlContent);
            
            return htmlContent;
            
        } catch (error) {
            console.error('❌ Error loading markdown:', error);
            return `<p>Error loading content from ${markdownPath}</p><p>Please check that the file exists and is accessible.</p>`;
        }
    }
    
    parseMarkdown(markdownText) {
        console.log('🔍 Parsing markdown, length:', markdownText.length);
        
        let html = markdownText;
        
        // Images FIRST (before links to avoid conflicts)
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
            console.log('🖼️ Found image:', { alt, src });
            return `<img src="${src}" alt="${alt}" class="blog-image" loading="lazy">`;
        });
        
        // Links (after images)
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
        
        // Headers (must be on their own lines)
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        
        // Bold and Italic
        html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Code blocks (before inline code)
        html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            return `<pre><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
        });
        
        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Lists
        html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
        html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
        
        // Wrap consecutive list items in ul tags
        html = html.replace(/(<li>.*<\/li>)(\n<li>.*<\/li>)*/g, (match) => {
            return `<ul>${match}</ul>`;
        });
        
        // Blockquotes
        html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
        
        // Line breaks and paragraphs
        html = html.split('\n\n').map(paragraph => {
            paragraph = paragraph.trim();
            if (!paragraph) return '';
            
            // Don't wrap certain elements in p tags
            if (paragraph.match(/^<(h[1-6]|ul|ol|li|blockquote|pre|img|div)/)) {
                return paragraph;
            }
            
            return `<p>${paragraph}</p>`;
        }).join('\n');
        
        // Clean up
        html = html.replace(/\n+/g, '\n');
        html = html.replace(/^\s+|\s+$/g, '');
        
        console.log('✅ Markdown parsed, result length:', html.length);
        return html;
    }
    
    closeBlogPopup() {
        const popup = document.getElementById('blogPopup');
        if (popup) {
            popup.classList.remove('active');
            document.body.style.overflow = '';
            
            // Return focus to the writing page
            const writingSection = document.getElementById('writing');
            if (writingSection && writingSection.classList.contains('active')) {
                writingSection.focus();
            }
        }
    }
    
    navigateTo(page, updateHistory = true) {
        if (!this.routes[page] || this.currentPage === page) return;
        
        console.log(`🔄 Navigating from ${this.currentPage} to ${page}`);
        
        // Close any open blog popup
        this.closeBlogPopup();
        
        // Hide current page
        const currentSection = document.getElementById(this.currentPage);
        if (currentSection) {
            currentSection.classList.remove('active');
        }
        
        // Show new page
        const newSection = document.getElementById(page);
        if (newSection) {
            newSection.classList.add('active');
            this.currentPage = page;
            
            // Update page title
            this.updatePageTitle(page);
            
            // Update active navigation
            this.updateActiveNavigation(page);
            
            // Update URL without page refresh
            if (updateHistory) {
                const newUrl = page === 'home' ? '/' : `/#${page}`;
                history.pushState({ page }, this.getPageTitle(page), newUrl);
            }
            
            // Scroll to top for better UX
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
    
    updatePageTitle(page) {
        const titles = {
            'home': 'Liam Rolert',
            'writing': 'Writing - Liam Rolert'
        };
        document.title = titles[page] || 'Liam Rolert';
    }
    
    getPageTitle(page) {
        const titles = {
            'home': 'Liam Rolert',
            'writing': 'Writing - Liam Rolert'
        };
        return titles[page] || 'Liam Rolert';
    }
    
    updateActiveNavigation(page) {
        // Remove active class from all nav links
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to current page link
        const activeLink = document.querySelector(`.sidebar-link[data-page="${page}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }
    
    getPageFromHash() {
        const hash = window.location.hash.slice(1);
        return this.routes[hash] ? hash : null;
    }
    
    handleInitialRoute() {
        const hash = this.getPageFromHash();
        const initialPage = hash || 'home';
        this.navigateTo(initialPage, false);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
        if (href && (href.startsWith('http') || href.startsWith('mailto') || clickedLink.hasAttribute('target'))) {
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

// Enhanced Grid Interactions
class GridInteractions {
    constructor() {
        this.init();
    }
    
    init() {
        this.addHoverEffects();
        this.addClickAnimations();
        this.addKeyboardNavigation();
        this.setupGridAnimations();
    }
    
    addHoverEffects() {
        const items = document.querySelectorAll('.grid-item, .work-grid-item, .project-item, .post-item, .blog-post-preview');
        
        items.forEach(item => {
            item.addEventListener('mouseenter', () => {
                item.style.transform = 'translateY(-1px)';
            });
            
            item.addEventListener('mouseleave', () => {
                item.style.transform = 'translateY(0)';
            });
        });
    }
    
    addClickAnimations() {
        const clickableElements = document.querySelectorAll('button, .sidebar-link, .grid-item, .work-grid-item, .project-link, .post-link, .blog-post-preview');
        
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
                const darkModeBtn = document.getElementById('darkModeBtn');
                if (darkModeBtn) {
                    darkModeBtn.click();
                }
            }
            
            // Navigate grid items with arrow keys
            this.handleGridKeyNavigation(e);
        });
    }
    
    handleGridKeyNavigation(e) {
        const focusedElement = document.activeElement;
        if (!focusedElement.classList.contains('grid-item') && 
            !focusedElement.classList.contains('work-grid-item') &&
            !focusedElement.classList.contains('blog-post-preview')) return;
        
        const container = focusedElement.closest('.grid-container, .blog-posts-preview');
        if (!container) return;
        
        const items = Array.from(container.querySelectorAll('.grid-item, .work-grid-item, .blog-post-preview'));
        const currentIndex = items.indexOf(focusedElement);
        
        let newIndex = currentIndex;
        
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                newIndex = Math.min(currentIndex + 1, items.length - 1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                newIndex = Math.max(currentIndex - 1, 0);
                break;
            case 'Home':
                e.preventDefault();
                newIndex = 0;
                break;
            case 'End':
                e.preventDefault();
                newIndex = items.length - 1;
                break;
        }
        
        if (newIndex !== currentIndex) {
            items[newIndex].focus();
        }
    }
    
    setupGridAnimations() {
        // Animate grid items on scroll
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animation = 'fadeInUp 0.6s ease-out forwards';
                }
            });
        }, observerOptions);
        
        // Observe all grid sections
        document.querySelectorAll('.grid-section').forEach(section => {
            observer.observe(section);
        });
        
        // Add CSS for fade in animation
        if (!document.querySelector('#grid-animations')) {
            const style = document.createElement('style');
            style.id = 'grid-animations';
            style.textContent = `
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .grid-section {
                    opacity: 0;
                }
                
                @media (prefers-reduced-motion: reduce) {
                    .grid-section {
                        opacity: 1;
                        animation: none !important;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// Accessibility Enhancements
class AccessibilityEnhancements {
    constructor() {
        this.init();
    }
    
    init() {
        this.addAriaLabels();
        this.addSkipNavigation();
        this.handleReducedMotion();
        this.addFocusIndicators();
        this.setupKeyboardTraps();
    }
    
    addAriaLabels() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.setAttribute('role', 'navigation');
            sidebar.setAttribute('aria-label', 'Main navigation');
        }
        
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.setAttribute('role', 'main');
        }
        
        // Add aria labels to grid items
        document.querySelectorAll('.grid-item').forEach((item, index) => {
            const label = item.querySelector('.item-label');
            if (label) {
                item.setAttribute('aria-label', label.textContent);
            }
            item.setAttribute('tabindex', '0');
        });
        
        // Add aria labels to work items
        document.querySelectorAll('.work-grid-item').forEach((item, index) => {
            const company = item.querySelector('.work-company');
            const role = item.querySelector('.work-role');
            if (company && role) {
                item.setAttribute('aria-label', `${company.textContent}, ${role.textContent}`);
            }
            item.setAttribute('tabindex', '0');
        });
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
                .grid-item:focus,
                .work-grid-item:focus,
                .project-link:focus,
                .post-link:focus,
                .blog-post-preview:focus {
                    outline: 2px solid var(--accent-color);
                    outline-offset: 2px;
                }
                
                .sidebar-link:focus-visible,
                .dark-mode-btn:focus-visible,
                .grid-item:focus-visible,
                .work-grid-item:focus-visible {
                    outline: 2px solid var(--accent-color);
                    outline-offset: 2px;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    setupKeyboardTraps() {
        // Ensure grid items are focusable and properly navigable
        document.querySelectorAll('.grid-container').forEach(container => {
            const items = container.querySelectorAll('.grid-item, .work-grid-item');
            
            items.forEach((item, index) => {
                // Make items focusable
                if (!item.hasAttribute('tabindex')) {
                    item.setAttribute('tabindex', '0');
                }
                
                // Add role for screen readers
                item.setAttribute('role', 'button');
                
                // Handle Enter and Space key activation
                item.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        item.click();
                    }
                });
            });
        });
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
        if (this.overlay) {
            this.overlay.addEventListener('click', () => {
                this.closeMobileNav();
            });
        }
        
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
        if (this.sidebar) {
            this.sidebar.style.transform = 'translateX(0)';
        }
        if (this.overlay) {
            this.overlay.style.display = 'block';
            this.overlay.style.opacity = '1';
        }
        this.isOpen = true;
        document.body.style.overflow = 'hidden';
        
        this.mobileToggle.innerHTML = '<i class="fas fa-times"></i>';
        this.mobileToggle.setAttribute('aria-label', 'Close navigation menu');
    }
    
    closeMobileNav() {
        if (this.sidebar) {
            this.sidebar.style.transform = 'translateX(-100%)';
        }
        if (this.overlay) {
            this.overlay.style.opacity = '0';
            setTimeout(() => {
                this.overlay.style.display = 'none';
            }, 300);
        }
        this.isOpen = false;
        document.body.style.overflow = '';
        
        this.mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
        this.mobileToggle.setAttribute('aria-label', 'Toggle navigation menu');
    }
    
    handleResize() {
        window.addEventListener('resize', () => {
            if (window.innerWidth <= 768) {
                this.mobileToggle.style.display = 'flex';
                if (this.overlay) {
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
                }
            } else {
                this.mobileToggle.style.display = 'none';
                if (this.sidebar) {
                    this.sidebar.style.transform = '';
                }
                if (this.overlay) {
                    this.overlay.style.display = 'none';
                }
                this.isOpen = false;
                document.body.style.overflow = '';
            }
        });
        
        // Trigger resize check on load
        window.dispatchEvent(new Event('resize'));
    }
}

// Performance Monitor
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            loadTime: 0,
            domContentLoaded: 0,
            firstPaint: 0,
            firstContentfulPaint: 0
        };
        this.init();
    }
    
    init() {
        // Measure load time
        window.addEventListener('load', () => {
            this.metrics.loadTime = performance.now();
            this.logMetrics();
        });
        
        // Measure DOM content loaded
        document.addEventListener('DOMContentLoaded', () => {
            this.metrics.domContentLoaded = performance.now();
        });
        
        // Measure paint metrics
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    if (entry.name === 'first-paint') {
                        this.metrics.firstPaint = entry.startTime;
                    }
                    if (entry.name === 'first-contentful-paint') {
                        this.metrics.firstContentfulPaint = entry.startTime;
                    }
                });
            });
            
            observer.observe({ entryTypes: ['paint'] });
        }
    }
    
    logMetrics() {
        console.log('📊 Performance Metrics:', this.metrics);
    }
    
    getMetrics() {
        return this.metrics;
    }
}

// Initialize all functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all classes
    const darkMode = new DarkModeToggle();
    const spaRouter = new SPARouter();
    const navigation = new Navigation();
    const gridInteractions = new GridInteractions();
    const accessibility = new AccessibilityEnhancements();
    const mobileNav = new MobileNavigation();
    const perfMonitor = new PerformanceMonitor();
    
    // Add loading animation
    document.body.classList.add('loaded');
    
    // Console message for developers
    console.log(`
    🚀 Enhanced SPA Portfolio with Notion-Style Blog Popup Loaded!
    
    New Features:
    - Notion-style blog popup overlay
    - Seamless SPA navigation (no page refreshes)
    - Enhanced blog reading experience
    - Markdown content support
    - Mobile-optimized popup design
    
    Existing Features:
    - Grid-based Layout System
    - Enhanced Accessibility
    - Performance Monitoring
    - Mobile-first Responsive Design
    - Advanced Keyboard Navigation
    - Dark/Light Mode Toggle (Ctrl/Cmd + D)
    
    Commands:
    - router.openBlogPost('post-id') - Open specific blog post
    - router.navigateTo('writing') - Navigate to writing page
    - router.closeBlogPopup() - Close current popup
    
    Built with ❤️ for modern web development
    `);
    
    // Expose utilities to global scope for debugging
    window.router = spaRouter;
    window.portfolio = {
        darkMode,
        spaRouter,
        navigation,
        gridInteractions,
        accessibility,
        mobileNav,
        perfMonitor
    };
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