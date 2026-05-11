---
title: "Dealing with \"In Terminal\" copy is pain in ass"
date: "May 5, 2026"
tag: "MacOS"
summary: ""
cover: ""
draft: false
---

# I set up GitHub Actions auto-deploy again, and terminals still hate formatted text

I wrote a whole post about this already.

Last time, I spent four hours trying to wire up GitHub Actions to auto-deploy my homelab app. Tailscale OAuth, broken known_hosts, six secrets, a pile of `fix(ci):` commits. Eventually gave up, nuked the workflow, and discovered a cron job that had been silently doing the same thing for weeks.

The lesson I wrote: *before reaching for a new system, run `crontab -l`.*

Reader, I did not learn the lesson.

---

A few weeks later I found myself migrating from one laptop to another, setting up a Cloudflare tunnel, and the GitHub Actions itch came back. This time felt different though. The tunnel was already there. SSH over cloudflared was a real path — no Tailscale OAuth, no magic. Just `cloudflared access ssh --hostname ssh.irrssue.com` as a ProxyCommand and the runner could reach my homelab like any other SSH host.

So I started. Again.

The tunnel config had to be cleaned up first — remove the old ingress rules, add the SSH endpoint. Simple edit to `/etc/cloudflared/config.yml`. I asked Claude Code to help.

The first attempt was a heredoc:

```bash
sudo tee /etc/cloudflared/config.yml << 'EOF'
tunnel: 0a8aaea3-...
...
EOF
```

When I copy-pasted it from the chat, the terminal showed `>` and sat there. The heredoc never closed, because the chat had indented `EOF` with leading spaces, and bash needs it at column zero. The shell was waiting for a closing marker that would never come.

Fine. We switched to `printf`. Long one-liner, paste it — except the chat interface had visually wrapped the string at the edge of the window, and those visual line breaks became real newlines when I copied. The file came out mangled: `credentials-file:` on one line, the path on the next, completely broken YAML.

A `sed` attempt to fix it made it worse.

We ended up doing it the right way: `nano /tmp/cf.yml`, type it fresh, `sudo cp` it over. Five minutes of manual work that would have taken thirty seconds if we'd just started there. The lesson about terminals and formatted text is that they hate each other, and the longer the string, the worse it gets.

---

The workflow itself came together cleanly once the tunnel was healthy. Three steps: install cloudflared on the runner, configure SSH with the ProxyCommand, SSH in and deploy. The deploy script is the same one the cron job uses — `git pull`, `npm ci`, `npm run build`, `pm2 restart`.

Then the known_hosts.

You need the SSH host keys for `ssh.irrssue.com` in the GitHub secret so the runner can verify it's connecting to the right machine. I had the keys from a previous session — three lines, each about 400 characters long. I pasted them into the chat. The chat wrapped them. I tried to copy them back out to paste into GitHub Secrets. The wrapped lines looked like separate entries. GitHub rejected it.

The fix was obvious in hindsight and annoying in practice: don't copy from the chat at all. Generate it fresh on the homelab and copy from your own terminal:

```bash
ssh-keyscan -t rsa,ecdsa,ed25519 100.100.200.29 2>/dev/null \
  | sed 's/100\.100\.200\.29/ssh.irrssue.com/'
```

Three lines, correct format, no wrapping. Copy from terminal to GitHub Secrets. Done.

The deploy key had the same gotcha in reverse — the private key is a multiline block with a header and footer, and you need every character exactly right. The chat output looked fine but I had a moment of "wait is this correct?" before I confirmed the BEGIN/END lines were intact.

---

The workflow ran. Green checkmark. `deployed: 9dc5370` in the logs.

The cron job is still running. It'll find `LOCAL == REMOTE` every two minutes and exit quietly, which is fine. I'll remove it eventually, once I trust Actions enough to not want the safety net.

Here is what I actually learned this time, distinct from last time:

**Never copy a long formatted string from a chat interface if you can generate it locally instead.** Chats wrap long lines. Terminals wrap long lines. The combination will always produce broken output, and you'll spend more time debugging the copy-paste than you would have spent running one command yourself. `ssh-keyscan` exists. Use it.

And if a heredoc in a terminal shows `>`, immediately `Ctrl+C` and check whether your closing `EOF` had leading spaces. It always does.

The deploy works now. Took about two hours total, most of which was formatting issues, none of which was the actual logic. Classic.