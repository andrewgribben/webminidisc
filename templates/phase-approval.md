# Phase-one approval: <project / release slice>

Human owner: <name>
Scope approval status: Pending / Approved / Rejected / Withdrawn
Development authorisation status: Pending / Authorised / Withdrawn
Automatic pickup: Disabled

## Exact reviewed planning revision
Repository: <URL> · Full commit SHA: <SHA> · Planning PR: <URL or None>
Link the brief, specifications, architecture decisions, working agreement and scope snapshot at this immutable revision. A moving branch or mutable issue body is not an approved snapshot. Copy issue outcomes, acceptance criteria, exclusions, dependencies and verification into the committed scope snapshot before review; issues link back to it.

## Readiness review
- [ ] Audience, outcomes, success measures, constraints and exclusions are defined.
- [ ] First-slice stories have observable acceptance and verification.
- [ ] Blocking decisions/dependencies are resolved or explicitly accepted.
- [ ] Architecture, tooling, access, costs and remote approach are recorded.
- [ ] Independent findings are addressed and review/acceptance/merge rules agreed.

## Scope approval — does not authorise development
Owner-authored evidence: <issue comment / PR review / direct user instruction reference>
Owner's actual words: <verbatim decision>
Date: <date> · Approved full SHA: <SHA> · Conditions: <conditions or None>
An agent prepares this record but cannot approve. Silence, a checklist, a label or a merged PR does not grant consent. Approval covers only the referenced scope; material changes need renewed review.

## Separate development authorisation
Owner-authored evidence: <reference, or Pending>
Owner's actual words: <explicit development instruction, or Pending>
Date: <date or Pending> · Approved scope SHA: <SHA or Pending>
Permitted issue IDs and deliverables: <bounded list, or None>
Exclusions and prerequisites: <list>
The owner may grant both decisions in one explicit message; record both separately. Do not reuse a general instruction made before the reviewed scope existed as authorisation for later invented scope.

## Effect
Scope approval alone leaves development closed and implementation issues outside Ready. Only recorded scope approval AND explicit development authorisation for the same revision permit eligible, listed work to enter Ready. Automatic pickup remains disabled unless separately selected and authorised. Deployment, paid provisioning and physical operations require their own applicable authorisation. Policy records do not by themselves enforce runner permissions.
