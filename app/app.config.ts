export default defineAppConfig({
  ui: {
    // Brand palette derived from the JAPR logo (deep maroon ring, warm amber/gold
    // Africa map + sun, warm-neutral cream). Custom `maroon`/`gold` scales are defined
    // in app/assets/css/main.css @theme; `stone` is Tailwind's warm neutral, chosen over
    // cool `slate` to harmonize with the earthy brand.
    colors: {
      primary: 'maroon',
      secondary: 'gold',
      neutral: 'stone'
    }
  }
})
