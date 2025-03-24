# Portfolio Website

A modern, responsive portfolio website built with HTML, CSS, and JavaScript.

## Features

- Responsive design that works on all devices
- Dynamic project loading from JSON data
- Separate About page
- Smooth scrolling and animations
- Modern UI with gradient background

## Project Structure

```
portfolio/
├── index.html              # Main page
├── about.html              # About page
├── css/
│   ├── styles.css          # Main styles
│   ├── project.css         # Project section styles
│   └── about-styles.css    # About page styles
├── js/
│   ├── main.js             # Main JavaScript
│   └── projects.js         # Project loading script
├── data/
│   └── projects.json       # Project data
├── assets/
│   ├── images/             # For project images and profile photos
│   └── icons/              # For any icons you might use
└── README.md               # Project documentation
```

testing

## How to Add New Projects

To add a new project to your portfolio, simply edit the `data/projects.json` file:

1. For a featured project (large card), add it to the `featuredProjects` array
2. For a regular project (small card), add it to the `otherProjects` array
3. Follow the existing format with all required fields
4. Add project images to the `assets/images/projects/` directory
5. Commit and push your changes to GitHub

Example project JSON:
```json
{
  "id": "projectname",
  "category": "CATEGORY",
  "title": "Project Title",
  "description": "Short description of the project.",
  "tags": ["Tag1", "Tag2", "Tag3"],
  "image": "assets/images/projects/projectname.jpg",
  "repoUrl": "https://github.com/username/repo",
  "liveUrl": "https://example.com/demo"
}
```

## Deployment

This site is deployed on GitHub Pages. Any changes pushed to the main branch will be automatically deployed.

## Local Development

To run this site locally:

1. Clone the repository
2. Open the project folder
3. Open `index.html` in your browser

## Credits

- Fonts: [Google Fonts](https://fonts.google.com/)
- Original design and development by Irrssue



chronological order
