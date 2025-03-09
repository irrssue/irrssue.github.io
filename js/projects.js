// Function to load projects from JSON file
async function loadProjects() {
    try {
        // Fetch the projects data from JSON file
        const response = await fetch('data/projects.json');
        if (!response.ok) {
            throw new Error('Failed to load projects data');
        }
        const projectsData = await response.json();
        
        // Render featured projects
        renderFeaturedProjects(projectsData.featuredProjects);
        
        // Render other projects
        renderOtherProjects(projectsData.otherProjects);
        
    } catch (error) {
        console.error('Error loading projects:', error);
        document.querySelector('#projects .container').innerHTML += `
            <p class="error-message">Failed to load projects. Please try again later.</p>
        `;
    }
}

// Render the featured projects (larger cards with colored backgrounds)
function renderFeaturedProjects(projects) {
    const projectContainer = document.querySelector('.project-container');
    if (!projectContainer) return;
    
    projectContainer.innerHTML = '';
    
    projects.forEach(project => {
        const projectCard = document.createElement('div');
        projectCard.className = 'project-card';
        projectCard.id = `project-${project.id}`;
        
        projectCard.innerHTML = `
            <div class="project-category">${project.category}</div>
            <h3 class="project-title">${project.title}</h3>
            <p class="project-description">${project.description}</p>
            <div class="project-tags">
                ${project.tags.map(tag => `<span class="project-tag">${tag}</span>`).join('')}
            </div>
            <div class="project-img-container">
                <img src="${project.image}" alt="${project.title}" class="project-img">
            </div>
            <div class="project-links">
                ${project.repoUrl ? `<a href="${project.repoUrl}" target="_blank" class="project-link">GitHub</a>` : ''}
                ${project.liveUrl ? `<a href="${project.liveUrl}" target="_blank" class="project-link">Live Demo</a>` : ''}
            </div>
        `;
        
        projectContainer.appendChild(projectCard);
    });
}

// Render the other projects (smaller cards)
function renderOtherProjects(projects) {
    const smallProjectContainer = document.querySelector('.small-project-container');
    if (!smallProjectContainer) return;
    
    smallProjectContainer.innerHTML = '';
    
    projects.forEach(project => {
        const projectCard = document.createElement('div');
        projectCard.className = 'small-project-card';
        projectCard.id = `project-${project.id}`;
        
        projectCard.innerHTML = `
            <h3 class="small-project-title">${project.title}</h3>
            <p class="small-project-description">${project.description}</p>
            <div class="project-tags">
                ${project.tags.map(tag => `<span class="project-tag">${tag}</span>`).join('')}
            </div>
            <div class="small-project-links">
                ${project.repoUrl ? `<a href="${project.repoUrl}" target="_blank" class="small-project-link">GitHub</a>` : ''}
                ${project.liveUrl ? `<a href="${project.liveUrl}" target="_blank" class="small-project-link">Live Demo</a>` : ''}
            </div>
        `;
        
        smallProjectContainer.appendChild(projectCard);
    });
}

// Add additional CSS for project links
function addProjectLinkStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .project-links, .small-project-links {
            display: flex;
            gap: 1rem;
            margin-top: 1rem;
        }
        
        .project-link, .small-project-link {
            color: #2c5545;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.3s ease;
        }
        
        .project-link:hover, .small-project-link:hover {
            color: #1e3b2f;
            text-decoration: underline;
        }
    `;
    document.head.appendChild(style);
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    addProjectLinkStyles();
    loadProjects();
});