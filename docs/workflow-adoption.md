# Workflow adoption: Web MiniDisc

Workflow repository: https://github.com/andrewgribben/agent-project-workflow
Pinned revision: `0513252ffbb3cf4a63025956d1574b2cc67dda01`
Human owner: andrewgribben · Date: 2026-10-10
Status: Owner-requested adoption prepared for PR review; not merged or owner-accepted delivery

## Authority and source

Direct owner instruction in this chat on 2026-10-10:

> Adopt the project-discovery workflow for this existing repository, andrewgribben/webminidisc. Read /Users/grib/Documents/Codex/2026-10-09-i-want-to-better-plan-out/.agents/skills/project-discovery/SKILL.md directly and follow its setup guidance. Copy the reusable skills, roles, templates and process documents, preserving existing project conventions. Do not copy the workflow repo’s project facts or approvals. Record the adopted revision, verify skill availability in this checkout, and present the configuration changes in a PR. Do not change application code or start development.

The resolved source checkout was clean at the pinned revision. Target baseline: `5e3c68950bac0012c441779abda5e6a5ad29954f`. No prior project adoption or AGENTS.md was present.

## Copied assets

Both project-discovery skill entrypoints, seven role briefs, both client agent adapters, Codex concurrency settings, reusable templates, issue forms, PR template, and process/setup/client/task-prompt/GitHub guidance. Shared templates retain intentional fill-in examples. Filled source brief, specifications, backlog, decisions, approvals, validation and retrospective are excluded.

## Project adaptations

- Generate AGENTS.md from the reusable template, preserving `master`, `codex/` PR branches, existing application/release structure and the owner's commit-before-next-change convention.
- Initialise this project's brief, scope snapshot, tooling and pending approval record with only confirmed target facts; specification and decision indexes explicitly remain empty of product decisions.
- Replace source identity and bootstrap status in GitHub guidance with actual target state. The owner enabled Issues; the coordinator verified that state, created the required labels and [adoption issue #1](https://github.com/andrewgribben/webminidisc/issues/1). Board name/visibility and activation are deferred to owner discussion. No Projects, protection or workers are configured.
- Add a concrete local explicit-path recovery prompt, README entry and validation record. Generic reusable prompt/template examples remain intentional.

- Adapt Codex concurrency to the current documented `max_concurrent_threads_per_session = 3` (children excluding primary); omit the undocumented `max_depth` key and preserve no-recursive-delegation instructions. Update client guidance accordingly. See [official subagent configuration](https://learn.chatgpt.com/docs/agent-configuration/subagents).

## Validation and skill availability

See [validation](validation.md). On-disk installation and explicit-path invocation are distinct from native catalog discovery. No global installation or client trust change is authorised by this adoption.

## Upgrade policy and feedback

Future upgrades require a PR stating old/new SHA, changed rules, local adaptations and migration effects. Obtain owner agreement before adoption. Previous approvals stay tied to their exact planning revisions; workflow upgrades never expand product permission. Record process feedback separately, without silently importing source-project work.
