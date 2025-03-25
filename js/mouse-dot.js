// Artistic cursor with trail effect
document.addEventListener('DOMContentLoaded', function() {
    // Hide default cursor immediately
    document.body.style.cursor = 'none';
    // Create container for all cursor elements
    const cursorContainer = document.createElement('div');
    cursorContainer.className = 'cursor-container';
    document.body.appendChild(cursorContainer);
    
    // Create main cursor dot
    const cursorDot = document.createElement('div');
    cursorDot.className = 'cursor-dot';
    cursorContainer.appendChild(cursorDot);
    
    const numTrails = 5;
    const trails = [];
    
    for (let i = 0; i < numTrails; i++) {
      const trail = document.createElement('div');
      trail.className = 'cursor-trail';
      trail.style.opacity = (1 - i / numTrails) * 0.3; // Decreasing opacity
      trail.style.width = `${8 - i}px`;
      trail.style.height = `${8 - i}px`;
      cursorContainer.appendChild(trail);
      trails.push({
        element: trail,
        x: -100,
        y: -100
      });
    }
    
    // Variables for mouse position
    let mouseX = -100;
    let mouseY = -100;
    
    // Variables for main cursor position
    let dotX = -100;
    let dotY = -100;
    
    // Track mouse position
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });
    
    // Handle cursor visibility
    document.addEventListener('mouseenter', () => {
      cursorDot.style.opacity = '1';
      trails.forEach(trail => {
        trail.element.style.opacity = parseFloat(trail.element.style.opacity) * 2;
      });
    });
    
    document.addEventListener('mouseleave', () => {
      cursorDot.style.opacity = '0';
      trails.forEach(trail => {
        trail.element.style.opacity = '0';
      });
    });
    
    // Fix for cursor reappearing after switching tabs/windows
    window.addEventListener('blur', () => {
      cursorDot.style.opacity = '0';
      trails.forEach(trail => {
        trail.element.style.opacity = '0';
      });
      document.body.style.cursor = 'none';
    });
    
    window.addEventListener('focus', () => {
      document.body.style.cursor = 'none';
    });
    
    // Add hover effects for interactive elements
    const interactiveElements = document.querySelectorAll('a, button, .nav-menu a');
    
    interactiveElements.forEach(el => {
      el.addEventListener('mouseenter', () => {
        cursorDot.classList.add('active');
        trails.forEach(trail => {
          trail.element.classList.add('active');
        });
      });
      
      el.addEventListener('mouseleave', () => {
        cursorDot.classList.remove('active');
        trails.forEach(trail => {
          trail.element.classList.remove('active');
        });
      });
    });
    
    // Animation function for smooth movement
    function animateCursor() {
      // Calculate smooth movement with easing for main dot
      const dotEase = 0.2;
      dotX += (mouseX - dotX) * dotEase;
      dotY += (mouseY - dotY) * dotEase;
      
      // Apply position to main dot
      cursorDot.style.left = `${dotX}px`;
      cursorDot.style.top = `${dotY}px`;
      
      // Update trail positions with increasing delay
      trails.forEach((trail, index) => {
        const trailEase = 0.1 - (index * 0.01); // Decreasing ease factor for trailing effect
        
        trail.x += (dotX - trail.x) * trailEase;
        trail.y += (dotY - trail.y) * trailEase;
        
        trail.element.style.left = `${trail.x}px`;
        trail.element.style.top = `${trail.y}px`;
      });
      
      // Continue the animation loop
      requestAnimationFrame(animateCursor);
    }
    
    // Start the animation
    animateCursor();
  });