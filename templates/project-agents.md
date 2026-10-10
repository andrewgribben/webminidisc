# Project agent agreement

Read docs/brief.md, docs/process.md, docs/tooling.md, docs/workflow-adoption.md and docs/phase-approval.md before work. Read the assigned issue, relevant specification and decisions.

Project begins in discovery. Development is NOT authorised. Automatic pickup is disabled. No product code, executable prototypes, helper scripts, application scaffolding, runtime provisioning or deployment during discovery. Scope approval against an exact Git revision and explicit owner development authorisation are separate records; no label or agent recommendation grants either. Deployment, paid services and physical actions require their own authorisation.

One coordinator leads the owner conversation and writes authoritative records. Specialists follow roles/ in independent contexts, return evidence/recommendations/open questions and make no edits or external mutations. Respect client concurrency limits and do not delegate recursively.

Existing accounts and inherited models first. Record actual client/model or unavailable metadata. GitHub Markdown owns specs/decisions; Issues owns work; Projects owns status/order; PRs owns proposed changes and evidence. Preserve unrelated work. Create follow-up issues for extra scope instead of expanding assignments. Never commit secrets.

Implementation issues stop at Scoped until the gate opens; Ready also requires story eligibility. Agents deliver to Review; only the owner accepts. Material changes require impact review and renewed approval. Keep adopted workflow updates explicit.

## CLI and API preference

Use a suitable CLI, connector or documented API for supported operations and configuration verification. A missing high-level CLI command is not proof that an operation requires a browser: inspect the CLI's API bridge and current REST and GraphQL documentation before choosing a fallback. For GitHub, use `gh` and `gh api`; see docs/github.md for Project views.

Do not operate Safari or another browser merely because it already has an authenticated session. Resolve CLI/API authentication or permissions through the supported flow and report a remaining blocker. A browser may be needed for user-completed authentication, a verified operation unavailable through the available CLI/APIs, or an actual rendering/interaction check. Before browser fallback, tell the user the concrete gap and intended action; respect any browser restriction and active user interaction. Prefer a dedicated task tab or in-app browser when suitable.

Verify configuration by reading back stored state through the CLI/API, including pagination and expected counts. Record the method and evidence. UI validation is separate: perform it when needed to establish user-visible behaviour or explicitly requested, and disclose any gap. Do not open a browser just to repeat an adequate API configuration check.
