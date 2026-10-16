---
name: design-lab
description: Design-lab variants of a page, section or component on the app's /design-lab route, for the user to compare, pick and combine. Use when the user asks for variants on the /design-lab route or opens a new lab subject.
disable-model-invocation: true
---

The lab is a route of the app, `/design-lab`, where design questions are answered by looking. Each **subject** (a page, a section, a component) gets its own sub-route holding its variants, built from the app's real components on sample data. The user flips between the variants and picks one, or takes pieces from several. The winner goes into the product, and the subject leaves the lab.

## 0. The lab

Find the existing lab and follow its conventions: how subjects are named (numbered, or by slug), the index page, the sample data, the styles. If there is none, create one:

- a single layout gating all of `/design-lab`: `404` and `noindex` in production, or admin-only there if the user wants reviewers to see it; open locally and on preview or staging;
- an index page with one line per subject: its link and the question it asks;
- a sample-data module with fake data in the app's real shapes. The lab runs on sample data only;
- in a project without app routing (a WordPress theme, a static site), a lab folder with one HTML page per variant, plus an index.

Done when `/design-lab` renders locally and the production gate holds.

## 1. Brief

Create the subject's folder with a short README. It covers:

- what is being designed;
- every field the current view shows (read the view and its data shape);
- what is fixed, such as the brand or copy owned by someone else;
- the variant plan.

The README carries the explanation of the concept, so the pages can carry only the design.

Done when the README lists every field of the current view, and the variant plan.

## 2. Variants

Make three variants by default. When the user asks for six, make half of them inspired by the leading apps of the domain (name each one) and half original. Variants disagree on structure: layout, hierarchy, the primary gesture. A variant that comes out flat gets redone, bolder and more decorated. Design component by component, not the whole app.

Give each variant its own page, `/design-lab/<subject>/<variant>`, with the subject's index in front. Use `?variant=` on a single page when the variants are small. Each variant shows every state the real thing can be in: empty, one item, many items, long text, error, loading, and every edge case the data allows. Show it in two frames, phone 390 × 844 and desktop 1440 × 900, each in light and dark mode where the app has both.

Every line of copy is a piece of data or an action. Copy owned by someone else appears as a labelled placeholder. Explanations of the concept, notes on the idea and slogans in empty states belong in the README.

Hand out the work by kind:

- one subagent per variant;
- the creative work to you, or to the model the user names for it;
- the mechanical work (wiring, sample data, the index, the states) to subagents.

Done when every variant renders every state in both frames.

## 3. Look

Screenshot every variant at 390 and at 1440. If the browser pane is hidden, use Playwright headless. Look at every shot yourself, checking for:

- overflow and clipping;
- text overlapping other text;
- weak contrast;
- missing states.

Fix what you find, then shoot again.

Done when a fresh round of shots shows nothing left to fix.

## 4. Hand over

Give the user the URLs: local, and preview or staging once the work is pushed (pushing is their call). Add one line per variant saying what it bets on. The user's feedback then drives the rounds. A new round on one variant keeps the earlier variants alongside until the user drops them.

## 5. Implement

When the user picks ("implement B", "A with B's header"), build the result into the real page with the product's own components, tests and copy rules. Treat the prototype code as a sketch and rewrite it wherever it falls short. When a piece leaves the lab to live in the product, have the lab page import it from there.

Done when the real page matches the chosen variant in both frames and the repo's checks pass.

## 6. Prune

Once a subject has been answered, it leaves the lab. Remove its folder and its index line in one commit that names the winning variant. Variants the user wants to keep for later go to a branch under `parked/` (`parked/design-lab-<subject>`); parked branches are kept.
