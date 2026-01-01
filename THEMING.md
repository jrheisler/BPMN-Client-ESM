# BPMN Theming Architecture (Light & Dark)

We now ship a minimal, two-theme setup that avoids external theme packs and helper layers.

- **Theme definitions** live in [`public/js/core/theme.js`](public/js/core/theme.js). The exported `THEMES.light` and `THEMES.dark` objects carry `colors`, `fonts`, and a small set of `bpmn` overrides used by the canvas.
- **Active theme** is stored in the `currentTheme` stream. The helper `setTheme(key)` switches between `light` and `dark`, persists the choice to `localStorage`, and immediately reapplies styles.
- **Page styling** is handled by `applyThemeToPage`, which writes CSS variables (e.g., `--bg`, `--panel`, `--text`, `--accent`) straight to `document.body` and the canvas host.
- **BPMN overrides** are injected via `applyBpmnTheme` in [`public/js/app.js`](public/js/app.js). Labels, shapes, connections, the palette, and context pads all derive their fills and strokes from the active theme’s `bpmn` section.
- **Theme selection UI** uses `themedThemeSelector()`, producing a small `<select>` bound to `currentTheme` without diagnostics or remote loading.

Keep future theme tweaks inside `public/js/core/theme.js` (for tokens/fonts) and `applyBpmnTheme` (for diagram visuals) to keep the pipeline straightforward.
