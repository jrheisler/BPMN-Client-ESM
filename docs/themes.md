# Themes

A built-in default dark theme ships with the app. External `themes.json` files
are validated before use; malformed entries are discarded and trigger an error
state that surfaces in the theme selector.

## Loading and fallback

1. Built-in themes load first so the UI always has sensible colors.
2. `themes.json` is fetched and validated. If no valid themes are found, the
   loader falls back to the bundled default and marks the status as `error`.
3. If the stored theme key is unknown, it is reset to the default key so the UI
   does not get stuck on a missing theme.

## Error indicator

`themedThemeSelector` renders a status element that becomes visible when
`themeLoadStatus` is `error`, providing a clear signal that the theme pack could
not be loaded. The selector exposes `cleanup` / `dispose` helpers to remove its
subscriptions when detached from the DOM.
