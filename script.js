// Smooth scrolling for navigation
document.querySelectorAll(".nav-links a, .btn").forEach(link => {
    link.addEventListener("click", function(e) {
        if (this.getAttribute("href").startsWith("#")) {
            e.preventDefault();
            const targetId = this.getAttribute("href").substring(1);
            document.getElementById(targetId).scrollIntoView({
                behavior: "smooth"
            });
        }
    });
});

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

// Navbar stays visible
const navbar = document.querySelector('nav');
const navLinks = document.querySelector('.nav-links');

// We're no longer changing the navbar's background color or visibility
// Instead, we'll just make sure it stays at the top of the page

// Add active class to nav links based on scroll position
const sections = document.querySelectorAll('section');
window.addEventListener('scroll', () => {
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= (sectionTop - sectionHeight / 3)) {
            current = section.getAttribute('id');
        }
    });

    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});