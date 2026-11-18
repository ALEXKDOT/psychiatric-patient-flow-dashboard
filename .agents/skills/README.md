# Project skills

## Included skills

| Skill | Use for |
| --- | --- |
| [Motion](motion/SKILL.md) | Animation, transitions, CSS springs, and Motion performance guidance. |
| [Taste](design-taste-frontend/SKILL.md) | Visual design, typography, layout, and frontend polish. Invoke as `design-taste-frontend`. |
| [Frontend UI Engineering](frontend-ui-engineering/SKILL.md) | Accessible, responsive interfaces and component architecture. |
| [Test-Driven Development](test-driven-development/SKILL.md) | Behavior changes and bug fixes using the red-green-refactor cycle. |

These are complete copies of the workspace-installed skill bundles, including their
references, scripts, and assets. Taste comes from
[Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill); Frontend UI Engineering
and Test-Driven Development come from
[addyosmani/agent-skills](https://github.com/addyosmani/agent-skills). Their installed
revisions are preserved in [skills-lock.json](../../skills-lock.json). The installed
Motion bundle did not include a lockfile entry; its copied contents are versioned
with this repository.

Motion's local best-practice references work without an MCP server. Its connected
tools require the Motion MCP integration, with some features requiring Motion+;
see the skill for details. Taste's browser tools require Node.js 22+ and Chrome,
Edge, or Chromium when used. Adding the skills does not install these integrations
or application dependencies.

Follow the repository's [project instructions](../../AGENTS.md): dashboard
implementation requires an explicit request, and patient examples must be fictional.

## Adding a skill

Add each skill in its own folder under `.agents/skills/`. For example, a skill named `define-flow-metric` would live in `.agents/skills/define-flow-metric/SKILL.md`.

Start its `SKILL.md` with YAML front matter containing `name` and `description`. Describe when Codex should use the skill, then write the steps and expected result below the front matter.

[Official OpenAI guide to building skills](https://learn.chatgpt.com/docs/build-skills)
