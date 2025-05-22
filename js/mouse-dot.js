document.addEventListener('DOMContentLoaded', function() {
    document.body.style.cursor = 'none';
    
    const cursorDot = document.createElement('div');
    cursorDot.className = 'cursor-dot';
    document.body.appendChild(cursorDot);
    
    document.addEventListener('mousemove', (e) => {
      cursorDot.style.left = `${e.clientX}px`;
      cursorDot.style.top = `${e.clientY}px`;
    });
    
    document.addEventListener('mouseenter', () => {
      cursorDot.style.opacity = '1';
    });
    
    document.addEventListener('mouseleave', () => {
      cursorDot.style.opacity = '0';
    });

    document.addEventListener('click', () => {
      cursorDot.classList.add('click');
      setTimeout(() => {
        cursorDot.classList.remove('click');
        }, 500);
      });
  
      window.addEventListener('blur', () => {
        cursorDot.style.opacity = '0';
      });
      
      window.addEventListener('focus', () => {
        cursorDot.style.opacity = '1';
      });
      
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