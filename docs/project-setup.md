# Set up a new project from this workflow

Use GitHub as the single durable home for project planning and delivery. Start a planning-only repository and board, then run the discovery process. This document describes manual setup; it does not authorise creating paid services, provisioning infrastructure, or starting product development.

## Agree the GitHub destination

Confirm the repository owner, name, visibility, and project name with the human. Prefer existing accounts. Check for an existing suitable repository or board before creating duplicates. Choose a per-project board initially unless an existing portfolio board already meets the need. Follow the user's visibility choice rather than assuming a public repository.

The coordinator performs approved repository and board configuration. Specialists supply recommendations without external writes. A planning repository must not include product scaffolding, generated application code, executable prototypes, helper scripts, or unattended coding workflows.

## Copy shared assets manually

Copy `templates/`, `roles/`, `.codex/agents/`, `.codex/config.toml`, `.cursor/agents/`, `.agents/skills/project-discovery/`, `.cursor/skills/project-discovery/`, `.github/ISSUE_TEMPLATE/` and `.github/pull_request_template.md`. Copy `docs/process.md`, `docs/project-setup.md`, `docs/clients.md`, `docs/task-prompts.md` and `docs/github.md`. Link the task prompt guide from the product README. Create the product AGENTS.md from `templates/project-agents.md`; never copy this workflow repository's bootstrap authorisation. Use the planning-document templates for project-specific content. Copy the process and project-setup guidance or retain a clear link to the exact adopted workflow revision. Do not bulk-copy the workflow project's own filled brief, stories, approvals, or decisions into the product project as if they were its facts.

Create `docs/scope-snapshot.md` from `templates/scope-snapshot.md`. Create `docs/brief.md` from `templates/project-brief.md`, `docs/specifications/` from `templates/feature-specification.md`, `docs/tooling.md` from `templates/tooling-agreement.md`, `docs/decisions/` from `templates/architecture-decision.md`, `docs/phase-approval.md` from `templates/phase-approval.md`, and `docs/workflow-adoption.md` from `templates/workflow-adoption.md`. Replace project-name, repository, board, owner, workflow-revision, and other placeholders with confirmed values. Mark unknown facts as unresolved rather than inventing them. Keep approval and development-authorisation fields explicitly pending. Check all links and search the copied assets for unreplaced placeholder text before presenting them.

Record the source workflow repository URL and exact commit SHA adopted by the project. Keep shared process assets recognisable so future changes can be reviewed and adopted deliberately. Do not automatically overwrite project-specific instructions when the workflow improves.

## Configure issues and the board

Use CLI/connector/API operations for setup and stored-state verification; follow docs/github.md and the working agreement before any browser fallback. Check GitHub REST as well as GraphQL for saved view configuration.

Enable the agreed issue templates and use native parent/sub-issue relationships for epics and stories. Provide story, bug, chore, and research types through the available repository/organisation features or labels. Configure status and views consistently with the shared templates; document any account-specific limits rather than claiming unavailable features are enabled.

Create labels `planning`, `phase:discovery`, `phase:implementation` and `type:epic`, `type:story`, `type:bug`, `type:chore`, `type:research`, `type:decision`, `type:workflow-improvement` before using the forms. Replace the copied docs/github.md repository identity with the new project's actual repository and board URL. Create an ordered backlog view and distinguish drafting, approved readiness, active work, review/delivery, acceptance, and blocked work. Use a dedicated priority field if needed to preserve an unambiguous order. Do not fill Ready with implementation stories before scope approval and separate development authorisation.

Create an initial discovery issue linking the planning documents. Capture unanswered choices as planning work, not premature implementation assignments. Define the project's acceptance and merge policy during discovery. Do not activate an automatic worker or coding workflow as part of setup.

## Validate and begin discovery

Verify both SKILL.md files and their role/process/template dependencies in the target checkout. Open a fresh client session there and confirm project-discovery appears in its available skills; distinguish native catalog recognition from successfully reading an explicit path. A historical adoption document or issue/board setup alone does not complete this check. If native discovery is unavailable, record the exact gap and provide the explicit-path recovery prompt in docs/task-prompts.md.

Read the resulting repository and board to verify visibility, issue templates, fields/views, links, and pending gates. Confirm that copied documents contain the new project's identity and that no product implementation or executable automation has been introduced. Record any unavailable GitHub features and their chosen simple alternative.

Start with the intake questions in `docs/process.md`. Use existing agent accounts and inherited model settings until project-specific tooling choices are agreed. A specialist role does not by itself require another provider or model. New services, paid features, remote infrastructure, and implementation automation remain proposals until separately authorised.
