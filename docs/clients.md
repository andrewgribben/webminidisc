# Codex and Cursor

## Shared source and adapters

Canonical responsibilities live in roles/. Codex adapters are TOML in .codex/agents/; Cursor adapters are Markdown in .cursor/agents/. Both read the same briefs rather than duplicate them. Specialists are read-only; the coordinator can make authorised planning/configuration edits. No models are pinned: Codex omits model overrides and Cursor uses model: inherit.

The adopted Codex config allows three child agents plus the coordinator (four total) using `max_concurrent_threads_per_session = 3`. Role instructions prohibit recursive delegation; runtime depth enforcement is not claimed. The coordinator respects the actual host limit if lower. Do not modify global model/provider/security settings to adopt the workflow.

The entry skill is .agents/skills/project-discovery/SKILL.md for Codex and .cursor/skills/project-discovery/SKILL.md for Cursor. The two entrypoints must remain identical. A project-scoped skill must be present in the active checkout to be discovered there; a workflow adoption document or GitHub Project alone does not install it. This package does not install a global skill.

## Invocation

For new windows, use the [task prompt guide](task-prompts.md): new projects, existing-project adoption, bug investigation, authorised implementation, feature planning, continuation and concurrent work. These are natural-language assignments rather than additional registered commands.

Codex: open the repository and invoke `$project-discovery` followed by the project idea. Ask for bounded role agents by their configured names (for example architect or acceptance_reviewer). Native role loading depends on installed client support and project trust. Verify actual discovery in the running client.

Cursor: open the same repository and invoke `/project-discovery` followed by the idea. Request the named agents (for example architect or acceptance-reviewer). Verify names and inherited model in task cards. Cloud sessions require their own repository access and connections; local credentials do not transfer.

When native role loading is unavailable, explicitly supply the canonical role brief to a supported independent subagent and record the fallback. Do not replace independent review with the coordinator adopting every persona. Record what actually ran.

## Missing skill or a different repository

Check the active checkout, not just the repository name. In a product checkout, verify `.agents/skills/project-discovery/SKILL.md` (Codex), `.cursor/skills/project-discovery/SKILL.md` (Cursor), the supporting `roles/`, `templates/` and process documents, and the recorded adoption revision. A worktree or branch can lack files that exist elsewhere. Follow the copy checklist in [project setup](project-setup.md) when adoption is authorised; do not overwrite local adaptations or infer acceptance from historical planning records.

For immediate discovery, supply an absolute path to the workflow's SKILL.md and its source directory. The skill now separates that source from the target project. Native `$project-discovery` shorthand works only where the client discovers the skill; direct file reading can bootstrap an assignment without installing it. A remote agent needs a source checkout accessible on its own host; a Mac path does not establish remote access. Ask for the source location if it is absent rather than inventing a replacement process.

Codex repository discovery scans `.agents/skills` from the working directory up to the Git repository root. User-scoped skills are documented at `~/.agents/skills`; changing global discovery is not part of project adoption. Codex normally detects skill changes automatically; if they do not appear, restart the client. See [official skill documentation](https://learn.chatgpt.com/docs/build-skills). Do not install this entry file alone in a user directory: its role/process/template dependencies would be missing. Verify the actual client catalog after adoption and use the explicit-file prompt if native discovery still fails.

## Client checks

Inspect client versions and authentication without exporting credentials. Parse TOML and YAML; ensure all role paths exist and skill copies match. In each available client run a read-only fictional discovery, require role output and gate recognition, and check repository state before/after. Syntax parsing is not proof of native discovery. UI or runtime unavailable is a validation gap.

Official references: https://learn.chatgpt.com/docs/agent-configuration/subagents and https://cursor.com/docs/subagents . Verify current formats on adoption; adapters are not interchangeable across clients.
