---
title: "I Caught My AI Agent Lying About My Subscription (Here's The Proof)"
date: "Jul 30, 2026"
tag: "AI"
summary: ""
cover: ""
draft: false
---

# The Case of the Phantom Extra Usage

*How a 400 error with 6% subscription usage led to a multi-hour investigation across two parallel AI agents, a stale process, and a provider rewrite.*

## TL;DR

Hermes; my agent runtime that wraps Claude Code; was silently billing every request to a separate "extra usage" credit pool instead of my Claude Pro subscription, even while my weekly plan usage sat at 6%. The root cause wasn't a rate limit, a burst window, or a leaked API key. It was Hermes's native `anthropic` provider making direct OAuth-token HTTP calls to `api.anthropic.com`; a path that, per Hermes's own docs, only draws from purchased extra-usage credits and is gated to Claude Max, not Pro. The fix was building a new `claude-code-cli` provider that spawns the actual local `claude` binary as a subprocess instead of hitting the API directly, so the request goes through the same authenticated CLI session I use every day; and inherits my Pro subscription's quota instead of bypassing it.

This is the full log of how that got diagnosed, including the wrong turns.

## The trigger

I run Hermes as an agent layer on top of Claude Code CLI, authenticated with my own Claude Pro subscription; no separate API key. Mid-session, a task failed with:

```
API call failed (attempt 1/3): BadRequestError [HTTP 400]
🔌 Provider: anthropic  Model: claude-sonnet-5
🌐 Endpoint: https://api.anthropic.com
📝 Error: HTTP 400: You're out of extra usage. Add more at claude.ai/settings/usage and keep going.
```

The confusing part: `claude.ai/settings/usage` showed my weekly plan usage at roughly 6%. Nowhere close to exhausted. So why was I being told to buy more usage?

## First theory: stray API key shadowing the subscription

The most common cause of "subscription usage silently routes to pay-as-you-go" is an `ANTHROPIC_API_KEY` environment variable taking precedence over an OAuth login; this is a documented, reproducible pattern in Claude Code's auth precedence order (env var > OAuth session), and it's bitten enough people that it has multiple open GitHub issues against `anthropics/claude-code`.

Checked for it directly:

```bash
echo $ANTHROPIC_API_KEY          # empty
grep -rn "ANTHROPIC_API_KEY" ~/.zshrc ~/.bashrc ~/.profile ~/.bash_profile   # nothing
cat ~/.claude/settings.json      # normal config; plugins, theme, voice mode, no injected key
```

No env var, no `apiKeyHelper` override. Ruled out. Whatever was happening, it wasn't the classic stray-key bug.

## Second theory: shared pool, 5-hour burst limit

Claude subscriptions are governed by two separate meters:

- A **weekly percentage** (what shows at `claude.ai/settings/usage`); the long-term budget.
- A **rolling 5-hour window**; a short-term burst throttle sitting underneath the weekly number. Community-measured estimates put Claude Pro at roughly **~44,000 tokens per 5-hour window, or ~10–45 prompts**, depending on model and task weight. This window is independent of the weekly %, meaning it's entirely possible to be at 6% weekly and still hit the short-term ceiling if requests land in a tight burst.

The theory: Hermes's subagents, retries, and background orchestration all count against the same 5-hour bucket, and a burst of that activity tripped the short-term limit, which then fell through to pay-as-you-go extra usage as designed behavior for OAuth accounts.

This explanation was **wrong**, but it took an actual credential-pool inspection to prove it.

## The real diagnosis: pulling the credential record

Rather than keep theorizing, the next step was pulling the actual auth configuration Hermes uses:

```bash
which hermes                          # /Users/irrssue/.local/bin/hermes
find ~ -maxdepth 4 -iname "*hermes*"  # ~/.hermes/hermes-agent

cat ~/.hermes/config.yaml             # model.provider: anthropic
cat ~/.hermes/.env                    # no ANTHROPIC_API_KEY; only terminal/browser/telegram settings
cat ~/.hermes/auth.json               # the actual answer
```

`auth.json` → `credential_pool.anthropic[0]`:

