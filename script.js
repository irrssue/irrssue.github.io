// Show alert on button click
function showAlert(message) {
    alert(`You clicked: ${message}`);
}

// Smooth scrolling for navigation
document.querySelectorAll(".nav-links a").forEach(link => {
    link.addEventListener("click", function(e) {
        e.preventDefault();
        const targetId = this.getAttribute("href").substring(1);
        document.getElementById(targetId).scrollIntoView({
            behavior: "smooth"
        });
    });
});