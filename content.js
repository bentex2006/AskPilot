
// Enhanced content extraction with better filtering
function extractPageContent() {
    // Priority selectors for main content
    const contentSelectors = [
        'article',
        'main',
        '[role="main"]',
        '.content',
        '#content',
        '.post-content',
        '.entry-content',
        '.article-body',
        '.page-content',
        '.story-body'
    ];
    
    // Try to find main content area
    let mainContent = null;
    for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element && element.innerText.length > 100) {
            mainContent = element;
            break;
        }
    }
    
    // Fallback to body if no main content found
    if (!mainContent) {
        mainContent = document.body;
    }
    
    // Remove unwanted elements
    const unwantedSelectors = [
        'nav',
        'header',
        'footer',
        '.advertisement',
        '.ad',
        '.ads',
        '.sidebar',
        '.comments',
        '.social-share',
        '[class*="ad-"]',
        '[id*="ad-"]',
        'script',
        'style',
        'noscript'
    ];
    
    // Clone the content to avoid modifying the original page
    const contentCopy = mainContent.cloneNode(true);
    
    // Remove unwanted elements from the copy
    unwantedSelectors.forEach(selector => {
        const elements = contentCopy.querySelectorAll(selector);
        elements.forEach(el => el.remove());
    });
    
    return contentCopy.innerText || '';
}

// Enhanced function to check if we can access the page
function canAccessPage() {
    try {
        return document.readyState === 'complete' || document.readyState === 'interactive';
    } catch (error) {
        return false;
    }
}

// Send content when page is ready
if (canAccessPage()) {
    const pageContent = extractPageContent();
    chrome.runtime.sendMessage({ 
        action: "pageContent", 
        content: pageContent,
        url: window.location.href,
        title: document.title
    });
} else {
    // Wait for page to load
    document.addEventListener('DOMContentLoaded', () => {
        const pageContent = extractPageContent();
        chrome.runtime.sendMessage({ 
            action: "pageContent", 
            content: pageContent,
            url: window.location.href,
            title: document.title
        });
    });
}
