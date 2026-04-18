---
title: "how I build irrssue.com"
date: "Apr 18, 2026"
tag: "personal"
summary: ""
cover: ""
draft: false
---

Most personal sites I admire are embarrassingly simple. You load the page and what you get is text, a couple of links, and nothing else. No skeleton loaders. No hero video. No cookie banner begging for consent. It feels like reading a letter someone wrote, not a product someone launched.
That's the kind of site I wanted to build. So I did — three times, actually, before I landed on the version that's live now at irrssue.com.
This is a post about what that site is, why it looks the way it looks, and the handful of decisions I made that I think are worth writing down.

The short version
irrssue.com is my personal portfolio and writing site. It's vanilla HTML, CSS, and JavaScript — no React, no Next.js, no Tailwind, no build step. It's served as static files from GitHub Pages out of the main branch of a public repo. When I want to publish a blog post, I write a markdown file, push it, and a GitHub Action renders it to HTML.
The whole thing weighs next to nothing. First paint is sub-second even on a slow connection. There are no external scripts on the initial load — no analytics, no fonts CDN except a small cycling-font experiment on the homepage, no icon library. The design philosophy, written in my own CLAUDE.md as a note to future me, is that every element earns its place and the default is to remove, not add.

Why vanilla
I've built things in React. I like React. But a personal site is the one project where a framework actively hurts you.
A framework buys you reactivity, component isolation, and a component ecosystem. For an app with state — a dashboard, a form-heavy tool, a real product — those are worth the cost. For a portfolio with a homepage, a writing list, a bookmarks page, and a blog post template, none of them are worth anything. I don't need reactivity. I don't have state. I have text.
What a framework costs you, even a good one, is a build step, a dependency tree, a bundle that has to ship, and a layer of indirection between what you write and what the browser renders. On a project I want to still be able to edit in five years with zero ceremony, that's the wrong trade.
The rule I set was: the site must work fully without JavaScript enabled. JS can add polish — a theme toggle, a hover-card preview on social links, an intro animation — but the content has to render without it. That rule falls out naturally when you're writing raw HTML. It's almost impossible to follow when you're writing React.

The design
The visual design is aggressively plain. Single column, ~640px max width, centered. System font stack. Black text on white, or soft off-white on black in dark mode. No cards, no shadows, no borders, no rounded hover backgrounds on links. Links are the same color as body text and only differentiate on hover.
The inspiration was two sites: Guillermo Rauch's and, surprisingly, Berkshire Hathaway's corporate homepage. One is the CEO of Vercel and the other is Warren Buffett's holding company, and they share a philosophy: the page is the content. There is no "experience" wrapping the text. You read the words and then you leave.
That's what I was trying to copy. The page should feel like a well-formatted plain text document, not a brochure.
A few specific rules I wrote down for myself:
The name on the homepage is small. It's not a hero. It sits at about 1.2–1.5rem, not the giant 4rem display type you see on most dev portfolios. A giant name announces that the page is about you in a way that's faintly embarrassing. A small name lets the work speak.
Section labels are lowercase, muted, and 0.85rem. They look like labels, not headings. Compare to a site that gives you <h2>PROJECTS</h2> at 2rem — the section label is visually screaming, even though the reader doesn't need it to.
Dates on entries are right-aligned using margin-left: auto in a flex container. This is a small detail but it's what makes the page feel like a resume or a document rather than a blog post. Your eye scans names on the left, dates on the right.
Everything flows through CSS custom properties defined in :root. Colors, spacing, typography, max-width — all tokens. Dark mode is literally just a re-declaration of those tokens under body.dark-mode. That's the whole mechanism.

