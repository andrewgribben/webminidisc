# Phase-one project discovery process

This process turns a project idea into a reviewed scope and prioritised GitHub backlog. The human owns product decisions, priority, acceptance, and permission to begin development. Phase one produces planning material and GitHub configuration; it produces no product code, executable prototypes, executable helper scripts, or automatic coding workers.

## Collaboration and source of truth

The coordinator facilitates conversations and is the only agent that writes to external systems. Specialists inspect and recommend; they return findings and proposed text to the coordinator without editing issues, boards, or published documents. Run independent specialist reviews in parallel when useful and authorised. Roles use separate agent contexts for independent review. Sequential self-review is a disclosed fallback, never evidence of independent review. Model selection is a project decision.

Repository Markdown holds the agreed project brief, specifications, decisions, working agreement, and scope approvals. Issues hold actionable epics, stories, bugs, chores, and bounded research tasks. GitHub Projects holds ordering and delivery status. Pull requests hold proposed document or implementation changes and review evidence. Discussion/chat may contain exploration, but agreed decisions must be recorded in the durable artifacts.

Use existing accounts and configured tools/models initially. The tooling adviser recommends changes per project with evidence and costs. No new paid services, provisioning, or account creation are implied by discovery. Phase-one agents never enable unattended pickup.

## Tool selection and verification

Prefer CLI/connector/API operations over browser automation. Before declaring an operation unsupported, check current official documentation for available APIs as well as high-level commands; GitHub REST and GraphQL have different capabilities. Follow the CLI/API preference in the working agreement. Missing CLI authentication is a setup blocker to resolve, not a reason to control an already signed-in Safari session. Read back stored configuration through the API; use browser checks only for a documented capability gap, user-completed authentication, or actual UI behaviour that needs validation.

## 1. Intake and intent

Inspect existing repositories, documents, and available context before asking for discoverable facts. Ask focused questions in small groups and keep a visible record of unresolved choices. Cover the following where relevant:

- What problem are we solving, for whom, and what happens today?
- What outcomes would make the project worthwhile, and how will we measure them?
- What is essential for the first release, what can wait, and what is explicitly excluded?
- What deadlines, spending limits, available time, platforms, physical constraints, and existing assets apply?
- What data, privacy, accessibility, security, legal, integration, or reliability requirements affect the scope?
- Who uses, operates, reviews, and accepts the result? How will we obtain realistic verification evidence?
- What tools, accounts, skills, and services already exist? Where should agents run locally or remotely?
- How much autonomy is appropriate, what actions need explicit permission, and what review/release rules should apply?

Produce a concise brief. Do not replace an unanswered high-impact choice with an invisible assumption.

## 2. Define scope and behaviour

The product analyst and designer propose user journeys, epics, observable behaviours, first-release inclusions, and exclusions. The human chooses priorities and resolves consequential alternatives. Record assumptions, risks, open questions, and success measures. Small projects can use a single specification; larger projects can separate feature specifications.

Scope exploration is iterative. Discovery of a material constraint returns the relevant choice to review rather than silently expanding the product. Non-executable sketches are permitted; executable prototypes are excluded from phase one. A future proposal to permit them must change the agreed boundary explicitly before any experiment.

## 3. Choose architecture and ways of working

The architect, development adviser, and tooling adviser review the proposed scope. Record architecture and integration decisions, development/review/release conventions, proportional verification, and the agent operating model. Compare tools/models/services against requirements and existing capabilities rather than selecting a stack solely by habit.

The working agreement must identify roles, coordinator, available tools/models, local/remote execution, access boundaries, spending limits, context handoffs, branch/PR conventions, verification expectations, human acceptance, and the development authorisation rule. Record significant alternatives and reasons in decision records. Research tasks remain read-only unless separately authorised.

## 4. Shape the backlog

Create epics as parent issues and small stories describing user-visible outcomes. Use bugs for defects with reproduction evidence, chores for necessary maintenance, and research tasks for unanswered questions with a bounded expected result. Link each item to its relevant specification and record dependencies. Keep one explicit priority order and limit work in progress.

A specification-ready story has a clear outcome, scope boundaries, observable acceptance criteria, verification expectations, and known dependencies. No unanswered question may materially change its implementation. Optional estimates can help slicing and forecasting; they are not substitutes for clear acceptance criteria.

Preserve delivery and acceptance as distinct concepts. A completed implementation must provide a PR and evidence before human acceptance. Define whether merging occurs before or after acceptance in the project's working agreement. Do not enable implementation just because a story has been drafted or reviewed.

## 5. Review and approve scope

The acceptance reviewer independently reviews the specification and backlog. The architect and development adviser confirm feasibility and dependencies. The coordinator consolidates findings, resolves blockers with the human, and presents a concrete scope package:

- Brief, success measures, first-release scope, and exclusions.
- Specifications and ordered initial backlog with acceptance criteria.
- Architecture/tooling decisions and working agreement.
- Verification strategy, accepted risks, and remaining bounded questions.

Before review, commit a scope snapshot containing the authoritative outcomes, acceptance criteria, exclusions, dependencies and verification for the proposed issues. Git commits do not freeze GitHub issue bodies: link issues to this snapshot and treat later behavioural edits as proposed scope changes. Approval must reference the exact reviewed Git commit SHA. For an unmerged planning PR, record its reviewed head SHA and PR URL; if its contents change before merge, obtain renewed approval. Keep approval evidence and the human's actual wording in the approval record. Do not label an agent recommendation or elapsed waiting time as approval.

**Scope approval is distinct from development authorisation.** Record these separately even if the human explicitly grants both in the same message. Only an explicit development authorisation may open the implementation gate; it identifies the approved scope revision and permitted work. This process does not itself grant that permission.

## 6. Handoff and change control

After scope approval, publish the stable planning package and report remaining risks. Until development is explicitly authorised, leave implementation stories outside the Ready queue and do not dispatch coding agents. After authorisation, only eligible stories within that scope can become Ready; initial pickup remains human-triggered.

Material changes to approved outcomes, scope, acceptance criteria, architecture, costs, or access boundaries require a proposed change, impact review, and renewed approval of the affected scope. Editorial corrections do not reopen scope, but must not disguise behavioural changes. Story rejection returns the work for revision; agents do not accept their own delivery on behalf of the human.

## Improve this workflow

Treat the workflow repository as its own project: specifications describe its desired behaviour; issues record workflow stories, bugs, and improvements; PRs review changes. Each product project records the workflow repository and adopted revision. After discovery, capture a short retrospective and turn concrete problems into prioritised improvement issues. Workflow changes do not silently change active projects; record adoption explicitly.

Phase one is complete when the scope package is coherent, consequential choices are resolved or explicitly accepted, the initial backlog is prioritised, independent review findings are addressed, and the human approves the exact scope revision. Development remains a separate decision.