```json
{
  "source": "claude_code",
  "auth_type": "oauth",
  "label": "claude_code",
  "last_status": "exhausted",
  "last_error": "400 invalid_request_error; You're out of extra usage..."
}
```

This confirmed Hermes was sourcing the **same OAuth credentials** as `~/.claude/.credentials.json`; the exact same login as native Claude Code. Also confirmed independently: `claude auth status --text` reported a healthy `Login method: Claude Pro account`.

So the "burst window" theory looked initially plausible; same credentials, same account, so surely the same billing pool. **It wasn't.**

## Why "same OAuth credentials" doesn't mean "same billing pool"

Here's the part that actually broke the earlier reasoning: authenticating with the same OAuth token does not guarantee the same request path. Two different code paths can both present a Pro-account OAuth token and still get billed completely differently, depending on *how* the request is made:

1. **Native `claude` CLI**; the binary itself, run locally, talking to Anthropic's backend the way Claude Code always has. Draws on the Pro subscription's included quota normally.
2. **Hermes's native `anthropic` provider**; a separate code path making its own OAuth-token HTTP calls directly to `https://api.anthropic.com`, bypassing the local CLI binary entirely.

Per Hermes's own documentation and a related open GitHub issue on this exact behavior: **that direct-OAuth-HTTP path only draws from purchased "extra usage" credits, and is explicitly gated to Claude Max; "Claude Pro subscribers cannot use this path."** On a Pro account, that path either fails outright or, per the referenced bug, silently falls through to pay-per-token billing.

That's the actual mechanism. Not a burst limit. Not a leaked key. **A structurally separate request path that was never entitled to bill against a Pro plan in the first place**, dressed up in the same OAuth token so it looked, from the credential pool, like it should have worked.

## The fix: a subprocess provider instead of a direct API path

The fix (implemented via Claude Code, running in parallel with Hermes) was a new provider, `claude-code-cli`, that makes Hermes **spawn the local `claude` binary as a subprocess** instead of calling the API directly:

**New files:**
- `agent/claude_code_cli_client.py`; the transport, an OpenAI-compatible facade over `claude -p --output-format json`
- `plugins/model-providers/claude-code-cli/__init__.py`; provider profile
- `tests/agent/test_claude_code_cli_client.py`; 26 tests

**Design details worth recording:**
- The CLI is driven purely as a model backend, not as an agent: `--tools ""` disables Claude Code's built-in tools (Hermes advertises its own tools in-prompt and parses `<tool_call>` blocks back out; the same pattern used for its Copilot ACP backend). `--setting-sources "" --strict-mcp-config` keep `CLAUDE.md`, hooks, and MCP servers out of the transport, so the subprocess stays a clean model call.
- **`--bare` was deliberately avoided.** Its own help text states OAuth and keychain credentials are never read in that mode; it forces `ANTHROPIC_API_KEY`, which would have recreated the exact billing problem being fixed. On top of that, the client actively **strips `ANTHROPIC_API_KEY`/`ANTHROPIC_AUTH_TOKEN` from the child process's environment**, so a stray key elsewhere in the shell can't silently reroute this onto pay-as-you-go billing.
- Replacing Claude Code's default agentic system prompt with a minimal one cut per-call overhead from **~10,400 tokens to 185 tokens**; a roughly 98% reduction in fixed overhead per call, independent of the billing fix, which stretches the 5-hour window further regardless of which pool it's billed against.
- Three places in the codebase were hardcoded to a different backend (Copilot) at their shared root and got fixed generally rather than patched with a one-off conditional: the two `external_process` auth functions became table-driven, streaming/Responses-API gating now routes through a single `is_local_subprocess_backend()` predicate, and auth-status reporting dispatches on `auth_type` instead of provider name (it had been reporting "logged out" for a working backend).

**Initial verification (in-process, not yet through the live Hermes gateway):**
- `hermes -z "17 times 23"` → `391` (correct)
- A tool-calling round trip: read a file via Hermes's own tools, reported contents correctly
- The real binary invocation was captured by wrapping `claude` in a spy script and inspecting the actual `argv`; confirmed it execs `claude`, not an HTTP call
- 249 tests passing, `ruff` clean

## The catch: a stale process undermined the first "it's fixed" claim