The writing pipeline
This is the part I'm most proud of, because it's the part that was tempting to over-engineer.
Blog posts live in /posts/ as markdown files with YAML front matter. A GitHub Action runs on push and renders them to HTML. The writing page loads a JSON index of posts and renders the list client-side. Individual posts load at /html/post.html?slug=<post-slug> and the page fetches the rendered HTML and injects it.
Front matter looks like this:
---
title: "How I Replaced Google With a Homelab"
date: "Apr 13, 2026"
tag: "Homelab"
summary: ""
cover: ""
draft: false
---
Tags must be single words — no spaces. draft: true keeps a post out of the index. That's the whole system.
I considered using a static site generator. Hugo, Eleventy, Astro, Jekyll, whatever. Every one of them is a more capable, more mature, better-tested version of what I built. I didn't use one because I wanted to understand every line of code that runs when I publish a post. When something breaks — and things break, especially with GitHub Actions — I want to be able to fix it by reading my own code instead of digging through somebody else's documentation.
The cost of this choice is real. I don't have syntax highlighting out of the box. I don't have RSS yet. I don't have automatic image optimization. Every feature I want, I have to build. But each of those features is a small, self-contained problem, and solving them one at a time has taught me more than picking a generator off the shelf would have.

The CMS I wrote in one HTML file
The piece of the site I have the most fun with is /html/admin.html. It's a browser-based admin panel — a lightweight CMS — that I wrote in a single HTML file.
Here's what it does. I open the admin page, paste in a GitHub personal access token, and I get an interface for managing everything on the site: projects, bookmarks, and blog posts. I can edit project entries, add new bookmarks with tags, write and preview markdown posts, and save changes directly to the repository. It calls the GitHub API from the browser. There is no backend.
That last part is the interesting part. I don't have a server. The admin page is just HTML, CSS, and JavaScript that knows how to talk to api.github.com. When I save a post, the page fetches the current file, applies my changes, base64-encodes the new content, and PUTs it back with my token. GitHub commits the change. The Action runs. The site updates.
Why build this instead of just editing files in a code editor? Because friction matters. The difference between "open my laptop, open VS Code, navigate to the repo, create a new file, write the front matter, commit, push" and "go to the admin URL, click New Post, write, save" is the difference between publishing and not publishing. Every layer of ceremony is a place where the impulse to write dies.
The admin page is also a small love letter to what the web can be. An entire content management system, running in a browser tab, editing a GitHub repo, with no server, no database, no deployment. That feels like magic in a way that is obvious in hindsight and rare in practice.

What I learned rebuilding it
I've rebuilt this site from scratch at least three times. Each version taught me something. Two lessons stuck.
Rebuilding is the real learning. The first version was overengineered — animations everywhere, big hero text, icon libraries, effects I thought looked cool at the time. The second was cleaner but still trying too hard. The current one started from the opposite question: what can I remove without losing anything? That's a better question than "what can I add to make this look impressive?" It produces better answers.
Constraints are a creative tool. Deciding up front that the site must work without JavaScript, must load in under a second, must have zero external requests on initial paint, and must be editable with no build step — those constraints forced me to make design and architecture decisions I wouldn't have made otherwise. I don't think I would have arrived at a single-HTML-file CMS if I'd been allowed to spin up a Next.js backend.
If you're a developer, your personal site is one of the few pieces of software you'll ever ship that has no deadline, no stakeholder, and no success metric other than your own taste. Use it to practice restraint. Use it to practice finishing. Nobody will judge you for the site being small. People will remember it for being fast and quiet and readable.

What's next
There's a list. RSS feed. A /now page. An /uses page. Syntax highlighting for code blocks. Proper image optimization baked into the Action. A newsletter that's just a pure email list with no tracking. None of these are urgent. All of them are obvious.
The site itself will keep being what it is — a place where I write things down and point to work I've made. If any of this resonated, the source code is public at github.com/irrssue/irrssue.github.io. Clone it, strip it, make it yours. A personal site should feel personal. That's the only rule that matters.\

---

I write about software, self-hosting, and building things at irrssue.com. You can also find me on YouTube and GitHub.