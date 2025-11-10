// Search functionality for the portfolio site
(function() {
    'use strict';

    // Repository configuration
    const SEARCH_REPO_OWNER = 'irrssue';
    const SEARCH_REPO_NAME = 'irrssue.github.io';
    const SEARCH_BRANCH = 'main';
    const SEARCH_POSTS_DIR = 'posts';

    // Cache for search data
    let searchIndex = null;
    let isIndexing = false;

    // Build search index
    async function buildSearchIndex() {
        if (isIndexing) return searchIndex;
        if (searchIndex) return searchIndex;

        isIndexing = true;

        try {
            const index = {
                writing: [],
                bookmarks: [],
                featured: []
            };

            // Fetch writing posts
            const response = await fetch(
                `https://api.github.com/repos/${SEARCH_REPO_OWNER}/${SEARCH_REPO_NAME}/contents/${SEARCH_POSTS_DIR}?ref=${SEARCH_BRANCH}`
            );

            if (response.ok) {
                const files = await response.json();
                const postFiles = files.filter(file =>
                    file.name.endsWith('.md') && file.name !== '_template.md'
                );

                // Fetch content for each post
                const posts = await Promise.all(
                    postFiles.map(async (file) => {
                        try {
                            const contentResponse = await fetch(file.download_url);
                            const content = await contentResponse.text();

                            // Parse front matter
                            const frontMatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
                            if (!frontMatterMatch) return null;

                            const frontMatterText = frontMatterMatch[1];
                            const bodyContent = content.slice(frontMatterMatch[0].length).trim();

                            // Parse YAML front matter manually (simple parser)
                            const frontMatter = {};
                            frontMatterText.split('\n').forEach(line => {
                                const match = line.match(/^(\w+):\s*(.+)$/);
                                if (match) {
                                    const key = match[1];
                                    let value = match[2].trim();

                                    // Remove quotes
                                    if ((value.startsWith('"') && value.endsWith('"')) ||
                                        (value.startsWith("'") && value.endsWith("'"))) {
                                        value = value.slice(1, -1);
                                    }

                                    // Handle arrays (legacy support)
                                    if (value.startsWith('[') && value.endsWith(']')) {
                                        value = value.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''))[0] || '';
                                    }

                                    // Handle booleans
                                    if (value === 'true') value = true;
                                    if (value === 'false') value = false;

                                    frontMatter[key] = value;
                                }
                            });

                            // Skip draft posts
                            if (frontMatter.draft === true) return null;

                            // Validate tag - must be a single word and required
                            const tag = frontMatter.tag || frontMatter.tags || '';
                            const tagString = typeof tag === 'string' ? tag : '';

                            // Check if tag is single word (no spaces)
                            if (!tagString || tagString.includes(' ')) {
                                console.warn(`Post ${file.name} has invalid tag: "${tagString}" - must be a single word`);
                            }

                            return {
                                filename: file.name,
                                title: frontMatter.title || 'Untitled',
                                date: frontMatter.date || '',
                                tag: tagString,
                                summary: frontMatter.summary || '',
                                content: bodyContent,
                                url: `post.html?name=${encodeURIComponent(file.name)}`
                            };
                        } catch (error) {
                            console.error(`Error parsing ${file.name}:`, error);
                            return null;
                        }
                    })
                );

                index.writing = posts.filter(post => post !== null);
            }

            // TODO: Add bookmarks data when available
            // index.bookmarks = [...];

            // TODO: Add featured projects when available
            // index.featured = [...];

            searchIndex = index;
            isIndexing = false;
            return index;

        } catch (error) {
            console.error('Error building search index:', error);
            isIndexing = false;
            return null;
        }
    }

    // Perform search
    function performSearch(query) {
        if (!searchIndex) {
            console.error('Search index not ready');
            return { writing: [], bookmarks: [], featured: [] };
        }

        const queryLower = query.toLowerCase().trim();
        if (!queryLower) return { writing: [], bookmarks: [], featured: [] };

        const results = {
            writing: [],
            bookmarks: [],
            featured: []
        };

        // Search in writing posts
        searchIndex.writing.forEach(post => {
            const titleMatch = post.title.toLowerCase().includes(queryLower);
            const summaryMatch = post.summary.toLowerCase().includes(queryLower);
            const contentMatch = post.content.toLowerCase().includes(queryLower);
            const tagMatch = post.tag && post.tag.toLowerCase().includes(queryLower);

            if (titleMatch || summaryMatch || contentMatch || tagMatch) {
                // Extract context around the match
                let matchContext = '';
                if (titleMatch) {
                    matchContext = post.title;
                } else if (summaryMatch) {
                    matchContext = post.summary;
                } else if (contentMatch) {
                    matchContext = extractContext(post.content, queryLower);
                } else if (tagMatch) {
                    matchContext = `Tag: ${post.tag}`;
                }

                results.writing.push({
                    title: post.title,
                    url: post.url,
                    context: matchContext,
                    date: post.date
                });
            }
        });

        // TODO: Search in bookmarks when available
        // searchIndex.bookmarks.forEach(...)

        // TODO: Search in featured when available
        // searchIndex.featured.forEach(...)

        return results;
    }

    // Extract context around a search match
    function extractContext(text, query, contextLength = 150) {
        const index = text.toLowerCase().indexOf(query);
        if (index === -1) return text.substring(0, contextLength) + '...';

        const start = Math.max(0, index - contextLength / 2);
        const end = Math.min(text.length, index + query.length + contextLength / 2);

        let context = text.substring(start, end);

        // Add ellipsis if needed
        if (start > 0) context = '...' + context;
        if (end < text.length) context = context + '...';

        return context;
    }

    // Highlight search terms in text
    function highlightMatch(text, query) {
        if (!query) return text;

        const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    // Escape special regex characters
    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Display search results
    function displaySearchResults(results, query) {
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;

        const totalResults = results.writing.length + results.bookmarks.length + results.featured.length;

        let html = `
            <div class="search-results-container">
                <div class="search-results-header">
                    <h1 class="search-results-title">Search Results</h1>
                    <p class="search-results-query">Found ${totalResults} result${totalResults !== 1 ? 's' : ''} for "${query}"</p>
                </div>
        `;

        // Display Writing results
        if (results.writing.length > 0) {
            html += `
                <div class="search-section">
                    <h2 class="search-section-title">
                        <svg class="section-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                        Writing
                    </h2>
                    <div class="search-results-list">
            `;

            results.writing.forEach(result => {
                html += `
                    <div class="search-result-item">
                        <a href="${result.url}" class="search-result-title">${highlightMatch(result.title, query)}</a>
                        <p class="search-result-context">${highlightMatch(result.context, query)}</p>
                        ${result.date ? `<span class="search-result-date">${new Date(result.date).getFullYear()}</span>` : ''}
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        }

        // Display Bookmarks results
        if (results.bookmarks.length > 0) {
            html += `
                <div class="search-section">
                    <h2 class="search-section-title">
                        <svg class="section-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                        </svg>
                        Bookmarks
                    </h2>
                    <div class="search-results-list">
            `;

            results.bookmarks.forEach(result => {
                html += `
                    <div class="search-result-item">
                        <a href="${result.url}" class="search-result-title">${highlightMatch(result.title, query)}</a>
                        <p class="search-result-context">${highlightMatch(result.context, query)}</p>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        }

        // Display Featured results
        if (results.featured.length > 0) {
            html += `
                <div class="search-section">
                    <h2 class="search-section-title">
                        <svg class="section-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                        Featured
                    </h2>
                    <div class="search-results-list">
            `;

            results.featured.forEach(result => {
                html += `
                    <div class="search-result-item">
                        <a href="${result.url}" class="search-result-title">${highlightMatch(result.title, query)}</a>
                        <p class="search-result-context">${highlightMatch(result.context, query)}</p>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        }

        // No results message
        if (totalResults === 0) {
            html += `
                <div class="search-no-results">
                    <p>No results found for "${query}"</p>
                    <p class="search-no-results-hint">Try different keywords or check your spelling.</p>
                </div>
            `;
        }

        html += `</div>`;

        mainContent.innerHTML = html;

        // Update page title
        document.title = `Search: ${query} - Saw Thura Zaw`;
    }

    // Initialize search on page load if query parameter is present
    document.addEventListener('DOMContentLoaded', async function() {
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q');

        if (query) {
            // Show loading state
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.innerHTML = `
                    <div class="search-results-container">
                        <div class="search-loading">
                            <p>Searching...</p>
                        </div>
                    </div>
                `;
            }

            // Build index and perform search
            await buildSearchIndex();
            const results = performSearch(query);
            displaySearchResults(results, query);

            // Update search input with query
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = query;
            }
        }
    });

    // Export functions for use in other scripts
    window.searchModule = {
        buildSearchIndex,
        performSearch,
        displaySearchResults
    };
})();
