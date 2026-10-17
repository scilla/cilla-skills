---
name: prompt-master
description: Rewrite a task or prompt into a deeper version of itself, the way a top professional in the field would approach it. Use only when the user asks for it by name.
argument-hint: "[task or prompt; defaults to the last request]"
disable-model-invocation: true
---

# Prompt master

The user wants a **deeper** version of a task, not a bigger one. Depth comes from better sources, sharper methods and an outside check. The deliverable keeps its size, and the rewritten prompt stays as short as the task allows.

## 1. Target

Take the task from the argument. Without one, take the user's last request in this conversation. Restate it in one sentence, with its deliverable.

**Done when** the user would recognise the sentence as their task.

## 2. Four lenses

Answer each for this task, as the best practitioner of its field would. Name concrete things; a lens with nothing to add says so in one line.

1. **Unasked craft**: what that professional would do here that the request leaves out.
2. **Raw material**: the most primary source they would start from, in place of what has already been digested (the transcript rather than the notes, the logs rather than the dashboard, the spec rather than an article about it).
3. **Methods and tools**: the specific methods and tools they would use, by name.
4. **Outside check**: what, other than the agent or the user, would show the result is right. A test, a measurement, a source of record, a real reader.

Check what this session can reach (repo files, connected tools, installed commands) and mark each item as available here or needing the user.

**Done when** every lens names something specific or states that it adds nothing, and every item carries its availability.

## 3. Rewrite

Write the deeper prompt in a code block, ready to run. It asks for the same deliverable as step 1 and adds only what the lenses found: the raw material to start from, the methods to apply, the check that closes the work. Every line traces back to a lens. Drop any line that adds scope instead of depth.

**Done when** the deliverable matches step 1 and every added line comes from a lens.

## 4. Stop

Show the result in the user's language, in this shape, then ask whether to run the prompt now. Running it is the user's call.

````markdown
**Task**: <one sentence, with the deliverable>

1. **Unasked craft**: <what the professional would add>
2. **Raw material**: <the primary source> (available here, or needs you)
3. **Methods and tools**: <named methods and tools> (available here, or needs you)
4. **Outside check**: <what proves the result right> (available here, or needs you)

```text
<the deeper prompt>
```
````
