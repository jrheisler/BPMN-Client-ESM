Task 1 — Add a “SVG label forensic dump” utility (single function)

Goal: print the computed style and the DOM attributes of a few representative BPMN labels so we stop guessing.

In app.js, add a function debugBpmnLabelStyles() that:

selects 3–10 nodes: document.querySelectorAll('#canvas text.djs-label')

for each, logs:

getComputedStyle(el).fontFamily

fontWeight, fontSize, fill, stroke, strokeWidth, filter

textRendering (computed)

el.getAttribute('font-weight'), el.getAttribute('text-rendering'), el.getAttribute('style')

font synthesis check: log getComputedStyle(el).fontSynthesis (and/or fontSynthesisWeight if supported)

logs document.fonts.check('400 12px Inter') and document.fonts.check('400 12px "Segoe UI"') to confirm whether Inter weight 400 is actually loaded.

Call this function after diagram import/render, and after theme changes (where currentTheme.subscribe runs).

Exit condition: console output clearly shows which property differs when text is “thick”.

Task 2 — Temporarily force a “known-good” label style (binary test)

Goal: determine if thickness is coming from font rendering or font-weight vs stroke/filter vs synthesis.

Add a dev-only toggle (a boolean constant at top of app.js like const DEBUG_FORCE_LABEL_NORMAL = true;)

If enabled, inject a last <style> element (after the existing bpmnThemeStyle) with:

#canvas text.djs-label,
#canvas text.djs-label tspan {
  font-weight: 400 !important;
  font-synthesis: none !important;
  text-rendering: auto !important;
  stroke: none !important;
  stroke-width: 0 !important;
  filter: none !important;
  paint-order: fill !important;
}


Re-test. If thickness changes immediately, you’ve proven it’s not BPMN.js itself; it’s your CSS/rendering knobs.

Exit condition: you can flip one switch and see thickness normalize or not.

Task 3 — Remove competing authorities: choose ONE label styling owner

Right now both app.css and injected CSS are styling labels:

#canvas text.djs-label { … } in app.css 

app

label block in injected CSS in app.js 

app

Do this refactor:

Make app.css contain only structural/layout rules, not BPMN label styling.

Delete (or comment out) the entire #canvas text.djs-label { … } block from app.css.

Decide whether #canvas svg { text-rendering: geometricPrecision; } should exist at all. If you keep it, constrain it to labels only (don’t apply to the whole svg).

Exit condition: label styling comes from one place (preferably the injected theme style).

Task 4 — Stop applying text-rendering to the entire SVG

Even if text-rendering is the culprit, applying it at #canvas svg is a sledgehammer.

In app.css, remove:

#canvas svg { text-rendering: geometricPrecision; }


( वर्तमान file shows this exact rule 

app

 )

If you need text-rendering at all, apply it only to:

#canvas text,
#canvas tspan { text-rendering: auto; }


Exit condition: label thickness doesn’t vary just because other SVG primitives exist.

Task 5 — Fix the “labels disappeared” regression permanently (contrast + fallback fill)

You already have a warnIfLabelInvisible() 

app

. Make it actionable:

In the injected label CSS in app.js, ensure fill always resolves to a non-transparent value:

Prefer theme label fill

Else fallback to colors.foreground

Else fallback to #111 (light) / #eee (dark) based on canvas background luminance.

After applying theme CSS, call warnIfLabelInvisible() automatically.

Exit condition: labels never vanish in dark mode due to fill=background.

Task 6 — Add a one-click “minimal theme” mode to isolate BPMN.css influence

Goal: prove whether the default bpmn-js stylesheet is participating.

Add a “Minimal Theme” checkbox that:

disables all custom BPMN overrides (clears bpmnThemeStyle.textContent)

leaves only a tiny baseline rule set for label fill + font family

Compare thick vs normal.

Exit condition: you know whether the default bpmn-js CSS is part of the problem.

Task 7 — Document the final decision: theming architecture

Write a short THEMING.md describing:

where theme tokens live (theme.js)

where BPMN overrides are generated (the single injected style in app.js)

what is allowed in app.css (layout only, no BPMN label rendering)

Exit condition: no future “mystery CSS fights”.