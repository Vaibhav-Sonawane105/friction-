# Progressive Friction: challenge redesign

Status: owner approved this written specification on 2026-11-02, including the proposed starting defaults. Human calibration remains pending. See the [implementation plan](../plans/2026-11-02-challenge-redesign.md). No release is authorized by this document alone.

## Purpose and evidence

Require meaningful effort before access to a user-restricted website, with repeated successful access permanently increasing that effort up to a moderate ceiling. Friends and the owner reported that maths became predictable and attention/tracking were too easy. Memory was the useful reference point.

Success means the work remains meaningful after practice while still being achievable. Completion duration is a calibration measure, not proof of reduced browsing. Test whether users reconsider casual visits as well as whether puzzles take enough effort.

## Approaches considered

The discussion considered harder thinking alone, more work alone, and a combination; the owner selected the combination. Harder thinking alone creates large differences between users, while workload alone risks repetition.

The owner chose automatic rotation over choosing a challenge or completing a mixture of types in each unlock. One selected type completes one unlock; maths may contain multiple questions within that type.

For games, the owner chose to keep memory and replace attention and tracking, rather than repair both or retain attention. Route planning and logical ordering were selected over tile rearrangement. Maths stays, with varied structures and mixed question sets.

Implementation approach: extend the existing modular foundation, as required by the repository instructions. A foundation rewrite has no identified benefit for these changes; simply increasing existing numbers would preserve the reported repetition problem. Keep progression, registries, pure models, views, state and shared completion separate.

## Approved product decisions

| Level | Successful unlock count before the attempt | Target completion time | Memory pairs |
| --- | --- | --- | --- |
| 1 | 0–20 | 15–30 seconds | 3 |
| 2 | 21–30 | 30–45 seconds | 4 |
| 3 | 31–50 | 45–75 seconds | 6 |
| 4 | 51 and above | 75–120 seconds | 8 |

Counts are per website, never reset daily or decay with time away. Level 1 therefore covers 21 completions. Level 4 remains the cap while successful counts continue increasing. Wrong answers do not increment counts or increase difficulty.

All four types—maths, memory, route planning and logical ordering—are eligible at every level. Avoid immediate type repetition when another suitable type exists. Refresh restores the same challenge and progress. A challenge's level is fixed at creation; another tab's success does not change an active puzzle.

Time ranges are targets for practiced users, not minimum waiting periods, countdowns, deadlines or automatic unlocks. Remove the previously planned waiting-only level. Do not add a timer penalty or a repeated-guess delay in this version.

## Concrete starting profiles (author proposals)

These values make the first version buildable. They require human calibration and are not claimed to meet the time targets already.

| Level | Maths questions | Route grid / checkpoints | Ordering objects / clues |
| --- | --- | --- | --- |
| 1 | 2 short questions | 4 × 4 / 2 | 4 / 3–4 |
| 2 | 2, from different families | 5 × 5 / 3 | 5 / 4–5 |
| 3 | 3, from different families | 6 × 6 / 4 | 6 / 5–6 |
| 4 | 4, one from each family | 6 × 6 / 5, visited in displayed order | 7 / 6–8 |

Use one memory board, one route board or one ordering puzzle per attempt. The complexity/workload mixture applies across the design; every module need not add rounds. Profiles live in configuration, separately from generators and validation.

### Maths

Four families: mixed arithmetic, missing values, number constraints, and operation selection. Level 1 uses basic versions; later profiles add parentheses, additional steps and linked conditions. No calculus, specialist knowledge, ambiguous pattern continuation or unnecessarily large numbers.

Proposed numerical bounds: level 1 uses positive operands 1–20 and at most two operations; level 2 uses operands up to 30 and two operations; level 3 up to 50 and three operations; level 4 up to 60 and four operations. Missing values and constraint solutions remain integers between -30 and 60; level 1 solutions are nonnegative. Limit intermediate and final magnitudes to 1,000; division must be exact and have a nonzero divisor. These are limits, not instructions to always choose maximum values.

Generate from known solutions and independently verify the displayed problem. Missing-value problems have one answer. Constraint questions specify exactly what value is requested and have a unique requested value. Operation selection uses explicit operator controls; enumerate allowed assignments and accept every assignment satisfying the expression, not only the generator's original choice. State multiplication-before-addition rules in accessible instructions; use parentheses to remove ambiguity.

