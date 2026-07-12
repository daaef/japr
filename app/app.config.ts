export default defineAppConfig({
  ui: {
    // Brand palette (redesign v2) derived from the JAPR logo (warm brick ring, marigold
    // Africa map + tangerine sun highlight, warm taupe neutrals). Custom `brick`/
    // `marigold`/`taupe`/`status-*` scales are defined in app/assets/css/main.css @theme.
    colors: {
      primary: 'brick',
      secondary: 'marigold',
      success: 'status-green',
      info: 'status-blue',
      warning: 'status-amber',
      error: 'status-red',
      neutral: 'taupe'
    }
    // No card radius override: Nuxt UI's Card already ships `rounded-lg`, which at the
    // bumped --ui-radius (main.css) computes to 12px — already inside the handoff's
    // 12–16px card-radius range.
  }
})
