# Tooling and ways of working: <project>

Status: Proposed · Human owner: <name> · Planning revision: <commit SHA once reviewed>

## Roles and responsibilities
Name the human owner and facilitator, product/design, architecture, engineering, and quality responsibilities. Record who may recommend, decide, implement, review, and accept. The coordinator may consolidate related advisory work, but independent acceptance review uses a separate agent context; disclose when unavailable.

## Agent services and models
For each selected service/model, record its role, reason, cost assumption or budget, data/access requirements, limitations, and fallback. Record exact model identifiers when available and how substitutions are approved. Do not infer that each role needs a different model.

## Execution environments
Record local and remote environments, required tool versions, setup/test commands, supporting services, and secret names only. Identify what is reproducible now and what must be established in the approved implementation phase.

## CLI/API operations and browser fallback
Prefer suitable CLI, connector and documented API operations. For GitHub use `gh` and `gh api`, checking both REST and GraphQL capability before falling back to a browser. Resolve CLI authentication through supported flows; a signed-in Safari session is not a reason to use it for supported configuration. Read back stored state, counts and pagination through the API. Browser use is reserved for user-completed authentication, a documented capability gap, or necessary rendering/interaction validation. Explain the gap and intended action first and respect the user's browser restrictions and active interaction. Record any UI validation gap separately from configuration evidence.

## Work pickup and collaboration
Define eligibility and ordering, assignment/claim rules, concurrency limit, branch/worktree convention, evidence expectations, blocker handling, and how discoveries become separate issues. No agent may pick implementation work during discovery or self-authorise scope changes.

## Review, acceptance, and release
Record required reviewers/checks, how the owner accepts stories, and who may merge. Deployment, paid provisioning, external messages, and physical actions need their own applicable authorisation; scope approval grants none implicitly.

## Owner decisions
Link decisions approving service access, budget, execution mode, and any project-specific exceptions.