Show one question at a time with set progress. Correct answers stay completed; wrong answers preserve the current problem. Do not reveal the answer after a mistake. Numeric input accepts trimmed signed integer strings, rejects expressions, trailing junk and non-finite values, and does not use floating-point tolerance for integer answers.

Maintain multiple structural templates per family, at least three at each level. Templates vary unknown position, operation arrangement and condition structure, not just operands. Never repeat a structural template within a set. For low levels where only two families are selected, choose different families.

### Memory

Use 6, 8, 12 and 16 cards with exactly two of each identity. Extend the existing six-symbol pool to at least eight visually distinct identities. Colour may supplement identity but cannot be its sole distinguishing feature.

Keep current matching behaviour: flip two cards; matches remain visible; mismatches stay visible until the next face-down card is selected, which hides the mismatched pair. No preview of all cards, moving cards, countdown, move limit or penalty. Preserve matched and currently revealed cards on refresh. Hidden card values must not appear in the public view state or accessible labels.

### Route planning

Use orthogonal movement only. Start and exit are distinct traversable cells. Draw a continuous path from start to exit visiting all checkpoints without revisiting a cell or entering a blocked cell. Levels 1–3 allow checkpoints in any order; level 4 displays numbered checkpoints and requires that order. Any valid route passes; shortest routes are not required.

The entire board and rules remain visible. Support pointer and keyboard input, undo one step, and clear the path on the same board. Invalid extensions do not alter the path. Submission reports unmet rules and preserves the path. Refresh preserves it too.

Generate a valid witness route first, then choose checkpoints and obstacles. Independently solve the resulting board before accepting it. Reject straight, forced corridors that require no route choice. Candidate boards must contain at least two reachable junctions with alternative traversable choices before the exit. Use bounded search and generation budgets; never block the worker indefinitely. This structural filter is not proof of human difficulty; testing must establish that.

### Logical ordering

Arrange distinct labelled objects in a row, with all clues visible. Early clues use before/after, immediately before/after and at an end. Later levels also use not adjacent, between (explicitly non-immediate), and exact positional gaps. Define every relation plainly; avoid colour-only identification and negation-heavy wording.

Generate from a known order, enumerate permutations (at most 7! for the proposed profiles), and retain only satisfiable sets with one solution for predictable calibration. Runtime validation nevertheless accepts any arrangement satisfying all displayed clues. Reject puzzle sets where each object is simply assigned its exact position or all clues describe a fully explicit adjacent chain.

Require a complete arrangement before submission. On incorrect submission, highlight the broken clues without giving the solution or confirming each drag live. Preserve the arrangement; reevaluate all clues on the next submission. Allow both keyboard reorder controls and pointer interaction.

## Rotation and generation defaults (author proposals)

Use a shuffled four-type bag per website. Each type appears once per bag; on refill, prevent its first type matching the previously assigned type. Reserve and persist a selection atomically when a new attempt is created. Refresh never consumes another selection. Separate tabs reserve sequentially through the existing worker queue, but solve independently. Abandoning an attempt does not increment successful-unlock counts; it may consume a bag entry. This is repetition control, not a promise to defeat deliberate tab-opening to seek another task.

Store a bounded history of the last eight maths template IDs and last four puzzle fingerprints per type per website. Prefer unused recent templates, allowing the least-recent eligible template when necessary. Do not save full browsing history. Snapshot the level and rules version in each attempt.

All generation is local. Bound candidate generation and solver work; use a small verified reserve pool per type/level if generation exhausts its budget. Reserve puzzles obey the same rules and avoid recent exact repeats when possible. If no valid puzzle can be loaded, show Retry/Leave, preserve existing state and never grant access or silently substitute an easier type.

## Architecture, state and compatibility

Reuse the existing shared shell, registries, completion coordinator, per-domain generation checks, revision checks and versioned storage. Add a unified maths module plus route and ordering modules; version the expanded memory rules. Worker imports remain static and DOM-free; browser views remain lazy. Models own generation, public state, actions and checking; only the coordinator grants access and increments counts.

Replace the catalog's single-level eligibility with supported-level metadata, shared by worker/browser registries and development selectors. Dispatch model readers by module ID and version so legacy memory can coexist with the new version. Production legacy selection stays behind its existing build boundary.

