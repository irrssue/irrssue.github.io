---
title: "My Git Workflow for Solo Projects"
date: "2025-07-12 11:20:00"
tags: ["development"]
summary: "How I use Git for personal projects without overcomplicating things."
cover: ""
draft: false
---

## TL;DR
- Main branch for production
- Feature branches for experiments
- Commit messages that tell a story

## Context

I used to commit everything to main with messages like "fix stuff" and "updates". Looking back at my history was painful.

## Main

### Simple Branch Strategy

I keep it simple:
- `main` - always deployable
- `feature/thing` - for new features
- `fix/bug` - for bug fixes

No develop branch, no release branches. Just main and temporary feature branches.

### Commit Messages Matter

I write commit messages as if I'm explaining to my future self:
- What changed
- Why it changed
- What to watch out for

Three months later, these notes are gold.

### Squash Before Merging

My feature branches are messy - "wip", "fix typo", "actually fix it this time". Before merging to main, I squash them into one clean commit with a good message.

## Takeaways

- Keep it simple, especially for solo work
- Future you is a different person - leave notes
- Git is for humans, not just machines
- Clean history > perfect process
