// Make sure the page starts at the top on load
window.addEventListener('DOMContentLoaded', function() {
    // Reset scroll position to top
    window.scrollTo(0, 0);
});

// Add a more aggressive approach to ensure top position
window.addEventListener('load', function() {
    // Multiple attempts to scroll to top with different timings
    window.scrollTo(0, 0);
    
    // Try again after a slight delay (some browsers need this)
    setTimeout(function() {
        window.scrollTo(0, 0);
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'auto' // Use 'auto' instead of 'smooth' for immediate effect
        });
        
        // Force body to top
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
    }, 10);
    
    // And again after browser has fully rendered
    setTimeout(function() {
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
    }, 100);
    
    // Remove any hash from the URL that might cause auto-scrolling
    if (window.location.hash) {
        // Create a new URL without the hash
        const noHashURL = window.location.href.split('#')[0];
        // Use history.replaceState to change the URL without reloading the page
        window.history.replaceState('', document.title, noHashURL);
    }
});

// Smooth scrolling for navigation
document.querySelectorAll(".nav-links a, .btn").forEach(link => {
    link.addEventListener("click", function(e) {
        if (this.getAttribute("href").startsWith("#")) {
            e.preventDefault();
            const targetId = this.getAttribute("href").substring(1);
            
            if (targetId === "top") {
                // For the "top" target, scroll to the absolute top
                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
            } else {
                // For other targets, scroll to their position
                document.getElementById(targetId).scrollIntoView({
                    behavior: "smooth"
                });
            }
        }
    });
});

// Rest of your JavaScript code...
// Intersection Observer for animations
const animatedElements = document.querySelectorAll('.animated');

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.1 });

// Set initial state for animated elements
animatedElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
    observer.observe(el);
});

// Handle navigation bar appearance on scroll
const navbar = document.querySelector('nav');

window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
        navbar.classList.add('nav-scrolled');
    } else {
        navbar.classList.remove('nav-scrolled');
    }
});

// Add active class to nav links based on scroll position
const sections = document.querySelectorAll('section');
window.addEventListener('scroll', () => {
    let current = '';
    
    // Special case for top of page
    if (window.scrollY < 100) {
        current = 'top';
    } else {
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (pageYOffset >= (sectionTop - sectionHeight / 3)) {
                current = section.getAttribute('id');
            }
        });
    }

    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}` || 
            link.getAttribute('href') === `index.html#${current}`) {
            link.classList.add('active');
        }
    });
});