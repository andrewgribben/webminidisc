# GitHub board and backlog — Web MiniDisc

Repository: [andrewgribben/webminidisc](https://github.com/andrewgribben/webminidisc), public, default branch `master`, owner `andrewgribben`.

## Current setup and adoption boundary

Verified through authenticated GitHub CLI/API on 2026-10-10: Issues were disabled at initial inspection; the owner enabled them during adoption and API readback confirms `has_issues: true`. No Web MiniDisc board appeared in the account Project inventory (two unrelated Projects returned); neither is adopted here. The required discovery/type labels were added without replacing existing labels, and [adoption issue #1](https://github.com/andrewgribben/webminidisc/issues/1) tracks this task. No board, branch protection or automation settings are changed. Project name, visibility and acceptance/merge policy remain unresolved owner decisions for subsequent discovery setup. No issue inventory or approval from the workflow repository is imported.

The fields and views below are the intended process, not a claim that a board exists. Issues are enabled and the following prerequisite labels were created: `planning`, `phase:discovery`, `phase:implementation`, `type:epic`, `type:story`, `type:bug`, `type:chore`, `type:research`, `type:decision`, `type:workflow-improvement`. Preserve existing labels. Issue #1 links this repository's planning package. Do not create product stories before discussing outcomes with the owner.

## Fields

Status: Inbox, Backlog, Scoped, Ready, In progress, Review, Accepted, Blocked.
Priority: P0, P1, P2, P3. Backlog order: number, ascending (10, 20, 30 leaves insertion space). Work phase: Discovery, Implementation. Work type: Epic, Story, Bug, Chore, Research, Decision, Workflow improvement.

Repository labels mirror type and phase for search; Project Status is authoritative when available. Scoped means clear and reviewable, not permission to code. Ready requires the recorded scope revision, explicit development authorisation and story eligibility. During phase one, implementation issues remain Backlog or Scoped. Discovery issues can progress through In progress and Review; only the owner accepts.

## Views

Delivery board groups by Status. Ordered backlog uses a table sorted by Backlog order ascending, showing Priority, Work phase and Work type. Discovery and Implementation views filter Work phase. All work view avoids hidden issues. Configure through `gh`/`gh api` before considering a browser.

## Configure and verify through CLI/API

Use `gh project` for supported Project operations and `gh api` for documented API capabilities absent from the high-level commands. Check both REST and GraphQL; a GraphQL limitation does not establish a GitHub-wide limitation. Do not use Safari just because it has a signed-in session.

The [GitHub REST Project view documentation](https://docs.github.com/en/rest/projects/views) documents creation with `layout`, `filter`, `visible_fields`, `sort_by`, `group_by` and `vertical_group_by`. As checked on 2026-10-09, creation endpoints are `POST /users/{user_id}/projectsV2/{project_number}/views` and `POST /orgs/{org}/projectsV2/{project_number}/views`. Resolve the user ID and actual field IDs from API responses; REST view configuration takes numeric field IDs, not GraphQL node IDs. Use `vertical_group_by` for board columns (Status) and `sort_by` for numeric Backlog order ascending. Send structured JSON with `gh api --input` and the API version required by the current documentation.

Inspect existing views before creating them. For changes to existing views, check the current documented update capabilities; do not assume the creation endpoint updates them or create duplicate views to bypass a limitation. Check owner/token compatibility and permissions: the documented user-owned view creation endpoint does not support fine-grained personal tokens or GitHub App tokens. Use the existing authorised authentication flow; do not export tokens into files or records. Report a permission or capability blocker without broadening access silently.

Read back privacy, repository linkage, fields/options, all issue memberships and values, and saved view filters/grouping/sorting through supported REST or GraphQL reads. Follow pagination and compare the expected issue count. Record any setting that could not be read back. Use a browser only for a verified remaining capability gap, user-completed authentication, or required rendered-UI/interaction validation; explain the reason and follow docs/tooling.md. API checks establish stored configuration, not rendered UI behaviour.

## Lifecycle

Issues belong to epics through native sub-issue relationships when supported, otherwise explicit parent links. Record blocking dependencies with native relationships where supported and in issue text. Return rejected delivery to In progress with reasons. Keep closed issue state separate from owner acceptance: never auto-close a Review issue with a PR closing keyword.

## Governance

This adoption adds no dispatch workflows or automatic coding workers. Existing application release workflows are preserved and are not enabled or invoked by discovery. A label cannot bypass the approval record. Require reviewed planning PRs for subsequent changes where account capabilities permit, but do not create nonexistent required checks. Private repository branch protection may depend on GitHub plan; document actual enforcement. Instructions alone cannot prevent privileged writes.
