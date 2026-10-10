---
name: project-discovery
description: Define a new GitHub project with a human product owner and specialist agents, including scope, architecture, tooling and stories before development. Also use to improve this workflow; does not authorise product implementation.
---

# Project discovery

The initiating agent acts as coordinator. A delegated specialist keeps its assigned role and must not promote itself to coordinator or write authoritative artifacts.

## Resolve the workflow source and target project

Identify the target project from the active workspace or the user's explicit destination. Its AGENTS.md and existing permissions remain authoritative. Resolve this SKILL.md's actual path (following symlinks). For the repository layout `.agents/skills/project-discovery/SKILL.md` or `.cursor/skills/project-discovery/SKILL.md`, the workflow source root is the directory containing `.agents/` or `.cursor/`. Confirm that root contains `docs/process.md`, `roles/` and `templates/`; do not resolve these references against an unrelated working directory.

Read process, role briefs, setup guidance and reusable templates from the selected workflow source. Read the brief, backlog, specifications, decisions, tooling and approvals from the target project at its actual recorded locations; existing projects may use locations such as `docs/project-history/`. Source documents provide process instructions, not the target project's facts or authorisation. Never import the workflow repository's bootstrap permission or approval as product permission. If the target records a different adopted revision, surface the difference; do not silently upgrade it.

An explicit readable SKILL.md path is enough to begin a bounded discovery assignment using its supporting source files; native catalog discovery is not required for direct reading. A missing catalog entry does not establish that a user-supplied file is missing. For durable adoption, follow the source's `docs/project-setup.md`, copying the supporting assets as well as both skills into the target only within the authorised adoption scope. Do not install only this SKILL.md globally: it depends on the selected workflow source. If the source or required files are inaccessible, report the exact missing path and continue independent permitted discovery while requesting the missing location; do not substitute an unnamed equivalent workflow.

Read the source's `docs/process.md`, then `roles/coordinator.md`. For a new project follow the source's `docs/project-setup.md`. For changes to the workflow itself, the source is the target: read docs/brief.md and the relevant workflow issue. All subsequent `roles/`, `templates/` and shared process references are relative to the selected workflow source; project-specific scope and approval references belong to the target.


Inspect available context first. Start by establishing the problem, users, outcomes, constraints and exclusions. Ask focused questions in small groups; do not generate a complete backlog from a vague idea. Confirm repository identity and visibility before creation.

Use separate specialist agents following roles/product-analyst.md, designer.md, architect.md, development-adviser.md, tooling-adviser.md and acceptance-reviewer.md. Delegate bounded assignments in rounds; specialists return findings without modifying GitHub. Keep the coordinator as the authoritative writer. Respect host concurrency limits and do not delegate recursively. If the client cannot run independent agents, disclose that limitation rather than claiming independent review.

Follow intake → scope → technical/operating decisions → ordered stories → independent review → owner scope approval → separate development authorisation. Use templates/ for project documents and .github/ISSUE_TEMPLATE/ for issues. Mark unresolved choices explicitly. Record actual client/model when exposed; otherwise unavailable. Start with existing accounts/inherited model; paid services or provider changes require owner decisions.

Prefer CLI/connector/API operations and stored-state readback. Check high-level commands plus current REST and GraphQL documentation before declaring a browser necessary. Do not choose Safari for its signed-in session; resolve CLI/API authentication or report the blocker. Follow docs/github.md and the working agreement for capability gaps, authentication handoff and necessary UI validation.

Every story needs an outcome, bounded scope, acceptance criteria, dependencies and verification. Link the specification. GitHub is the durable record; chats are working sessions. Read docs/github.md for fields, states and ordering. Implementation stories stop at Scoped during discovery. A label alone is never permission.

Before approval present a concrete scope package and exact full Git SHA. Record the owner's actual words and evidence in the phase approval document. Scope approval does not start development. Do not write product code, executable prototypes, helper scripts, application scaffolding or unattended workers. Do not provision runtime services or deploy.

When handing off, report decisions, remaining risks, validation gaps and whether development is authorised. Capture a retrospective and propose workflow improvements as issues. Adopt workflow upgrades explicitly, preserving local adaptations.
