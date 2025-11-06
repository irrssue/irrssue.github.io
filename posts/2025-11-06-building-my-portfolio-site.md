---
title: "Building My Portfolio Site"
date: "2025-11-06 03:50:00 +0000"
tags: ["web development", "portfolio", "github pages"]
summary: "A journey through creating a personal portfolio site with GitHub Pages, dark mode, and a custom blog system."
cover: ""
draft: false
---

## TL;DR
- Built a portfolio site using GitHub Pages with custom navigation and dark mode
- Created a dynamic blog system that reads Markdown files
- Automated post creation with GitHub Actions

## Context

I wanted to create a personal portfolio site that was simple, fast, and easy to maintain. After exploring various options, I decided to use GitHub Pages with a custom-built blog system that uses Markdown files.

The goal was to have something that looked professional but didn't require a heavy framework or complex build process. Just HTML, CSS, JavaScript, and Markdown.

## Main

### The Design

I went with a minimal, clean design inspired by modern portfolios. The site features:

- A floating sidebar navigation that stays visible as you scroll
- A **dark mode toggle** that remembers your preference
- Smooth transitions and hover effects for better interactivity

The color scheme is simple - mostly grayscale with subtle accents. In dark mode, everything inverts beautifully without being harsh on the eyes.

### The Blog System

Instead of using a static site generator like Jekyll or Hugo, I built a lightweight blog system that:

1. Stores posts as Markdown files in a `posts/` folder
2. Uses the GitHub API to fetch and list all posts dynamically
3. Parses YAML front matter for metadata (title, date, tags, etc.)
4. Renders Markdown to HTML using markdown-it library
5. Sanitizes output with DOMPurify for security

Here's what a typical post looks like:

```markdown
---
title: "My Post Title"
date: "2025-11-06"
tags: ["tag1", "tag2"]
summary: "Brief description"
draft: false
---

## Your Content Here

Write your post in Markdown...
```

### Automation with GitHub Actions

To make creating new posts easier, I added a GitHub Action that:

- Runs on manual trigger (workflow_dispatch)
- Takes a post title as input
- Generates a slug from the title
- Creates a new Markdown file from the template
- Auto-fills the date and title
- Commits the file to the repository

This means I can create a new post in seconds without touching any code!

### Technical Highlights

Some interesting technical decisions:

- **No build step**: Everything runs client-side using CDN libraries
- **Draft mode**: Posts with `draft: true` are hidden from the list
- **Dark mode persistence**: Uses localStorage to remember your preference
- **Responsive design**: Works on mobile, tablet, and desktop
- **Fast loading**: Minimal dependencies, all from CDN

The entire site is under 50KB including all HTML, CSS, and JavaScript. That's smaller than most hero images on modern websites!

## Takeaways

- You don't always need a complex framework to build something great
- GitHub Pages is perfect for personal sites and portfolios
- Markdown is an excellent format for blog posts
- Dark mode should be standard on every site in 2025
- Automation saves time and reduces friction

If you're thinking about building your own portfolio site, I highly recommend keeping it simple. Focus on content and user experience rather than fancy tech stacks.

The code for this site is open source on my [GitHub](https://github.com/irrssue/irrssue.github.io). Feel free to check it out and use it as inspiration for your own projects!

---

*Have questions or suggestions? Reach out to me on [Twitter](https://twitter.com/irrssue) or [Instagram](https://www.instagram.com/irrssue).*
