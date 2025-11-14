// Search functionality for the portfolio site
(function() {
    'use strict';

    // Repository configuration
    const SEARCH_REPO_OWNER = 'irrssue';
    const SEARCH_REPO_NAME = 'irrssue.github.io';
    const SEARCH_BRANCH = 'main';
    const SEARCH_POSTS_DIR = 'posts';
    const SEARCH_BOOKMARKS_DIR = 'bookmarks';

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

            // Fetch bookmarks
            const bookmarksResponse = await fetch(
                `https://api.github.com/repos/${SEARCH_REPO_OWNER}/${SEARCH_REPO_NAME}/contents/${SEARCH_BOOKMARKS_DIR}?ref=${SEARCH_BRANCH}`
            );

            if (bookmarksResponse.ok) {
                const bookmarkFiles = await bookmarksResponse.json();
                const bmFiles = bookmarkFiles.filter(file =>
                    file.name.endsWith('.md') && file.name !== '_template.md'
                );

                // Fetch content for each bookmark
                const bookmarks = await Promise.all(
                    bmFiles.map(async (file) => {
                        try {
                            const contentResponse = await fetch(file.download_url);
                            const content = await contentResponse.text();

                            // Parse front matter
                            const frontMatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
                            if (!frontMatterMatch) return null;

                            const frontMatterText = frontMatterMatch[1];

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

                                    frontMatter[key] = value;
                                }
                            });

                            const tag = frontMatter.tag || '';

                            return {
                                filename: file.name,
                                title: frontMatter.title || 'Untitled',
                                url: frontMatter.url || '#',
                                date: frontMatter.date || '',
                                tag: tag
                            };
                        } catch (error) {
                            console.error(`Error parsing ${file.name}:`, error);
                            return null;
                        }
                    })
                );

                index.bookmarks = bookmarks.filter(bookmark => bookmark !== null);
            }

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
            return { writing: [], bookmarks: [], featured: [], isTagSearch: false };
        }

        const queryTrimmed = query.trim();
        if (!queryTrimmed) return { writing: [], bookmarks: [], featured: [], isTagSearch: false };

        // Check if this is a tag search (starts with #)
        const isTagSearch = queryTrimmed.startsWith('#');
        const searchTerm = isTagSearch ? queryTrimmed.substring(1).toLowerCase() : queryTrimmed.toLowerCase();

        const results = {
            writing: [],
            bookmarks: [],
            featured: [],
            isTagSearch: isTagSearch
        };

        if (isTagSearch) {
            // Tag search - exact tag match
            searchIndex.writing.forEach(post => {
                if (post.tag && post.tag.toLowerCase() === searchTerm) {
                    results.writing.push({
                        title: post.title,
                        url: post.url,
                        context: `Tag: #${post.tag}`,
                        date: post.date,
                        tag: post.tag
                    });
                }
            });

            searchIndex.bookmarks.forEach(bookmark => {
                if (bookmark.tag && bookmark.tag.toLowerCase() === searchTerm) {
                    results.bookmarks.push({
                        title: bookmark.title,
                        url: bookmark.url,
                        context: `Tag: #${bookmark.tag}`,
                        date: bookmark.date,
                        tag: bookmark.tag
                    });
                }
            });
        } else {
            // Regular text search
            searchIndex.writing.forEach(post => {
                const titleMatch = post.title.toLowerCase().includes(searchTerm);
                const summaryMatch = post.summary.toLowerCase().includes(searchTerm);
                const contentMatch = post.content.toLowerCase().includes(searchTerm);
                const tagMatch = post.tag && post.tag.toLowerCase().includes(searchTerm);

                if (titleMatch || summaryMatch || contentMatch || tagMatch) {
                    // Extract context around the match
                    let matchContext = '';
                    if (titleMatch) {
                        matchContext = post.title;
                    } else if (summaryMatch) {
                        matchContext = post.summary;
                    } else if (contentMatch) {
                        matchContext = extractContext(post.content, searchTerm);
                    } else if (tagMatch) {
                        matchContext = `Tag: ${post.tag}`;
                    }

                    results.writing.push({
                        title: post.title,
                        url: post.url,
                        context: matchContext,
                        date: post.date,
                        tag: post.tag
                    });
                }
            });

            searchIndex.bookmarks.forEach(bookmark => {
                const titleMatch = bookmark.title.toLowerCase().includes(searchTerm);
                const urlMatch = bookmark.url.toLowerCase().includes(searchTerm);
                const tagMatch = bookmark.tag && bookmark.tag.toLowerCase().includes(searchTerm);

                if (titleMatch || urlMatch || tagMatch) {
                    let matchContext = '';
                    if (titleMatch) {
                        matchContext = bookmark.title;
                    } else if (urlMatch) {
                        matchContext = bookmark.url;
                    } else if (tagMatch) {
                        matchContext = `Tag: ${bookmark.tag}`;
                    }

                    results.bookmarks.push({
                        title: bookmark.title,
                        url: bookmark.url,
                        context: matchContext,
                        date: bookmark.date,
                        tag: bookmark.tag
                    });
                }
            });
        }

        // TODO: Search in featured when available
        // searchIndex.featured.forEach(...)

        return results;
    }

    // Extract context around all search matches
    function extractContext(text, query, contextLength = 150) {
        const queryLower = query.toLowerCase();
        const textLower = text.toLowerCase();
        const matches = [];

        let index = textLower.indexOf(queryLower);

        // Find all occurrences
        while (index !== -1) {
            const start = Math.max(0, index - contextLength / 2);
            const end = Math.min(text.length, index + query.length + contextLength / 2);

            let context = text.substring(start, end);

            // Add ellipsis if needed
            if (start > 0) context = '...' + context;
            if (end < text.length) context = context + '...';

            matches.push(context);

            // Find next occurrence
            index = textLower.indexOf(queryLower, index + 1);
        }

        // Return all matches joined with visual separator, or first part of text if no matches
        return matches.length > 0 ? matches.join(' ... ') : text.substring(0, contextLength) + '...';
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
        const searchType = results.isTagSearch ? 'tag' : 'search';
        const displayQuery = results.isTagSearch && !query.startsWith('#') ? `#${query}` : query;

        let html = `
            <div class="search-results-container">
                <div class="search-results-header">
                    <h1 class="search-results-title">${results.isTagSearch ? 'Tag Search Results' : 'Search Results'}</h1>
                    <p class="search-results-query">Found ${totalResults} result${totalResults !== 1 ? 's' : ''} for "${displayQuery}"</p>
                </div>
        `;

        // Combine all results with section labels
        const allResults = [];

        results.writing.forEach(result => {
            allResults.push({ ...result, section: 'Writing', sectionType: 'internal' });
        });

        results.bookmarks.forEach(result => {
            allResults.push({ ...result, section: 'Bookmarks', sectionType: 'external' });
        });

        results.featured.forEach(result => {
            allResults.push({ ...result, section: 'Featured', sectionType: 'internal' });
        });

        // Display all results in grid layout
        if (allResults.length > 0) {
            html += `<div class="search-results-list">`;

            allResults.forEach(result => {
                const targetAttr = result.sectionType === 'external' ? ' target="_blank" rel="noopener noreferrer"' : '';
                html += `
                    <div class="search-result-item">
                        <div class="search-result-section">${result.section}</div>
                        <div class="search-result-content">
                            <a href="${result.url}" class="search-result-title"${targetAttr}>${highlightMatch(result.title, query)}</a>
                            <a href="${result.url}" class="search-result-context-link"${targetAttr}>
                                <p class="search-result-context">${highlightMatch(result.context, query)}</p>
                            </a>
                            <div class="search-result-meta">
                                ${result.date ? `<span class="search-result-date">${new Date(result.date).getFullYear()}</span>` : ''}
                                ${result.tag ? `<span class="search-result-tag">#${result.tag}</span>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
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
