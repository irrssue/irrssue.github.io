// blog.js - Complete Blog Management System

class BlogManager {
    constructor() {
        this.posts = [];
        this.currentPost = null;
        this.isLoading = false;
        
        // DOM elements
        this.blogPostsList = null;
        this.articleTitle = null;
        this.articleDate = null;
        this.articleContent = null;
        this.blogArticle = null;
        
        this.init();
    }
    
    async init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeApp());
        } else {
            this.initializeApp();
        }
    }
    
    async initializeApp() {
        this.initializeElements();
        await this.loadBlogPosts();
        this.renderBlogList();
        this.loadDefaultPost();
        this.setupEventListeners();
        this.initializeDarkMode();
        
        console.log('✅ Blog Manager initialized successfully');
        console.log('📚 Available commands:');
        console.log('- blogManager.navigateToNextPost() (or Ctrl/Cmd + J)');
        console.log('- blogManager.navigateToPreviousPost() (or Ctrl/Cmd + K)');
        console.log('- blogManager.searchPosts("query")');
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
    
    async loadBlogPosts() {
        try {
            this.setLoading(true);
            
            // Try to load from external JSON file first
            const response = await fetch('./blog.json');
            if (!response.ok) {
                throw new Error('Failed to load blog posts from JSON');
            }
            
            const data = await response.json();
            this.posts = data.posts || [];
            console.log('📄 Loaded posts from blog-posts.json');
            
        } catch (error) {
            console.log('⚠️ Loading from external JSON failed, using fallback data');
            this.loadFallbackData();
        } finally {
            this.setLoading(false);
        }
    }
    
    loadFallbackData() {
        this.posts = [
        ];
    }
    
    setLoading(loading) {
        this.isLoading = loading;
        if (this.blogArticle) {
            this.blogArticle.classList.toggle('loading', loading);
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
            
            // Mark first post as active by default
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
    
    loadPost(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post || !this.articleTitle || !this.articleDate || !this.articleContent) return;
        
        this.setLoading(true);
        
        // Simulate loading delay for smooth transition
        setTimeout(() => {
            this.currentPost = post;
            this.articleTitle.textContent = post.title;
            this.articleDate.textContent = post.date;
            this.articleContent.innerHTML = post.content;
            
            // Update URL without page reload
            if (history.pushState) {
                const newUrl = `${window.location.pathname}#${postId}`;
                history.pushState({ postId }, post.title, newUrl);
            }
            
            // Update page title
            document.title = `${post.title} - Writing - Liam Rolert`;
            
            // Scroll to top of article
            if (this.articleContent.scrollIntoView) {
                this.articleContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            
            this.setLoading(false);
        }, 150);
    }
    
    loadDefaultPost() {
        // Check if there's a hash in URL
        const hash = window.location.hash.slice(1);
        if (hash && this.posts.find(p => p.id === hash)) {
            this.loadPost(hash);
            // Set active link
            const activeLink = document.querySelector(`[data-post-id="${hash}"]`);
            if (activeLink) {
                this.setActivePost(activeLink);
            }
        } else if (this.posts.length > 0) {
            // Load first post by default
            this.loadPost(this.posts[0].id);
        }
    }
    
    setActivePost(activeLink) {
        // Remove active class from all links
        document.querySelectorAll('.blog-post-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to clicked link
        if (activeLink) {
            activeLink.classList.add('active');
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
    
    // Search functionality
    searchPosts(query) {
        if (!query.trim()) {
            this.renderBlogList();
            return;
        }
        
        const filteredPosts = this.posts.filter(post => 
            post.title.toLowerCase().includes(query.toLowerCase()) ||
            post.excerpt.toLowerCase().includes(query.toLowerCase()) ||
            post.content.toLowerCase().includes(query.toLowerCase())
        );
        
        this.renderFilteredPosts(filteredPosts);
    }
    
    renderFilteredPosts(posts) {
        if (!this.blogPostsList) return;
        
        this.blogPostsList.innerHTML = '';
        
        if (posts.length === 0) {
            const noResults = document.createElement('li');
            noResults.className = 'blog-post-item';
            noResults.innerHTML = '<p style="padding: 20px; color: var(--text-secondary);">No posts found</p>';
            this.blogPostsList.appendChild(noResults);
            return;
        }
        
        posts.forEach((post) => {
            const listItem = document.createElement('li');
            listItem.className = 'blog-post-item';
            
            const link = document.createElement('a');
            link.className = 'blog-post-link';
            link.setAttribute('data-post-id', post.id);
            link.href = `#${post.id}`;
            
            link.innerHTML = `
                <h3 class="blog-post-title">${this.escapeHtml(post.title)}</h3>
                <p class="blog-post-date">${this.escapeHtml(post.date)}</p>
            `;
            
            listItem.appendChild(link);
            this.blogPostsList.appendChild(listItem);
        });
    }
    
    // Utility methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Dark mode integration
    initializeDarkMode() {
        const darkModeBtn = document.getElementById('darkModeBtn');
        if (!darkModeBtn) return;
        
        const currentTheme = localStorage.getItem('theme') || 
                           (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        
        // Set initial theme
        document.documentElement.setAttribute('data-theme', currentTheme);
        this.updateDarkModeButton(currentTheme);
        
        // Dark mode toggle
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
    
    // Public API methods for external use
    addPost(post) {
        this.posts.unshift(post);
        this.renderBlogList();
        console.log('✅ Post added:', post.title);
    }
    
    updatePost(postId, updatedPost) {
        const index = this.posts.findIndex(p => p.id === postId);
        if (index !== -1) {
            this.posts[index] = { ...this.posts[index], ...updatedPost };
            this.renderBlogList();
            
            if (this.currentPost && this.currentPost.id === postId) {
                this.loadPost(postId);
            }
            console.log('✅ Post updated:', postId);
        }
    }
    
    deletePost(postId) {
        this.posts = this.posts.filter(p => p.id !== postId);
        this.renderBlogList();
        
        if (this.currentPost && this.currentPost.id === postId) {
            if (this.posts.length > 0) {
                this.loadPost(this.posts[0].id);
            }
        }
        console.log('✅ Post deleted:', postId);
    }
    
    getAllPosts() {
        return [...this.posts];
    }
    
    getPost(postId) {
        return this.posts.find(p => p.id === postId);
    }
}

// Initialize blog manager
let blogManager;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBlog);
} else {
    initializeBlog();
}

function initializeBlog() {
    blogManager = new BlogManager();
    
    // Make it globally accessible for debugging
    window.blogManager = blogManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BlogManager;
}