Retain current tab-scoped attempt lifecycle: refresh and service-worker restart restore active work; navigation away, tab closure, browser restart or extension reload end tab-scoped attempts under existing lifecycle rules. This does not introduce cross-tab shared puzzle progress or browser-restart persistence. Explain this distinction in tests and documentation.

Migration proposal: preserve configured sites, counts and any temporary access still valid under the existing session rules. Retire old active arithmetic/equations/attention/tracking attempts and replace them on next request without counting a success. Retain a reader/validator for valid old memory attempts so their saved matches can finish under their original rules; all new memory attempts use the new profiles. Invalidate late actions for retired attempt IDs and preserve duplicate-completion protection. Do not reset unrelated domain state.

Missing rotation history initializes lazily. Corrupt or unknown future schemas are preserved for recovery and cannot silently unlock or reset counts. No waiting timer has shipped in the inspected code; do not add timer-state migration or timer ownership machinery.

Keep existing per-tab access rules: same-domain navigation/refresh preserves access, leaving/closing ends it, service-worker restart preserves valid sessions, browser restart/reload ends temporary access. Counts and rotation history remain local; website-list sync does not upload puzzle history.

## UX and build scope

Preserve the existing visual language and clear Leave action. Explain the current task, level and progress. Support keyboard operation, visible focus and non-colour identifiers. Shared states cover loading, generation failure, incorrect answers, saving, save failure/retry, restoration and completion. Only saved validated success dismisses the blocker; retries cannot duplicate completion.

First implement and calibrate in the existing development build. Update private preview only after the complete four-level flow passes verification and owner testing. Leave default production behaviour unchanged until separate release approval. Development controls must be able to select every type/level for testing; preview/release must exclude those controls. No new dependency, permission, network service or backend change is expected.

## Verification and calibration

Automated checks cover count boundaries 0/20/21/30/31/50/51 and high counts; no count increase on wrong answers, refresh or abandonment; bag uniqueness and refill boundaries; concurrent reservations; fixed active levels; state round trips; invalid input; and bounded generation failure.

For every type/level, generate at least 1,000 deterministic seeded samples and independently validate solvability, profile constraints and public-state privacy. Enumerate operation assignments and ordering solutions; solve routes independently of the witness. Include deliberately invalid routes, incomplete checkpoints, wrong order, repeated cells and alternative valid answers. Memory checks cover pair cardinality and hidden identities. Test migration and stale callbacks as well as existing duplicate completion, storage-failure, sync and multi-tab invariants.

Run extension tests, lint and relevant build verification including emitted MV3 worker execution and developer-control exclusion. Real Chrome acceptance covers keyboard/pointer use, refresh, offline use, worker restart, browser restart, two tabs, leaving a domain, and save failure recovery. Automated tests do not establish human effort or browser acceptance.

Proposed human pilot: at least five volunteers, each trying each type at every level three times over multiple sessions using test controls. Record first-run versus practiced completion duration, incorrect submissions, abandonment and perceived effort. Use the final two exposures for a first practiced-time comparison. Review medians and spread by type/level; flag targets missed or a type consistently much easier than its peers. Adjust profiles before preview distribution; do not add forced waits to make times fit. Follow with ordinary-use feedback on reconsidered visits and desire to disable the extension. This small pilot guides tuning, not a claim of proven behaviour change. Use voluntary manual feedback, not new automatic cloud telemetry.

## Non-goals and handoff

No daily reset, time-based decay, adaptive personal difficulty, advanced-calculus requirement, timer-only challenge, punitive whole-set restart, leaderboard, camera task or guaranteed automation resistance. Preserve normal browser disable/remove controls.

Builder discretion covers component decomposition, layout details within the existing style, generator budgets, obstacle density and efficient search implementation. Difficulty values above are explicit initial proposals; changes to approved counts, pool, retry rules or time targets return to the owner.

This design supersedes older challenge product rules only for the proposed redesign. The existing brain files, README, earlier spec and testing documents still describe the old behaviour and need synchronization when authorized. Do not edit brain files, stage, commit or push without owner permission. Existing uncommitted preview work is unrelated and must be preserved. Next step after review of this document is a separate implementation plan.

Review evidence: an independent builder check found no consequential unanswered questions for planning. A final author check covered thresholds, retry consistency, lifecycle scope, legacy compatibility and separation of approved decisions from proposed defaults. This is document review, not implementation verification.
