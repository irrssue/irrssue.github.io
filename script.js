// DOM Elements
const sidebar = document.querySelector('.sidebar');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const mobileOverlay = document.querySelector('.mobile-overlay');
const sidebarLinks = document.querySelectorAll('.sidebar-link');

// State
let isMobileMenuOpen = false;

// Mobile Menu Toggle
function toggleMobileMenu() {
    isMobileMenuOpen = !isMobileMenuOpen;
    
    if (isMobileMenuOpen) {
        sidebar.classList.add('open');
        mobileOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        mobileMenuBtn.textContent = '✕';
    } else {
        sidebar.classList.remove('open');
        mobileOverlay.classList.remove('active');
        document.body.style.overflow = 'auto';
        mobileMenuBtn.textContent = '☰';
    }
}

// Close mobile menu when clicking overlay
function closeMobileMenu() {
    if (isMobileMenuOpen) {
        toggleMobileMenu();
    }
}

// Handle sidebar link clicks
function handleSidebarClick(e) {
    if (e.target.matches('.sidebar-link[href^="#"]')) {
        // Update active state
        sidebarLinks.forEach(link => link.classList.remove('active'));
        e.target.classList.add('active');
        
        // Close mobile menu if open
        if (isMobileMenuOpen) {
            toggleMobileMenu();
        }
    }
}

// Copy email to clipboard
function copyEmail(e) {
    if (e.target.href && e.target.href.includes('mailto:')) {
        e.preventDefault();
        const email = e.target.href.replace('mailto:', '');
        
        navigator.clipboard.writeText(email).then(() => {
            showNotification('Email copied to clipboard!');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = email;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showNotification('Email copied to clipboard!');
        });
    }
}

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #333;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        font-size: 14px;
        z-index: 10000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 2000);
}

// Smooth scrolling for anchor links
function smoothScroll(e) {
    const href = e.target.getAttribute('href');
    
    if (href && href.startsWith('#')) {
        e.preventDefault();
        const targetSection = document.querySelector(href);
        
        if (targetSection) {
            targetSection.scrollIntoView({
                behavior: 'smooth'
            });
        }
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Mobile menu toggle
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }
    
    // Mobile overlay click
    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', closeMobileMenu);
    }
    
    // Sidebar link clicks
    if (sidebar) {
        sidebar.addEventListener('click', handleSidebarClick);
    }
    
    // Email copy functionality
    document.addEventListener('click', copyEmail);
    
    // Smooth scroll for anchor links
    document.addEventListener('click', smoothScroll);
    
    // Close mobile menu on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isMobileMenuOpen) {
            toggleMobileMenu();
        }
    });
});

// Resize event listener
window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && isMobileMenuOpen) {
        toggleMobileMenu();
    }
});

// Export for external use
window.portfolioUtils = {
    toggleMobileMenu,
    showNotification
};