The first report of success didn't hold up under a second, independent check (from Hermes itself, running in parallel). Here's the exact sequence that revealed the gap:

| Event | Timestamp |
|---|---|
| Hermes process (pid 63088) started | 03:26:31 |
| `config.yaml` edited; provider switched to `claude-code-cli` | 03:30:30 |
| Plugin code written | 03:39:14 |
| Code committed on branch `claude-code-cli-transport` | 03:49:32 |

Hermes's provider discovery runs once per process (a module-level `_discovered` flag), and is **not re-scanned mid-session**. Every one of the changes above; the config edit, the new plugin files, the commit; happened *after* the running process had already loaded its provider registry.

The empirical proof came from the actual session log, not from re-reading the config:

```
~/.hermes/logs/agent.log
07:37:37 ... provider=anthropic base_url=https://api.anthropic.com
```

Every request in that live session; including the most recent one; was still hitting `api.anthropic.com` under the old `anthropic` provider. Zero occurrences of the new transport firing. The 249 passing tests and the spy-script confirmation were real, but validated **out-of-process** (standalone test runs), not through the actual running Hermes gateway that was serving real tasks.

Verdict at that point: the fix was correctly built and committed, but not yet live. Classic stale-process problem; a restart was required to pick up both the config change and the new plugin code.

## After restart: confirmed live

Restarting the Hermes gateway picked up both the edited config and the new plugin. The session banner on restart:

```
✨ Session reset! Starting fresh.

◆ Model: claude-sonnet-5
◆ Provider: claude-code-cli
◆ Context: 1.0M tokens (detected)
```

`Provider: claude-code-cli`; no longer `anthropic`. This is the first confirmation, from a fresh process, that the correct provider actually loaded.

## What's still worth verifying (and why)

A provider label in a session banner confirms the *code path selected*, not necessarily the *billing outcome*. Given that the earlier "it's fixed" claim didn't survive a log check, the appropriate level of trust here is: confirmed the mechanism is active, not yet confirmed the billing behaves as expected under real load. The remaining step is running a representative task through the new session and comparing `claude.ai/settings/usage` before and after:

- **Expected if the fix works:** weekly plan % moves, extra-usage balance stays flat.
- **If extra usage still moves:** something in the subprocess path is still falling through to the old billing route, and this write-up would need a correction.

Also flagged for cleanup: a standing decision Hermes had saved to its own memory mid-investigation; to route "substantive work" through manual `claude -p` calls because it believed the `claude-code-cli` path was Max-only and unusable; was recorded after a clarifying question timed out with no real user response. That decision is now built on an outdated premise and needs to be explicitly overwritten rather than left as a persisted preference for future sessions to inherit.

## Known unresolved items from the build

- **23 pre-existing test failures** in the vendored Hermes install were confirmed unrelated to this change (identical failures reproduced on a clean tree via `git stash`). 17 are in `tests/agent/` (mock-shape drift against `test_anthropic_adapter.py` and credential-pool tests), 6 are in `tests/hermes_cli/` (umask/WSL/uv environment assumptions). Left untouched deliberately, since `hermes update` would discard any local fix to a vendored install.
- The new work sits on branch `claude-code-cli-transport`, committed cleanly; but a decision on merging/keeping it persistent against future `hermes update` runs is still open. A config backup exists at `~/.hermes/config.yaml.bak.pre-claude-cli`.

## Prior art: this was already a known, tracked bug

Before writing this up as a discovery, it's worth being upfront: this is not a novel find. It's a real, actively tracked issue on Hermes's own GitHub repo (`NousResearch/hermes-agent`), going back months, and the underlying cause traces to a deliberate Anthropic policy change rather than an accident.

**Where the policy came from.** Effective April 4, 2026, Anthropic stopped letting Claude Pro, Max, and Claude Code subscribers use their monthly subscription limits for third-party harnesses and agents; most notably a tool called OpenClaw. Third-party access was pushed onto the separate "extra usage" pay-as-you-go pool, billed independently of the subscription, with Anthropic citing strain on system capacity and a need to prioritize first-party surfaces like claude.ai and Claude Code.

