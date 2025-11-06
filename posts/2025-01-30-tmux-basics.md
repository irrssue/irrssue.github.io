---
title: "Tmux Basics for Beginners"
date: "2025-01-30 10:00:00"
tags: ["productivity"]
summary: "Getting started with tmux - sessions, windows, and panes explained simply."
cover: ""
draft: false
---

## TL;DR
- Tmux manages multiple terminal sessions
- Learn prefix key combinations
- Sessions persist after disconnect

## Context

I kept losing my terminal work when SSH connections dropped. Tmux solved this.

## Main

Basic commands I use daily:
- `tmux new -s name` - create session
- `Ctrl+b d` - detach
- `tmux attach` - reattach
- `Ctrl+b %` - split vertical
- `Ctrl+b "` - split horizontal

## Takeaways

- Start with sessions and splits
- Customize your prefix key
- Use resurrect plugin to save sessions
