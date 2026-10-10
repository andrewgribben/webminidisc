# Start an agent task

These are copy-and-paste prompts, not registered commands. Replace bracketed placeholders before sending. Start each window with one bounded assignment and let the repository documents and GitHub issue provide the durable context.

For a new project, start in the workflow repository. For bugs, features or existing-project adoption, open the product repository. Its AGENTS.md, working agreement and approval record govern the task. The implementation prompt below is for a product with reviewed scope; it does not authorise product code in this workflow repository.

## Recover when the skill is missing

Use this from the product workspace, replacing the path with a workflow checkout available on the same host:

> Read `/absolute/path/to/agent-project-workflow/.agents/skills/project-discovery/SKILL.md` directly. Use that repository as the workflow source and this active repository as the target project. Read roles and reusable process files from the source; read target instructions, scope, decisions and backlog from this project. Do not import the source repository's approval or implementation permission. Act as coordinator to explore [feature idea] with relevant specialists. Discuss outcomes and tradeoffs with me before drafting stories, then record agreed planning in this project's GitHub home. Keep this in discovery; do not implement. A missing installed-skill entry is not a reason to skip reading the supplied path. Report any actual inaccessible file. Do not change global configuration or adopt a new workflow revision silently.

The direct-file prompt recovers this assignment; it does not install the workflow for future windows. For durable project-local discovery, complete the authorised [adoption checklist](project-setup.md) and verify the skill in the actual client.

## Define a new project

> Use the project-discovery skill. Act as coordinator and help me define a new project: [idea]. Work with relevant specialist agents to define the users, outcomes, scope, architecture, tools and stories. Ask focused questions and record agreed decisions in GitHub. Agree the repository owner, name and visibility with me, then create the separate project repository and a linked GitHub Project, reusing suitable existing resources. Copy the reusable workflow assets and record the adopted revision. Verify the actual repository, board, fields, views and issue membership through CLI/API readback. Keep this in discovery; do not start product development.

See [client invocation](clients.md) for the local skill. If it is unavailable in the workspace, explicitly provide its source SKILL.md path and the adopted workflow directory; do not assume it is globally installed.

## Adopt the workflow for an existing project

> Follow this project's AGENTS.md and use the project-discovery workflow at [workflow location and revision]. Act as coordinator to adopt it for this existing project. Inspect code, Git history, documentation, issues and available agent history. Reconstruct the current scope and architecture with relevant specialists. Reuse existing issues and create evidence-linked epics, stories and bugs without duplicates. Distinguish historical implementation, verification and owner acceptance; flag uncertain status. Reuse or create a GitHub Project linked to this repository and populate it with the agreed issues. Verify privacy, linkage, counts, fields and views through CLI/API readback and return its URL. Reconcile workflow assets with existing conventions and record explicit adoption. Present remaining defects and future proposals for my review. Do not change product code or deploy.

Historical delivery is not proof of owner acceptance. Missing evidence remains a recorded question rather than an invented requirement or approval.

## Investigate a bug

> Follow this project's AGENTS.md and adopted workflow. Act as coordinator for investigation of [issue number or bug description]. Read the relevant specification, decisions and existing issues first. Reproduce the problem where practical within existing action permissions, identify the cause, and record evidence, scope and proposed acceptance criteria in GitHub. Reuse an existing issue where appropriate. This assignment is investigation only; do not change product code or deploy. Present the proposed fix scope for review rather than silently starting implementation.

Expected result: an evidence-backed bug record and proposed fix scope, including verification gaps. Reproduction does not grant permission for deployments, paid services or physical-device actions.

## Implement an approved issue

Use this only after reviewing the scope and identifying its exact revision. If that record is missing, use investigation or planning first.

> Follow this project's AGENTS.md and adopted workflow. Implement issue #[number] within the scope I approved at [full Git SHA], recorded in [approval issue or document]. This message explicitly authorises implementation of that issue against that revision. Record this authorisation separately from scope approval. Confirm dependencies and story eligibility before starting; if the approval evidence is missing or the issue materially differs from the approved scope, stop implementation and present the gap. Work in an isolated worktree according to the project agreement, preserve unrelated changes, and verify the acceptance criteria. Act as coordinator for this assignment, coordinating GitHub publication with any existing project coordinator. Open a PR with evidence and propose Review; do not accept the work for me, merge or deploy. Record additional discoveries as proposed follow-up work.

Implementation authorisation is bounded to the named issue and revision. It does not reopen all Backlog or Scoped work. Human acceptance, merging, spending, deployment and physical actions retain their own applicable permissions.

## Plan a future feature

> Follow this project's AGENTS.md and adopted project-discovery workflow. Act as coordinator to explore [feature idea], using relevant specialist agents. Read the current scope, architecture decisions and backlog first. Discuss outcomes and tradeoffs with me, then propose a specification and small stories with acceptance criteria, exclusions and dependencies. Reuse existing work where appropriate. Record agreed planning in GitHub and present the affected scope revision for review. Keep this in discovery; do not implement or deploy. Leave implementation work outside Ready until scope approval and separate development authorisation are recorded.

## Continue an existing assignment

> Follow this project's AGENTS.md. Continue issue #[number] from [handoff document or PR]. Read the linked specification, decisions, approval revision and current repository state. Confirm the recorded permission boundary and report any missing context before dependent work. Continue only the existing authorised assignment; this message does not expand scope, grant missing development permission or accept earlier work.

## Concurrent windows

Append this when other agents are working in the same project:

> Other agents may be active. Check the issue's current assignment and existing coordinator before claiming work. Do not duplicate an active assignment. Preserve unrelated changes and use an isolated worktree for implementation. Keep your changes bounded to this issue. Agree who owns shared files and GitHub publication; specialists return recommendations to the coordinator without external mutations. Record the issue ID, scope revision, branch/PR, evidence and blockers in your handoff.

Separate worktrees isolate files; they do not coordinate issue ownership or publishing. Keep one authoritative publisher for coordinated work and follow the project's claim and concurrency rules.

## Expected handoff

Ask for the issue and PR/Project links, changes or recommendations, verification evidence, unresolved questions, and whether development is authorised. Agents propose Review; only the owner accepts. Use CLI/API operations and stored-state verification before browser fallback, following the [working agreement](tooling.md) and [GitHub guidance](github.md).

## This checkout

If the native skill is absent, use:

> Read `/Volumes/External/Development/webminidisc/.agents/skills/project-discovery/SKILL.md` directly. Use this checkout as both the adopted workflow source and target. Follow AGENTS.md and docs/workflow-adoption.md. Act as coordinator for phase-one discovery, discuss users and outcomes with me before drafting stories, and keep product scope and development approval pending. Do not implement or deploy.

On another host, replace the absolute path with that host's actual checkout. This prompt verifies explicit-path access, not native skill catalog recognition.