**The exact bug, reported repeatedly on Hermes's repo:**
- **Issue #6475** (April); the identical error from this write-up, including the detail that it persists even after a restart or re-login, with a request for Hermes to distinguish this from a genuine Hermes bug in its error messaging.
- **Issue #10575** (April); found a second, compounding cause: Hermes's own large system prompt shape could get misclassified server-side as extra-usage-exhausted even when a minimal request on the same auth succeeded fine.
- **Issue #29125** (May); a community member floated routing through `claude -p` as the fix; the thread notes other subscribers gave up entirely and switched to Codex rather than solve it.
- **Issue #40014** (June); a precise report matching this investigation's finding exactly: Claude Code OAuth on a Max plan still hitting the pay-per-token endpoint and draining extra usage instead of subscription quota, with the fix proposed as routing inference through the `claude` CLI subprocess instead of direct SDK calls.
- **Issue #48176** (June); the most technically specific explanation: a June 15, 2026 policy change was meant to restore on-plan billing for genuine Agent SDK/CLI traffic, gated on a specific billing header identifying the request as first-party. Hermes omitted that header, so it kept getting treated as third-party regardless of the OAuth credential behind it.

**The fix, proposed in detail before it was built here:**
- **Issue #32392** (May) sketched almost exactly the architecture used in this fix: a provider that spawns a local `claude -p` process and streams the response back, specifically so Pro/Max/Team users could reuse existing local credentials instead of funding a separate API key.
- **Issue #48320** (June) is the most detailed version; a first-class `claude-code` provider mirroring the pattern Hermes already shipped for its Copilot backend (`copilot_acp_client.py`), down to the same implementation details this build hit: tool calls embedded in text needing regex extraction, session continuity keyed by Hermes's own session ID rather than a content hash, and cost figures that only appear in the final streamed JSONL event. This reads close enough to be the literal spec the fix here was built from.
- **Issue #12122** (April) proposed a related but distinct angle; a `/cc` command to tunnel chat messages directly to `claude -p`, bypassing Hermes's own agent loop entirely, specifically because subscription-billed work through the CLI inherits Anthropic's full tool ecosystem in a way Hermes couldn't replicate internally.

**What's officially shipped vs. what got built here.** Hermes does ship an official `claude-code` skill today; but it operates by delegating one-off coding tasks to `claude -p` through Hermes's `terminal` tool, not by replacing Hermes's own model provider. The full provider-level swap; fixing routine chat and reasoning calls, not just delegated coding tasks; still appears to be an open feature request (#48320) rather than merged upstream. That suggests this fix is ahead of what's currently shipped in the official repo, not a rediscovery of something already released.

**A real risk worth naming plainly.** Issue #48320 states directly that routing subscription OAuth through a third-party HTTP client is the exact pattern that got the OpenClaw creator banned on April 4, 2026, and warns that continuing to recommend the old OAuth-HTTP path exposes users to the same account risk. That's a meaningful reason to prefer the subprocess-spawn design over patching the direct-API path: spawning the real `claude` binary as a child process is a materially different (and safer) integration pattern than replaying OAuth tokens through a separate HTTP client; which is worth being explicit about, given Anthropic is actively enforcing against the latter.

## Takeaways

1. **Same OAuth token ≠ same billing path.** Two code paths can both authenticate as the same account and still hit entirely different billing pools, depending on whether the request goes through the actual local CLI or a separate direct-API code path layered on top of the same credentials.
2. **A provider name in a banner or config file is a claim, not a proof.** The only thing that actually settled this was grepping the live request log for the provider string that fired on real calls; not re-reading `config.yaml`, not trusting a prior session's self-report.
3. **Process staleness is an easy trap in agent runtimes with lazy, once-per-process provider discovery.** A correct fix, correctly committed, can still be inert in a running process until restarted; and "it's fixed" claims from a long-running agent should be treated skeptically until verified against that session's own logs.
4. **Cutting the fixed per-call system-prompt overhead (10,400 → 185 tokens) was a free win** independent of the billing fix, and stretches the 5-hour burst window regardless of which pool ends up paying for it.

---

*Written up as a build log for [irrssue.com](https://irrssue.com); part of the homelab/AI-tooling series.*
