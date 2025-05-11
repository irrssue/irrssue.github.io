// Simple dot cursor with no delay or trailing effect
document.addEventListener('DOMContentLoaded', function() {
    // Hide default cursor immediately
    document.body.style.cursor = 'none';
    
    // Create cursor dot
    const cursorDot = document.createElement('div');
    cursorDot.className = 'cursor-dot';
    document.body.appendChild(cursorDot);
    
    // Track mouse position and update cursor immediately
    document.addEventListener('mousemove', (e) => {
      // Direct positioning - no easing or delay
      cursorDot.style.left = `${e.clientX}px`;
      cursorDot.style.top = `${e.clientY}px`;
    });
    
    // Handle cursor visibility
    document.addEventListener('mouseenter', () => {
      cursorDot.style.opacity = '1';
    });
    
    document.addEventListener('mouseleave', () => {
      cursorDot.style.opacity = '0';
    });

    document.addEventListener('click', () => {
      // Add a click effect
      cursorDot.classList.add('click');
      setTimeout(() => {
        cursorDot.classList.remove('click');
        }, 500); // Duration of the click effect
      });
  
      // Fix for cursor reappearing after switching tabs/windows
      window.addEventListener('blur', () => {
        cursorDot.style.opacity = '0';
      });
      
      window.addEventListener('focus', () => {
        cursorDot.style.opacity = '1';
      });
      
      // Add hover effects for interactive elements
      const interactiveElements = document.querySelectorAll('a, button, .nav-menu a');
      
      interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
          cursorDot.classList.add('active');
        });
        
        el.addEventListener('mouseleave', () => {
          cursorDot.classList.remove('active');
        });
      });
  });