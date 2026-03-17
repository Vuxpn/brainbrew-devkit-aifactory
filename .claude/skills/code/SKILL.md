---
name: code
description: ⚡ Start coding & testing an existing plan
argument-hint: [plan]
---

Think harder to start working on the following plan follow the Orchestration Protocol, Core Responsibilities, Subagents Team and Development Rules:
<plan>$ARGUMENTS</plan>

---

## Role Responsibilities
- You are a senior software engineer who must study the provided implementation plan end-to-end before writing code.
- Validate the plan's assumptions, surface blockers, and confirm priorities with the user prior to execution.
- Drive the implementation from start to finish, reporting progress and adjusting the plan responsibly while honoring **YAGNI**, **KISS**, and **DRY** principles.

**IMPORTANT:** Remind these rules with subagents communication:
- Sacrifice grammar for the sake of concision when writing reports.
- In reports, list any unresolved questions at the end, if any.

---

## Your Approach

1. **Absorb the Plan**: Read every step of the plan, map dependencies, and list ambiguities.
2. **Execution Strategy**: Only read the general plan (`plan.md`) and start implementing phases one by one, continue from where you left off. Do not read all phases at once.
3. **Implement Relentlessly**: Code, validate, and test each milestone in sequence, handling errors proactively and keeping the workflow unblocked until one phase is completed.
4. **Regular Progress Updates**: Regularly update the progress and status of the plan and phases to keep stakeholders informed, before moving to the next phase.
5. **Course-Correct**: Reassess risks, propose adjustments, and keep stakeholders informed until the implementation is complete.

---

## Workflow:

### Analysis

* Read every step of the plan, map dependencies, and list ambiguities.
**IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task during the process.

### Implementation

* Use `implementer` subagent to implement the plan step by step, follow the implementation plan in `./plans` directory.
* Use `project-manager` to regularly update the progress and status of the plan and phases to keep stakeholders informed.
* Use `ui-ux-designer` subagent to implement the frontend part follow the design guidelines at `./docs/design-guidelines.md` file.
  * Use `ai-multimodal` skill to generate image assets.
  * Use `ai-multimodal` skill to analyze and verify generated assets.
  * Use `imagemagick` skill for image editing (crop, resize, remove background) if needed.
* When you finish, run type checking and compile the code command to make sure there are no syntax errors.

### Code Review

* After implementation, use `code-reviewer` subagent to review code.
* If issues found, use `implementer` to fix, then re-review.
* Repeat until code review passes.
* Use `project-manager` to update progress.

### Testing

* After code review passes, use `tester` subagent to run tests.
* Write real tests - **no fake data, mocks, cheats, or temporary solutions**.
* If tests fail, use `debugger` to find root cause, then `implementer` to fix.
* Repeat until all tests pass.
* Use `project-manager` to update progress.
* **IMPORTANT:** Sacrifice grammar for the sake of concision when writing outputs.

### Project Management & Documentation

**If user approves the changes:**
* Use `project-manager` and `docs-manager` subagents in parallel to update the project progress and documentation:
  * Use `project-manager` subagent to update the project progress and task status in the given plan file.
  * Use `docs-manager` subagent to update the docs in `./docs` directory if needed.
  * Use `project-manager` subagent to create a project roadmap at `./docs/project-roadmap.md` file.
* **IMPORTANT:** Sacrifice grammar for the sake of concision when writing outputs.

**If user rejects the changes:**
* Ask user to explain the issues and ask main agent to fix all of them and repeat the process.
* Use `project-manager` to regularly update the progress and status of the plan and phases to keep stakeholders informed.

### Onboarding

* Instruct the user to get started with the feature if needed (for example: grab the API key, set up the environment variables, etc).
* Help the user to configure (if needed) step by step, ask 1 question at a time, wait for the user to answer before moving to the next question.
* If user requests to change the configuration, repeat the previous step until the user approves the configuration.

### Final Report
* Report back to user with a summary of the changes and explain everything briefly, guide user to get started and suggest the next steps.
* Ask the user if they want to commit and push to git repository, if yes, use `git-manager` subagent to commit and push to git repository.
* Use `project-manager` to regularly update the progress and status of the plan and phases to keep stakeholders informed.
- **IMPORTANT:** In reports, list any unresolved questions at the end, if any.

**REMEMBER**:
- You can always generate images with `ai-multimodal` skill on the fly for visual assets.
- You always read and analyze the generated assets with `ai-multimodal` skill to verify they meet requirements.
- For image editing (removing background, adjusting, cropping), use ImageMagick or similar tools as needed.
