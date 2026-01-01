# BPMN Theming Architecture

- **Theme tokens** live in [`public/js/core/theme.js`](public/js/core/theme.js). The `currentTheme` stream carries the active theme, with normalized `colors`, `fonts`, and BPMN-specific overrides under `theme.bpmn`.
- **BPMN overrides** are generated in a single injected `<style>` block inside [`public/js/app.js`](public/js/app.js). The `applyBpmnTheme` function rebuilds the CSS whenever the theme or the "Minimal Theme" toggle changes.
- **Label styling ownership** stays in that injected style. `app.css` is reserved for structural/layout rules (no BPMN label rendering).
- **Minimal theme mode** (checkbox in the control bar) clears extra overrides, leaving only a background fill and baseline label font/fill so you can isolate the default `bpmn-js` stylesheet.
- **Debug helpers** (`debugBpmnLabelStyles`, `warnIfLabelInvisible`) run after imports or theme changes to surface contrast or rendering issues.

Keep future BPMN styling changes in `applyBpmnTheme` to avoid CSS conflicts across files.
