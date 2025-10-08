/**
 * NewsHub Application
 * A modern news aggregator using TheNewsAPI
 */

// ============================
// Configuration
// ============================
const CONFIG = {
    API_KEY: 'YOUR_API_KEY', // Replace with your actual API key
    BASE_URL: 'https://api.thenewsapi.com/v1/news',
    ARTICLES_PER_PAGE: 10,
    DEFAULT_LANGUAGE: 'en',
    DEFAULT_CATEGORY: '',
};

// ============================
// Application State
// ============================
const state = {
    currentPage: 1,
    language: CONFIG.DEFAULT_LANGUAGE,
    category: CONFIG.DEFAULT_CATEGORY,
    searchQuery: '',
    isLoading: false,
    totalPages: 0,
};

// ============================
// DOM Elements
// ============================
const elements = {
    newsGrid: document.getElementById('newsGrid'),
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    languageSelect: document.getElementById('languageSelect'),
    categorySelect: document.getElementById('categorySelect'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    pageInfo: document.getElementById('pageInfo'),
    pagination: document.getElementById('pagination'),
    errorMessage: document.getElementById('errorMessage'),
};

// ============================
// API Functions
// ============================

/**
 * Fetch news articles from TheNewsAPI
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} API response
 */
async function fetchNews(params = {}) {
    // Build query parameters
    const queryParams = new URLSearchParams({
        api_token: CONFIG.API_KEY,
        limit: CONFIG.ARTICLES_PER_PAGE,
        page: state.currentPage,
        language: state.language,
        ...params,
    });

    // Add search query if present
    if (state.searchQuery) {
        queryParams.set('search', state.searchQuery);
    }

    // Add categories if selected
    if (state.category) {
        queryParams.set('categories', state.category);
    }

    // Determine endpoint - use 'all' for search or category filtering, 'top' otherwise
    const endpoint = state.searchQuery || state.category ? 'all' : 'top';
    const url = `${CONFIG.BASE_URL}/${endpoint}?${queryParams.toString()}`;

    try {
        const response = await fetch(url);

        // Handle rate limiting
        if (response.status === 429) {
            throw new Error('Rate limit exceeded. Please try again in a few moments.');
        }

        // Handle other HTTP errors
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ============================
// Render Functions
// ============================

/**
 * Create a skeleton loader card
 * @returns {string} HTML string for skeleton card
 */
function createSkeletonCard() {
    return `
        <div class="skeleton-card">
            <div class="skeleton skeleton-image"></div>
            <div class="skeleton-content">
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text"></div>
            </div>
        </div>
    `;
}

/**
 * Show skeleton loaders
 */
function showSkeletonLoaders() {
    const skeletons = Array(CONFIG.ARTICLES_PER_PAGE)
        .fill(null)
        .map(() => createSkeletonCard())
        .join('');
    
    elements.newsGrid.innerHTML = skeletons;
}

/**
 * Format date to human-readable format
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        if (diffHours === 0) {
            const diffMinutes = Math.floor(diffTime / (1000 * 60));
            return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
        }
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }
}

/**
 * Create an article card
 * @param {Object} article - Article data
 * @returns {string} HTML string for article card
 */
function createArticleCard(article) {
    const {
        title = 'No title available',
        description = 'No description available',
        image_url,
        source = 'Unknown source',
        published_at,
        url,
    } = article;

    // Fallback image
    const imageUrl = image_url || 'https://via.placeholder.com/400x200/e5e7eb/6b7280?text=No+Image';
    
    return `
        <article class="article-card" onclick="openArticle('${url || '#'}')">
            <img 
                src="${imageUrl}" 
                alt="${title}" 
                class="article-image"
                loading="lazy"
                onerror="this.src='https://via.placeholder.com/400x200/e5e7eb/6b7280?text=No+Image'"
            >
            <div class="article-content">
                <h2 class="article-title">${title}</h2>
                <p class="article-snippet">${description}</p>
                <div class="article-meta">
                    <span class="article-source">${source}</span>
                    <span class="article-date">${formatDate(published_at)}</span>
                </div>
            </div>
        </article>
    `;
}

/**
 * Render articles to the grid
 * @param {Array} articles - Array of article objects
 */
function renderArticles(articles) {
    if (!articles || articles.length === 0) {
        showEmptyState();
        return;
    }

    const articlesHTML = articles.map(createArticleCard).join('');
    elements.newsGrid.innerHTML = articlesHTML;
}

/**
 * Show empty state message
 */
function showEmptyState() {
    elements.newsGrid.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">📰</div>
            <h3 class="empty-state-title">No articles found</h3>
            <p class="empty-state-message">Try adjusting your search or filters</p>
        </div>
    `;
    elements.pagination.style.display = 'none';
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.style.display = 'block';
    
    // Hide error after 5 seconds
    setTimeout(() => {
        elements.errorMessage.style.display = 'none';
    }, 5000);
}

/**
 * Update pagination controls
 */
function updatePagination() {
    elements.pageInfo.textContent = `Page ${state.currentPage}`;
    elements.prevBtn.disabled = state.currentPage === 1;
    
    // Show pagination if there are results
    elements.pagination.style.display = 'flex';
}

// ============================
// Event Handlers
// ============================

/**
 * Load and display news articles
 */
async function loadNews() {
    if (state.isLoading) return;
    
    state.isLoading = true;
    showSkeletonLoaders();
    elements.errorMessage.style.display = 'none';

    try {
        const data = await fetchNews();
        
        if (data && data.data) {
            renderArticles(data.data);
            updatePagination();
        } else {
            showEmptyState();
        }
    } catch (error) {
        showError(error.message || 'Failed to load news. Please try again.');
        showEmptyState();
    } finally {
        state.isLoading = false;
    }
}

/**
 * Handle search
 */
function handleSearch() {
    state.searchQuery = elements.searchInput.value.trim();
    state.currentPage = 1;
    loadNews();
}

/**
 * Handle language change
 */
function handleLanguageChange() {
    state.language = elements.languageSelect.value;
    state.currentPage = 1;
    loadNews();
}

/**
 * Handle category change
 */
function handleCategoryChange() {
    state.category = elements.categorySelect.value;
    state.currentPage = 1;
    loadNews();
}

/**
 * Handle pagination - previous page
 */
function handlePrevPage() {
    if (state.currentPage > 1) {
        state.currentPage--;
        loadNews();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

/**
 * Handle pagination - next page
 */
function handleNextPage() {
    state.currentPage++;
    loadNews();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Open article in new tab
 * @param {string} url - Article URL
 */
function openArticle(url) {
    if (url && url !== '#') {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
}

// ============================
// Event Listeners
// ============================

/**
 * Initialize event listeners
 */
function initEventListeners() {
    // Search
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // Filters
    elements.languageSelect.addEventListener('change', handleLanguageChange);
    elements.categorySelect.addEventListener('change', handleCategoryChange);

    // Pagination
    elements.prevBtn.addEventListener('click', handlePrevPage);
    elements.nextBtn.addEventListener('click', handleNextPage);
}

// ============================
// Initialization
// ============================

/**
 * Initialize the application
 */
function init() {
    // Check if API key is configured
    if (CONFIG.API_KEY === 'YOUR_API_KEY') {
        showError('Please configure your API key in js/app.js');
        showEmptyState();
        return;
    }

    // Initialize event listeners
    initEventListeners();

    // Load initial news
    loadNews();
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
