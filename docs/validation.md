# Adoption validation

Date: 2026-10-10. Scope: workflow configuration only.

## Evidence

Source checkout clean at `0513252ffbb3cf4a63025956d1574b2cc67dda01`; remote identifies `andrewgribben/agent-project-workflow`. Target remote and API identify public `andrewgribben/webminidisc`, default `master`, baseline `5e3c68950bac0012c441779abda5e6a5ad29954f`. Issues initially disabled, then enabled by the owner and reverified through API. Ten required discovery/type labels and adoption issue #1 created. Account Project inventory returned two unrelated Projects; none reused.

## Checks

- 40 shared files across skills, roles, adapters, templates and issue forms match the source byte-for-byte; both SKILL.md entrypoints are identical.
- Eight TOML files and 17 YAML/front-matter files parse. Local Markdown link targets resolve; `git diff --check` passes.
- Project-specific documents use confirmed values or explicit pending decisions. Remaining fill-in tokens are intentional reusable templates/prompts, not invented project facts.
- Shared process/setup and PR template remain unchanged. Documented local adaptations cover GitHub identity/state, client concurrency, target planning records and recovery prompt.
- Independent tooling adviser checked current [Codex](https://learn.chatgpt.com/docs/agent-configuration/subagents) and [Cursor](https://cursor.com/docs/subagents) adapter documentation. Codex uses three child slots; no recursive-delegation runtime enforcement is claimed.
- Independent acceptance reviewer confirmed target-only facts, preserved attribution, no product code changes and pending gates. Their requested corrections to live Issues state and catalog evidence are incorporated here.
- Fictional gate exercise: merging adoption does not authorise a feature implementation; approved scope SHA, separate owner authorisation and eligible work remain necessary.
- Both specialists used canonical role briefs in independent contexts through explicit-role delegation. Native named-role selection was not exercised.

## Native skill verification and remaining gaps

Installed CLI: `codex-cli 0.162.0-alpha.17.2`. A fresh temporary local app-server was initialised and queried with `skills/list`, `cwds: ["/Volumes/External/Development/webminidisc"]`, `forceReload: true`. Its response listed `project-discovery`, `scope: repo`, `enabled: true`, path `.agents/skills/project-discovery/SKILL.md`, and an empty errors array. The process was stopped after readback; no chat or model turn was created.

The independent acceptance-review child also received this checkout's project-discovery entry in its supplied skills catalog and read it successfully. This verifies native Codex catalog exposure in the checkout, beyond file existence. It does not establish refreshed UI selection in the parent chat, native named-role execution, or Cursor runtime operation. Those remain untested. Both skill copies and adapters are structurally verified. No global installation or trust change was made. Use the concrete [recovery prompt](task-prompts.md#this-checkout) if a future client does not discover the skill.

## Product boundary

No application code, dependencies, build/release workflows, runtime services or device state changed. No product build or hardware verification performed. Scope approval, development authorisation and owner acceptance are pending.
