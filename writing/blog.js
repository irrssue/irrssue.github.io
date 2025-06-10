// blog.js - Complete Blog Management System

class MarkdownBlogManager {
    constructor() {
        this.posts = [];
        this.currentPost = null;
        this.isLoading = false;
        this.markdownCache = new Map(); // Cache loaded markdown files
        
        // DOM elements
        this.blogPostsList = null;
        this.articleTitle = null;
        this.articleDate = null;
        this.articleContent = null;
        this.blogArticle = null;
        
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
        this.initializeDarkMode();
        
        console.log('✅ Markdown Blog Manager initialized successfully');
        console.log('📚 Available commands:');
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
            
            // Load the blog index (JSON file with post metadata)
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
            // Check cache first
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
            
            // Cache the processed content
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
                // Fallback to inline content
                this.articleContent.innerHTML = post.content;
            } else {
                this.articleContent.innerHTML = '<p>No content available for this post.</p>';
            }
            
            this.currentPost = post;
            
            // Update URL and page title
            if (history.pushState) {
                const newUrl = `${window.location.pathname}#${postId}`;
                history.pushState({ postId }, post.title, newUrl);
            }
            document.title = `${post.title} - Writing - Liam Rolert`;
            
            // Scroll to top
            if (this.articleContent.scrollIntoView) {
                this.articleContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        
        // Blog post navigation
        this.blogPostsList.addEventListener('click', (e) => {
            e.preventDefault();
            
            const link = e.target.closest('.blog-post-link');
            if (link && !this.isLoading) {
                const postId = link.getAttribute('data-post-id');
                this.loadPost(postId);
                this.setActivePost(link);
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
                "title": "Markdown System Ready",
                "date": "June 9, 2025",
                "excerpt": "Your markdown blog system is set up and ready to use!",
                "content": "<p>✅ The markdown blog system is working!</p><p>Create your first post by:</p><ol><li>Adding a <code>.md</code> file to the <code>blogs/</code> folder</li><li>Adding an entry to <code>blog.json</code></li><li>Refreshing the page</li></ol>"
            }
        ];
    }
    
    // Utility methods
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

    // Enhanced search functionality for blog.js

// Add these methods to your MarkdownBlogManager class

setupSearchFunctionality() {
    const searchInput = document.getElementById('blogSearchInput');
    const searchClear = document.getElementById('blogSearchClear');
    const blogPostsList = document.getElementById('blogPostsList');
    
    if (!searchInput) return;
    
    let searchTimeout;
    let currentSearchTerm = '';
    
    // Search input handler
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        // Show/hide clear button
        if (query.length > 0) {
            searchClear.classList.add('visible');
        } else {
            searchClear.classList.remove('visible');
        }
        
        // Debounce search
        searchTimeout = setTimeout(() => {
            this.performSearch(query);
        }, 300);
    });
    
    // Clear search handler
    if (searchClear) {
        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            searchClear.classList.remove('visible');
            this.clearSearch();
        });
    }
    
    // Keyboard shortcuts
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
            // Focus first search result if any
            const firstResult = document.querySelector('.blog-post-link');
            if (firstResult) {
                firstResult.click();
                searchInput.blur();
            }
        }
    });
    
    // Global keyboard shortcut (/ to focus search)
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            // Only if not typing in an input field
            if (document.activeElement.tagName !== 'INPUT' && 
                document.activeElement.tagName !== 'TEXTAREA') {
                e.preventDefault();
                searchInput.focus();
            }
        }
    });
}

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
        
        // Add search state to list
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
            
            // Highlight search term in title
            const highlightedTitle = this.highlightSearchTerm(post.title, searchTerm);
            
            link.innerHTML = `
                <h3 class="blog-post-title">${highlightedTitle}</h3>
                <p class="blog-post-date">${this.escapeHtml(post.date)}</p>
            `;
            
            // Add animation delay for staggered effect
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
        const searchInput = document.getElementById('blogSearchInput');
        
        // Remove search state
        if (blogPostsList) {
            blogPostsList.classList.remove('search-active');
        }
        
        // Restore original blog list
        this.renderBlogList();
        
        // Restore active post state if there was one
        if (this.currentPost) {
            const activeLink = document.querySelector(`[data-post-id="${this.currentPost.id}"]`);
            if (activeLink) {
                this.setActivePost(activeLink);
            }
        }
        
        console.log('🔄 Search cleared, restored original list');
    }

    // Update your initializeApp method to include search setup
    async initializeApp() {
        this.initializeElements();
        await this.loadBlogIndex();
        this.renderBlogList();
        this.loadDefaultPost();
        this.setupEventListeners();
        this.setupSearchFunctionality(); // Add this line
        this.initializeDarkMode();
        
        console.log('✅ Markdown Blog Manager initialized successfully');
        console.log('📚 Available commands:');
        console.log('- Press "/" to focus search');
        console.log('- blogManager.navigateToNextPost() (or Ctrl/Cmd + J)');
        console.log('- blogManager.navigateToPreviousPost() (or Ctrl/Cmd + K)');
    }

    // Also update your setupEventListeners method to handle search results clicks
    setupEventListeners() {
        if (!this.blogPostsList) return;
        
        // Blog post navigation (works for both regular and search results)
        this.blogPostsList.addEventListener('click', (e) => {
            e.preventDefault();
            
            const link = e.target.closest('.blog-post-link');
            if (link && !this.isLoading) {
                const postId = link.getAttribute('data-post-id');
                this.loadPost(postId);
                this.setActivePost(link);
                
                // Clear search when selecting a post
                const searchInput = document.getElementById('blogSearchInput');
                if (searchInput && searchInput.value) {
                    searchInput.value = '';
                    document.getElementById('blogSearchClear').classList.remove('visible');
                    // Don't clear search results immediately, let user see which post they selected
                }
            }
        });
        
        // ... rest of your existing event listeners
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
    
    // Public API methods
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

// Initialize the markdown blog manager
let blogManager;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBlog);
} else {
    initializeBlog();
}

function initializeBlog() {
    blogManager = new MarkdownBlogManager();
    window.blogManager = blogManager; // Global access for debugging
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarkdownBlogManager;
}