# Tooling and ways of working: Web MiniDisc

Status: Initial adoption configuration; product-specific choices pending
Human owner: andrewgribben

## Roles and responsibilities

The initiating agent is coordinator and the sole authoritative writer. Specialists use the seven canonical [role briefs](../roles/) and return findings without edits or external writes. The human defines priorities, approves scope and accepts delivery. Acceptance review uses an independent agent context.

## Agent services and models

Current client: Codex desktop, local macOS workspace. Exact selected model identifier is unavailable to the coordinator; specialists inherit it without overrides. Existing account access only; no new paid service or budget agreed. At most four active agents total, one delegation level, or a lower host limit. Current explicit-role delegation is available; native named-role adapter loading and fresh-session skill catalog recognition must be reported separately from file checks.

## Execution and permissions

Project-local Codex and Cursor adapters are supplied. No global model, provider, trust or security settings change. Prefer CLI/API and stored-state readback. GitHub CLI authentication works outside the network sandbox; do not export credentials. Browser use requires a documented API gap, user authentication or rendered behaviour verification; do not reuse Safari simply for its login. See [GitHub guidance](github.md).

## Work pickup and collaboration

Human-triggered discovery only; no unattended pickup. Preserve unrelated changes, use `codex/` branches and PRs against `master`. Commit finished work before starting another change. Specialists do not recursively delegate. Implementation work cannot enter Ready without scope approval and separate development authorisation for the exact revision. Discuss outcomes and tradeoffs before proposing stories.

## Review, acceptance and release

For this adoption, verify copy provenance, document links, adapter syntax and phase boundaries; obtain independent review and disclose native-client gaps. Application builds, USB operations and deployments are outside this assignment. Future product verification and owner acceptance/merge policy remain unresolved. PR creation does not mean acceptance; no merge is authorised here. Preserve existing build/release workflows.

## Owner decisions

The owner's 2026-10-10 instruction authorises adopting reusable configuration and presenting a PR only. See [adoption record](workflow-adoption.md). Product scope and development authorisation remain [pending](phase-approval.md).
