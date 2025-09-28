// ==================== DOM Elements ====================
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
const backToTop = document.getElementById('backToTop');
const contentArea = document.getElementById('content-area');

// ==================== Mobile Navigation ====================
navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    navToggle.classList.toggle('active');
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
        navMenu.classList.remove('active');
        navToggle.classList.remove('active');
    }
});

// ==================== Back to Top ====================
window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        backToTop.classList.add('show');
    } else {
        backToTop.classList.remove('show');
    }
});

backToTop.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// ==================== Markdown Loader ====================
class MarkdownLoader {
    constructor() {
        this.cache = new Map();
    }

    async loadMarkdown(path) {
        // Check cache first
        if (this.cache.has(path)) {
            return this.cache.get(path);
        }

        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const text = await response.text();
            
            // Parse markdown to HTML
            const html = marked.parse(text, {
                breaks: true,
                gfm: true,
                headerIds: true,
                highlight: function(code, lang) {
                    if (lang && hljs.getLanguage(lang)) {
                        return hljs.highlight(code, { language: lang }).value;
                    }
                    return hljs.highlightAuto(code).value;
                }
            });
            
            // Cache the result
            this.cache.set(path, html);
            
            return html;
        } catch (error) {
            console.error('Error loading markdown:', error);
            return `<div class="error">خطا در بارگذاری محتوا: ${error.message}</div>`;
        }
    }

    async loadAndRender(path, targetElement) {
        // Show loading spinner
        targetElement.innerHTML = '<div class="loader"></div>';
        
        const html = await this.loadMarkdown(path);
        
        // Render HTML
        targetElement.innerHTML = `<div class="markdown-content">${html}</div>`;
        
        // Scroll to top
        window.scrollTo(0, 0);
        
        // Initialize any code highlighting
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    }
}

const markdownLoader = new MarkdownLoader();

// ==================== Router ====================
class Router {
    constructor() {
        this.routes = {
            'home': 'home.md',
            'what-is-osm': 'what-is-osm.md',
            'tools': '/content/getting-started/tools.md',
            'first-edit': '/content/getting-started/first-edit.md',
            'organize': '/content/guides/organizing-mapathon.md',
            'community': '/content/guides/community-building.md',
            'quality': '/content/guides/quality-control.md',
            'events': '/content/events/upcoming.md',
            'resources': '/content/resources/downloads.md',
            'about': '/content/about.md'
        };
        
        this.init();
    }

    init() {
        // Handle initial load
        this.handleRoute();
        
        // Handle link clicks
        document.addEventListener('click', (e) => {
            if (e.target.matches('a[href^="#"]')) {
                e.preventDefault();
                const hash = e.target.getAttribute('href').substring(1);
                this.navigate(hash);
            }
        });
        
        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            this.handleRoute();
        });
    }

    navigate(route) {
        window.location.hash = route;
        this.handleRoute();
    }

    handleRoute() {
        const hash = window.location.hash.substring(1) || 'home';
        const path = this.routes[hash];
        
        if (path) {
            markdownLoader.loadAndRender(path, contentArea);
            this.updateActiveNav(hash);
        } else {
            contentArea.innerHTML = '<div class="error">صفحه مورد نظر یافت نشد</div>';
        }
    }

    updateActiveNav(route) {
        // Remove all active classes
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to current link
        const activeLink = document.querySelector(`a[href="#${route}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }
}

// Initialize router
const router = new Router();

// ==================== Smooth Scroll for Anchor Links ====================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement && !targetId.includes('/')) {
            e.preventDefault();
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ==================== Intersection Observer for Animations ====================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe elements
document.querySelectorAll('.step-card, .event-card, .resource-card').forEach(el => {
    observer.observe(el);
});

// ==================== Form Handler ====================
const handleFormSubmit = async (formElement) => {
    const formData = new FormData(formElement);
    const data = Object.fromEntries(formData);
    
    // Here you would send the data to your server
    console.log('Form data:', data);
    
    // Show success message
    const successMessage = document.createElement('div');
    successMessage.className = 'alert alert-success';
    successMessage.textContent = 'فرم با موفقیت ارسال شد!';
    formElement.appendChild(successMessage);
    
    // Reset form
    formElement.reset();
    
    // Remove success message after 3 seconds
    setTimeout(() => {
        successMessage.remove();
    }, 3000);
};

// ==================== Utility Functions ====================
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// ==================== Search Functionality ====================
class Search {
    constructor() {
        this.searchIndex = [];
        this.buildIndex();
    }
    
    async buildIndex() {
        // Build search index from markdown files
        // This is a simplified version - in production you'd want a more robust solution
        const files = Object.values(router.routes);
        
        for (const file of files) {
            try {
                const content = await markdownLoader.loadMarkdown(file);
                this.searchIndex.push({
                    path: file,
                    content: this.stripHtml(content).toLowerCase(),
                    title: this.extractTitle(content)
                });
            } catch (error) {
                console.error('Error indexing file:', file, error);
            }
        }
    }
    
    stripHtml(html) {
        const tmp = document.createElement('DIV');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }
    
    extractTitle(html) {
        const match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        return match ? match[1] : 'بدون عنوان';
    }
    
    search(query) {
        const lowerQuery = query.toLowerCase();
        return this.searchIndex
            .filter(item => item.content.includes(lowerQuery))
            .map(item => ({
                title: item.title,
                path: item.path,
                excerpt: this.getExcerpt(item.content, lowerQuery)
            }));
    }
    
    getExcerpt(content, query) {
        const index = content.indexOf(query);
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + query.length + 50);
        return '...' + content.substring(start, end) + '...';
    }
}

// Initialize search
const search = new Search();

// ==================== Initialize Everything ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Mapathon Iran website loaded successfully!');
    
    // Add any additional initialization here
});
