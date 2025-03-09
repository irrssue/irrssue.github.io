// Simplified grain animation effect
document.addEventListener('DOMContentLoaded', () => {
    // No need to select a specific element since we're using body::before
    
    // We'll apply a very subtle movement to the body's ::before pseudo-element
    let posX = 0;
    let posY = 0;
    let moveX = 0.1;
    let moveY = 0.05;

    function animateGrain() {
        posX += moveX;
        posY += moveY;
        
        // Create a subtle movement loop
        if (posX > 5 || posX < -5) moveX *= -1;
        if (posY > 5 || posY < -5) moveY *= -1;
        
        // Apply the position to the body's ::before pseudo-element
        document.body.style.setProperty('--grain-x', `${posX}px`);
        document.body.style.setProperty('--grain-y', `${posY}px`);
        
        requestAnimationFrame(animateGrain);
    }
    
    // Set initial CSS variables
    document.body.style.setProperty('--grain-x', '0px');
    document.body.style.setProperty('--grain-y', '0px');
    
    // Start the animation
    animateGrain();
});