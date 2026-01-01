Perfect — this is exactly the moment to **stop nudging font-weight and instead remove the forces that are *making* SVG text look bold**.

I’ve gone through what you shared, and the issue is **not** that `font-weight: 400` isn’t being applied.
It *is* being applied — and then several other things are **visually thickening the glyphs after the fact**.

Below is a **surgical Codex task list**, written so Codex can *rip out the real causes*, not keep papering over them.

I’ll explicitly point to what in **your codebase** is implicated.

---

# 🔧 ROOT CAUSE SUMMARY (before tasks)

From your files:

### 1️⃣ SVG text rendering overrides (global)

You are applying this globally:

```css
#canvas svg {
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```



👉 **This is the #1 reason the text looks thick.**
`optimizeLegibility` + antialiasing **fattens SVG glyphs**, especially on dark backgrounds.

---

### 2️⃣ Filters & shadows being aggressively stripped *after render*

You literally have a function called `debugSvgText()` that:

* removes SVG filters
* removes strokes
* normalizes font weight
* strips blur definitions
* mutates text nodes after every command stack change

That tells us **something earlier is applying filters/strokes**, and this function is fighting it *after the fact*.

This confirms:

> **The boldness is emergent behavior, not a single rule.**

---

### 3️⃣ Theme system is HTML-centric, not SVG-aware

Your `theme.js` is excellent — but it:

* assumes CSS box model
* assumes HTML text
* applies font weight semantically (`bold`, `normal`)
* never differentiates **SVG text vs HTML text**

SVG text needs **separate constraints**.

---

# ✅ CODEX TASK SET: “Kill Heavy BPMN Label Text at the Source”

You can paste this directly into `tasks-codex-bpmn-text.md`.

---

## 🎯 Goal

Make BPMN.js label text render at **true visual weight 400** in light and dark themes **without post-render mutation, filters, or debug hacks**.

---

## Task 1 — Remove SVG text fattening at the root (CRITICAL)

### Action

Modify BPMN canvas SVG styling to **stop glyph thickening**.

### Instructions

1. In `app.css`, locate the rule targeting `#canvas svg`.
2. Replace:

```css
text-rendering: optimizeLegibility;
```

with:

```css
text-rendering: geometricPrecision;
```

3. Remove all `font-smoothing` rules for SVG entirely.

### Why

* `optimizeLegibility` intentionally alters glyph stroke geometry
* Antialiasing hints **do not behave predictably on SVG**
* BPMN.js and Camunda do **not** use these settings

### Deliverable

* Updated `app.css`
* Before/after screenshot at 100% zoom



---

## Task 2 — Eliminate post-render “text repair” logic

### Action

Remove all logic that mutates SVG text nodes after render.

### Instructions

1. Locate `debugSvgText()` in `app.js`
2. Delete:

   * fontWeight normalization
   * stroke removal
   * filter stripping
   * blur filter deletion
3. Remove all calls to `scheduleTextDebug`

### Why

* This function is compensating for upstream mistakes
* BPMN text must be correct **at render time**
* Post-mutation causes jitter, perf issues, and regressions

### Deliverable

* `debugSvgText()` fully removed
* Diagram renders correctly without it



---

## Task 3 — Move label styling into BPMN renderer configuration (MANDATORY)

### Action

Stop styling labels via CSS overrides.
Configure them **where BPMN.js expects it**.

### Instructions

When creating `new BpmnJS(...)`, inject:

```js
const modeler = new BpmnJS({
  container: canvasEl,
  additionalModules,
  moddleExtensions,
  textRenderer: {
    defaultStyle: {
      fontFamily: currentTheme.get().fonts.base,
      fontSize: 12,
      fontWeight: 'normal',   // NOT '400'
      lineHeight: 1.2
    }
  }
});
```

### Why

* SVG fontWeight `"400"` is *not* identical to `"normal"`
* BPMN renderer normalizes text layout internally
* This prevents CSS fights entirely

### Deliverable

* Centralized BPMN text config
* No CSS `!important` on `.djs-label`

---

## Task 4 — Create SVG-specific typography guardrail

### Action

Add a **single**, scoped SVG text rule — nothing more.

### Instructions

In `app.css`, add:

```css
#canvas text.djs-label {
  font-weight: normal !important;
  stroke: none !important;
  filter: none !important;
}
```

### Why

* SVG text can inherit stroke/filter from ancestors
* This is a *defensive boundary*, not primary styling

### Deliverable

* One SVG-only rule
* No global `svg text` selectors

---

## Task 5 — Fix font availability (silent killer)

### Action

Verify the active font actually provides weight 400.

### Instructions

1. Inspect computed `font-family` of a label `<text>`
2. If using:

   * system-ui
   * Segoe UI
   * variable fonts

Ensure:

* weight 400 exists
* browser is not synthesizing weight

If not guaranteed:

* lock BPMN labels to a known-good font (Inter / Roboto)

### Deliverable

* Explicit BPMN font choice OR confirmed 400 support

---

## Task 6 — Separate HTML theming from SVG theming

### Action

Make SVG typography immune to UI theme weight changes.

### Instructions

1. In `theme.js`, **do not** apply font weight to containers that include BPMN
2. BPMN canvas must be opt-out from:

   * `applyTheme()`
   * inherited font weight

### Why

SVG text inherits aggressively.
HTML theming rules **will leak**.



---

## Task 7 — Lock zoom + verify baseline

### Action

Verify appearance at canonical zoom levels.

### Instructions

Test at:

* 1.0
* 1.25
* 1.5

Reject fixes that only “look right” at one zoom.

---

## ✅ Acceptance Criteria (non-negotiable)

* No `optimizeLegibility`
* No SVG filters or strokes on text
* No post-render mutation of text nodes
* No CSS fighting `!important` wars
* Labels visually match Camunda Modeler weight

---

# 🧠 Final diagnosis (plain English)

You weren’t losing a font-weight battle.
You were **losing a rendering pipeline war**:

* SVG hinting
* filter inheritance
* theme bleed
* post-mutation “fixes”

Once those are gone, **`font-weight: normal` just works**.

