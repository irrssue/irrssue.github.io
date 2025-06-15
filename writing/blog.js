// blog.js - Complete Blog Management System with Floating Navbar (Brian Lovin Style)

class MarkdownBlogManager {
    constructor() {
        this.posts = [];
        this.currentPost = null;
        this.isLoading = false;
        this.markdownCache = new Map();
        
        // DOM elements
        this.blogPostsList = null;
        this.articleTitle = null;
        this.articleDate = null;
        this.articleContent = null;
        this.blogArticle = null;
        
        // Floating navbar references
        this.floatingNavbarObserver = null;
        this.floatingNavbarElement = null;
        this.updateFloatingNavbar = null;
        
        this.init();
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
    
    async init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeApp());
        } else {
            this.initializeApp();
        }
    }
    
    async initializeApp() {
        this.initializeElements();
        await this.loadBlogIndex();
        this.renderBlogList();
        this.loadDefaultPost();
        this.setupEventListeners();
        this.setupSearchFunctionality();
        this.setupFloatingNavbar(); // Floating navbar instead of sticky header
        this.initializeDarkMode();
        
        console.log('✅ Blog with floating navbar initialized (Brian Lovin style)');
        console.log('📚 Available commands:');
        console.log('- Press "/" to focus search');
        console.log('- blogManager.navigateToNextPost() (or Ctrl/Cmd + J)');
        console.log('- blogManager.navigateToPreviousPost() (or Ctrl/Cmd + K)');
    }
    
    initializeElements() {
        this.blogPostsList = document.getElementById('blogPostsList');
        this.articleTitle = document.getElementById('articleTitle');
        this.articleDate = document.getElementById('articleDate');
        this.articleContent = document.getElementById('articleContent');
        this.blogArticle = document.getElementById('blogArticle');
        
        if (!this.blogPostsList || !this.articleTitle || !this.articleDate || !this.articleContent) {
            console.error('❌ Required DOM elements not found');
            return false;
        }
        
        return true;
    }
    
    async loadBlogIndex() {
        try {
            this.setLoading(true);
            
            const response = await fetch('./blog.json');
            if (!response.ok) {
                throw new Error('Failed to load blog index');
            }
            
            const data = await response.json();
            this.posts = data.posts || [];
            console.log('📄 Loaded blog index with', this.posts.length, 'posts');
            
        } catch (error) {
            console.error('❌ Failed to load blog index:', error);
            this.loadFallbackData();
        } finally {
            this.setLoading(false);
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
    
    renderBlogList() {
        if (!this.blogPostsList) return;
        
        this.blogPostsList.innerHTML = '';
        
        this.posts.forEach((post, index) => {
            const listItem = document.createElement('li');
            listItem.className = 'blog-post-item';
            
            const link = document.createElement('a');
            link.className = 'blog-post-link';
            link.setAttribute('data-post-id', post.id);
            link.href = `#${post.id}`;
            
            if (index === 0) {
                link.classList.add('active');
            }
            
            link.innerHTML = `
                <h3 class="blog-post-title">${this.escapeHtml(post.title)}</h3>
                <p class="blog-post-date">${this.escapeHtml(post.date)}</p>
            `;
            
            listItem.appendChild(link);
            this.blogPostsList.appendChild(listItem);
        });
    }
    
    async loadPost(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post || !this.articleTitle || !this.articleDate || !this.articleContent) return;
        
        this.setLoading(true);
        
        try {
            // Update header immediately
            this.articleTitle.textContent = post.title;
            this.articleDate.textContent = post.date;
            
            // Load markdown content
            if (post.markdown) {
                console.log('📖 Loading markdown for:', post.title);
                const htmlContent = await this.loadMarkdownContent(post.markdown);
                this.articleContent.innerHTML = htmlContent;
            } else if (post.content) {
                this.articleContent.innerHTML = post.content;
            } else {
                this.articleContent.innerHTML = '<p>No content available for this post.</p>';
            }
            
            this.currentPost = post;
            
            // Update floating navbar content
            if (this.updateFloatingNavbar) {
                this.updateFloatingNavbar();
            }
            
            // Update URL and page title
            if (history.pushState) {
                const newUrl = `${window.location.pathname}#${postId}`;
                history.pushState({ postId }, post.title, newUrl);
            }
            document.title = `${post.title} - Writing - Liam Rolert`;
            
            // Scroll to the entire article (including title)
            if (this.blogArticle && this.blogArticle.scrollIntoView) {
                this.blogArticle.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            
        } catch (error) {
            console.error('❌ Error loading post:', error);
            this.articleContent.innerHTML = '<p>Error loading post content. Please try again.</p>';
        } finally {
            this.setLoading(false);
        }
    }
    
    setupEventListeners() {
        if (!this.blogPostsList) return;
        
        this.blogPostsList.addEventListener('click', (e) => {
            e.preventDefault();
            
            const link = e.target.closest('.blog-post-link');
            if (link && !this.isLoading) {
                const postId = link.getAttribute('data-post-id');
                this.loadPost(postId);
                this.setActivePost(link);
                
                const searchInput = document.getElementById('blogSearchInput');
                if (searchInput && searchInput.value) {
                    searchInput.value = '';
                    document.getElementById('blogSearchClear').classList.remove('visible');
                }
            }
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'j':
                        e.preventDefault();
                        this.navigateToNextPost();
                        break;
                    case 'k':
                        e.preventDefault();
                        this.navigateToPreviousPost();
                        break;
                }
            }
        });
        
        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            const hash = window.location.hash.slice(1);
            if (hash && this.posts.find(p => p.id === hash)) {
                this.loadPost(hash);
                const activeLink = document.querySelector(`[data-post-id="${hash}"]`);
                if (activeLink) {
                    this.setActivePost(activeLink);
                }
            }
        });
    }
    
    setupSearchFunctionality() {
        const searchInput = document.getElementById('blogSearchInput');
        const searchClear = document.getElementById('blogSearchClear');
        
        if (!searchInput) return;
        
        let searchTimeout;
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length > 0) {
                searchClear.classList.add('visible');
            } else {
                searchClear.classList.remove('visible');
            }
            
            searchTimeout = setTimeout(() => {
                this.performSearch(query);
            }, 300);
        });
        
        if (searchClear) {
            searchClear.addEventListener('click', () => {
                searchInput.value = '';
                searchClear.classList.remove('visible');
                this.clearSearch();
            });
        }
        
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.blur();
                if (searchInput.value) {
                    searchInput.value = '';
                    searchClear.classList.remove('visible');
                    this.clearSearch();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const firstResult = document.querySelector('.blog-post-link');
                if (firstResult) {
                    firstResult.click();
                    searchInput.blur();
                }
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                if (document.activeElement.tagName !== 'INPUT' && 
                    document.activeElement.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    searchInput.focus();
                }
            }
        });
    }
    
    // ============ FLOATING NAVBAR (BRIAN LOVIN STYLE) ============
    setupFloatingNavbar() {
        // Create the floating navbar element
        const createFloatingNavbar = () => {
            const navbar = document.createElement('div');
            navbar.className = 'floating-navbar';
            navbar.innerHTML = `
                <div class="floating-navbar-title" id="floatingTitle"></div>
                <div class="floating-navbar-date" id="floatingDate"></div>
            `;
            document.body.appendChild(navbar);
            return navbar;
        };

        // Get or create the floating navbar
        let floatingNavbar = document.querySelector('.floating-navbar');
        if (!floatingNavbar) {
            floatingNavbar = createFloatingNavbar();
        }

        const floatingTitle = document.getElementById('floatingTitle');
        const floatingDate = document.getElementById('floatingDate');
        const originalHeader = document.querySelector('.blog-article-header');

        if (!originalHeader || !floatingTitle || !floatingDate) return;

        // Update floating navbar content with current post
        const updateFloatingNavbar = () => {
            const title = document.querySelector('.blog-article-title');
            const date = document.querySelector('.blog-article-date');
            
            if (title && date) {
                floatingTitle.textContent = title.textContent;
                floatingDate.textContent = date.textContent;
            }
        };

        // Initial update
        updateFloatingNavbar();

        // Set up Intersection Observer to watch the original header
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        // Original header is visible - hide floating navbar
                        floatingNavbar.classList.remove('visible');
                    } else {
                        // Original header is out of view - show floating navbar
                        floatingNavbar.classList.add('visible');
                    }
                });
            },
            {
                // Trigger when header is completely out of view
                threshold: 0,
                rootMargin: '0px 0px 0px 0px'
            }
        );

        // Start observing the original header
        observer.observe(originalHeader);

        // Store references for cleanup
        this.floatingNavbarObserver = observer;
        this.floatingNavbarElement = floatingNavbar;
        this.updateFloatingNavbar = updateFloatingNavbar;

        console.log('✨ Floating navbar enabled (Brian Lovin style)');
    }
    // ============ END FLOATING NAVBAR ============
    
    performSearch(query) {
        const blogPostsList = document.getElementById('blogPostsList');
        
        if (!query) {
            this.clearSearch();
            return;
        }
        
        console.log('🔍 Searching for:', query);
        
        const filteredPosts = this.posts.filter(post => {
            const searchableText = [
                post.title,
                post.excerpt || '',
                post.content || ''
            ].join(' ').toLowerCase();
            
            return searchableText.includes(query.toLowerCase());
        });
        
        blogPostsList.classList.add('search-active');
        this.renderSearchResults(filteredPosts, query);
    }

    renderSearchResults(posts, searchTerm) {
        const blogPostsList = document.getElementById('blogPostsList');
        
        if (!blogPostsList) return;
        
        blogPostsList.innerHTML = '';
        
        if (posts.length === 0) {
            const noResults = document.createElement('li');
            noResults.className = 'blog-post-item search-no-results';
            noResults.innerHTML = `
                <div class="search-no-results-icon">
                    <i class="fas fa-search"></i>
                </div>
                <p class="search-no-results-text">
                    No posts found for "${searchTerm}"
                </p>
            `;
            blogPostsList.appendChild(noResults);
            return;
        }
        
        posts.forEach((post, index) => {
            const listItem = document.createElement('li');
            listItem.className = 'blog-post-item search-result';
            
            const link = document.createElement('a');
            link.className = 'blog-post-link';
            link.setAttribute('data-post-id', post.id);
            link.href = `#${post.id}`;
            
            const highlightedTitle = this.highlightSearchTerm(post.title, searchTerm);
            
            link.innerHTML = `
                <h3 class="blog-post-title">${highlightedTitle}</h3>
                <p class="blog-post-date">${this.escapeHtml(post.date)}</p>
            `;
            
            link.style.animationDelay = `${index * 50}ms`;
            
            listItem.appendChild(link);
            blogPostsList.appendChild(listItem);
        });
        
        console.log(`✅ Found ${posts.length} posts for "${searchTerm}"`);
    }

    highlightSearchTerm(text, searchTerm) {
        if (!searchTerm) return this.escapeHtml(text);
        
        const escapedText = this.escapeHtml(text);
        const escapedSearchTerm = this.escapeHtml(searchTerm);
        
        const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
        return escapedText.replace(regex, '<span class="search-highlight">$1</span>');
    }

    clearSearch() {
        const blogPostsList = document.getElementById('blogPostsList');
        
        if (blogPostsList) {
            blogPostsList.classList.remove('search-active');
        }
        
        this.renderBlogList();
        
        if (this.currentPost) {
            const activeLink = document.querySelector(`[data-post-id="${this.currentPost.id}"]`);
            if (activeLink) {
                this.setActivePost(activeLink);
            }
        }
        
        console.log('🔄 Search cleared, restored original list');
    }
    
    loadDefaultPost() {
        const hash = window.location.hash.slice(1);
        if (hash && this.posts.find(p => p.id === hash)) {
            this.loadPost(hash);
            const activeLink = document.querySelector(`[data-post-id="${hash}"]`);
            if (activeLink) {
                this.setActivePost(activeLink);
            }
        } else if (this.posts.length > 0) {
            this.loadPost(this.posts[0].id);
        }
    }
    
    setActivePost(activeLink) {
        document.querySelectorAll('.blog-post-link').forEach(link => {
            link.classList.remove('active');
        });
        
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }
    
    setLoading(loading) {
        this.isLoading = loading;
        if (this.blogArticle) {
            this.blogArticle.classList.toggle('loading', loading);
        }
    }
    
    navigateToNextPost() {
        if (!this.currentPost) return;
        
        const currentIndex = this.posts.findIndex(p => p.id === this.currentPost.id);
        if (currentIndex < this.posts.length - 1) {
            const nextPost = this.posts[currentIndex + 1];
            this.loadPost(nextPost.id);
            
            const nextLink = document.querySelector(`[data-post-id="${nextPost.id}"]`);
            if (nextLink) {
                this.setActivePost(nextLink);
                nextLink.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }
    
    navigateToPreviousPost() {
        if (!this.currentPost) return;
        
        const currentIndex = this.posts.findIndex(p => p.id === this.currentPost.id);
        if (currentIndex > 0) {
            const prevPost = this.posts[currentIndex - 1];
            this.loadPost(prevPost.id);
            
            const prevLink = document.querySelector(`[data-post-id="${prevPost.id}"]`);
            if (prevLink) {
                this.setActivePost(prevLink);
                prevLink.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }
    
    loadFallbackData() {
        this.posts = [
            {
                "id": "fallback-test",
                "title": "Blog System Ready",
                "date": "June 15, 2025",
                "excerpt": "Your blog system is set up and ready to use!",
                "content": "<p>✅ The blog system is working!</p><p>Create your first post by:</p><ol><li>Adding a <code>.md</code> file to the <code>blogs/</code> folder</li><li>Adding an entry to <code>blog.json</code></li><li>Refreshing the page</li></ol>"
            }
        ];
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    initializeDarkMode() {
        const darkModeBtn = document.getElementById('darkModeBtn');
        if (!darkModeBtn) return;
        
        const currentTheme = localStorage.getItem('theme') || 
                           (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        
        document.documentElement.setAttribute('data-theme', currentTheme);
        this.updateDarkModeButton(currentTheme);
        
        darkModeBtn.addEventListener('click', () => {
            const newTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            this.updateDarkModeButton(newTheme);
        });
    }
    
    updateDarkModeButton(theme) {
        const darkModeBtn = document.getElementById('darkModeBtn');
        if (!darkModeBtn) return;
        
        const icon = darkModeBtn.querySelector('i');
        if (icon) {
            if (theme === 'dark') {
                icon.className = 'fas fa-sun';
                darkModeBtn.setAttribute('aria-label', 'Switch to light mode');
            } else {
                icon.className = 'fas fa-moon';
                darkModeBtn.setAttribute('aria-label', 'Switch to dark mode');
            }
        }
    }
    
    // Cleanup method
    cleanup() {
        if (this.floatingNavbarObserver) {
            this.floatingNavbarObserver.disconnect();
        }
        if (this.floatingNavbarElement) {
            this.floatingNavbarElement.remove();
        }
    }
    
    clearCache() {
        this.markdownCache.clear();
        console.log('🗑️ Markdown cache cleared');
    }
    
    reloadPost(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (post && post.markdown) {
            this.markdownCache.delete(post.markdown);
            this.loadPost(postId);
        }
    }
}

// Initialize the blog manager
let blogManager;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBlog);
} else {
    initializeBlog();
}

function initializeBlog() {
    blogManager = new MarkdownBlogManager();
    window.blogManager = blogManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarkdownBlogManager;
}