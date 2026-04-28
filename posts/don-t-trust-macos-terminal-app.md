---
title: "Don't Trust macOS Terminal App"
date: "Apr 28, 2026"
tag: "MacOS"
summary: ""
cover: ""
draft: false
---

I lost an hour today to a bug that wasn't a bug. Or rather — it was a bug, just not the one I was looking for.
 
## What I was trying to do
 
I'd just installed Claude Code on my homelab (Ubuntu Server, headless, SSH'd in via Tailscale). On first launch it asks you to authenticate. Since the box has no browser, the CLI prints an OAuth URL and tells you to open it on another machine, log in, and paste the resulting code back.
 
Standard headless auth flow. Should take ten seconds.
 
It took an **hour**.
 
## What kept happening
 
I'd copy the URL from my terminal, paste it into the browser on my MacBook, and get this:
 
> **Invalid OAuth Request** — Unknown scope: `u`
 
Different attempt, different error:
 
> **Invalid OAuth Request** — Invalid `code_challenge_method`: missing. Expected: `S256`
 
Different attempt, *different* error again:
 
> **Invalid OAuth Request** — Unknown scope: `user:se`
 
Three different errors from the same supposed action. That's the tell. The OAuth server was getting three different malformed URLs because **three different parts of the URL were getting chopped each time I copied it**.
 
## The actual cause
 
The OAuth URL is roughly 470 characters. In macOS Terminal.app, when a line is wider than the window, the terminal **inserts a hard newline at the wrap point**. Not a soft wrap — an actual `\n` character baked into the buffer.
 
So when I triple-clicked to "select the line," I was actually selecting one chunk of a multi-line string. When I dragged across all three visual lines, the newlines came along for the ride. When that pasted into the browser address bar, the browser either:
 
1. Stopped reading at the first newline (truncating the URL), or
2. Replaced the newline with a space (corrupting whatever scope/parameter was at the wrap point)
Either way, the URL the OAuth server received was not the URL the CLI had generated. And because URLs are encoded — `user%3Asessions` instead of `user:sessions` — the corruption was invisible. It looked fine. It pasted fine. It just wasn't the same string.
 
The reason the error kept changing? Each retry generated a fresh URL with a fresh `code_challenge`, fresh `state`, fresh everything. The wrap points landed on different characters, breaking different parts of the URL.
 
## What fixed it
 
I tried four things before the right one:
 
1. **Resize the terminal wider** — helped a bit, URL still wrapped to 2 lines.
2. **Shrink the font with Cmd+-** — same problem, just smaller text.
3. **Capture the URL to a file with `tee`, then `grep` it out** — would've worked but felt like overkill.
4. **Switch to iTerm2** — done.
iTerm2 doesn't bake newlines into wrapped lines. They stay as one logical line in the buffer. Triple-click selects the whole thing cleanly. Even better: it auto-detects URLs and underlines them. **Cmd+click and the URL opens in your browser directly.** No copy-paste at all.
 
First try. Worked. Logged in. Done.
 
## What I'm taking from this
 
Two things, mostly.
 
**One: macOS Terminal.app's wrap behavior is silently destructive.** Anything longer than your window width is being mutated when you copy it. JWT tokens, base64 blobs, OAuth URLs, encoded query strings, paste-bin links — anything that can't tolerate a stray `\n` is at risk. You won't notice with most things because most things tolerate whitespace damage. URLs and signed tokens don't.
 
**Two: when an error message keeps changing across identical retries, something nondeterministic is in your loop.** I should've caught it sooner. I was treating "Invalid OAuth Request" as one failure mode. It was actually three different failures, each pointing at a different wrap-point corruption. The varying error message *was the diagnostic signal.*
 
If you're on macOS and you do anything where exact string fidelity matters — auth flows, API testing, copying configs over SSH — install iTerm2. `brew install --cask iterm2`. Five seconds. Don't trust Terminal.app with anything you can't visually verify character-by-character.