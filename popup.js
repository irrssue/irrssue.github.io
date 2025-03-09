// Add this to your main.js file
document.addEventListener('DOMContentLoaded', function() {
    // Show the popup when the page loads
    const popup = document.getElementById('development-popup');
    
    // Check if the user has already closed the popup in this session
    if (!sessionStorage.getItem('popupClosed')) {
      popup.style.display = 'flex';
    } else {
      popup.style.display = 'none';
    }
    
    // Close popup when the X is clicked
    const closeBtn = document.querySelector('.close-popup');
    closeBtn.addEventListener('click', function() {
      popup.style.display = 'none';
      
      // Store in session storage so it doesn't show again during this session
      sessionStorage.setItem('popupClosed', 'true');
    });
    
    // Close popup when clicking outside the popup content
    window.addEventListener('click', function(event) {
      if (event.target === popup) {
        popup.style.display = 'none';
        sessionStorage.setItem('popupClosed', 'true');
      }
    });
  });