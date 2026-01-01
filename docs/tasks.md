Yep — that “labels went thick → then disappeared” pattern screams **your label `fill` fallback became `#000` (black)** on a dark canvas, so it *looks* like the text vanished.

### What’s happening (based on your files)

You currently have **two competing label color strategies**:

1. **CSS file approach** (good for light/dark):
   `#canvas text.djs-label { fill: var(--text, #111); font-weight: normal !important; }` 
   This relies on theme variables like `--text`.

2. **Injected “theme style” approach in app.js** (this is where it breaks):
   Your injected CSS sets label fill to:
   `fill: ${label.fill ?? colors.foreground ?? '#000'} !important;` 
   If `colors.foreground` isn’t present (or you moved to semantic tokens), it falls back to **`#000`**.

Meanwhile, your theme system *does* compute and publish a `--text` CSS variable onto the page:
`'--text': adjustedText` 

So the “fix” is: **make BPMN label styling use `var(--text)`**, not `colors.foreground ?? '#000'`.

---

## Codex tasks (strong, drill-to-the-issue)

### Task 1 — Prove the root cause in DevTools

**Goal:** confirm label elements are being colored black (or same as background).

**Steps**

* Inspect a BPMN label `<text class="djs-label">`.
* Check **Computed → fill**.
* Confirm whether the applied rule comes from the injected style tag (app.js) and whether fill is `rgb(0,0,0)` or close.

**Expected finding**

* Injected rule is winning with `fill: #000 !important;` (or similarly dark). 

---

### Task 2 — Stop app.js from hardcoding label color

**Goal:** make label fill always track theme variables.

**Change in app.js**
In the `bpmnThemeStyle.textContent` label block, replace:

* `fill: ${label.fill ?? colors.foreground ?? '#000'} !important;`
  with:
* `fill: ${label.fill ?? 'var(--text)'} !important;`

Also make sure annotations follow the same path.

**Why**

* Your theme system already publishes `--text` based on background contrast. 

---

### Task 3 — Make the injected CSS *not fight* app.css

**Goal:** reduce selector wars and avoid “sometimes this, sometimes that”.

Right now:

* app.css targets `#canvas text.djs-label` 
* app.js injects several label selectors and uses `!important` 

**Codex instructions**

* Pick ONE source of truth for label typography:

  * Either keep it in app.css, OR keep it in injected CSS.
* If you keep injected CSS, delete / neutralize the label styling in app.css (or vice versa).
* Ensure only one place sets `font-weight`.

---

### Task 4 — Fix the original “thick text” without breaking visibility

**Goal:** keep weight stable across browsers and SVG.

**Codex instructions**

* In the label rule (wherever you keep it), set:

  * `font-weight: 400 !important;` (not `normal`)
  * `stroke: none !important; stroke-width: 0 !important; paint-order: fill !important;`
* Avoid SVG tricks that simulate bolding (stroke-on-text, filters).

You already do most of this in injected CSS; keep it consistent. 

---

### Task 5 — Guarantee `colors.foreground` exists (backward compatibility)

**Goal:** prevent future regressions even if someone reintroduces `colors.foreground` in fallbacks.

In `normalizeThemeEntry()` (theme.js), after `colors` is created:

* If `colors.foreground` is missing, set it from:

  * `colors.text`, then `tokens.text`, then default.

This protects older code paths that still use `colors.foreground`.

(Your theming already computes `tokens.text`, but does not necessarily backfill `colors.foreground` for every theme pack.) 

---

### Task 6 — Add a “theme contract” assertion (fast diagnostic)

**Goal:** instantly detect missing keys in a theme pack.

**Codex instructions**

* Add a dev-only console warning when:

  * `theme.colors.foreground` is missing AND
  * you detect any code path referencing `colors.foreground`.
* Log current theme key + the resolved label fill string.

---

### Task 7 — Add a micro “label visibility” self-test

**Goal:** automated guardrail.

**Codex instructions**

* After applying theme + injecting CSS:

  * query a `.djs-label` element
  * read computed `fill`
  * if it equals computed canvas background (or contrast ratio < 2.0), warn loudly.

---

## The short answer to “standard BPMN.js dark/light mode”

There isn’t a single official “BPMN.js dark mode API”. The common pattern is:

* apply a theme class to the page (or set CSS variables), and
* override BPMN-js SVG styles via CSS (or a single injected stylesheet),
* ideally using CSS variables so you don’t hardcode colors.

You’re already *very* close — your `applyThemeToPage()` sets good variables like `--text`. 
The main fix is to make the BPMN SVG label fill **use those variables** instead of falling back to `#000`. 

---

If you want the **cleanest** outcome: I’d make `app.js` label fill be `var(--text)` by default, and only allow `label.fill` to override it. That solves *both* dark/light and the “disappearing” regression in one shot.
