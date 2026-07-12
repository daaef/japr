// Shared reactive title for the dark-sidebar shells' topbar (Editor/Reviewer/Admin).
// Pages/components set the current screen's title; the layout supplies the constant
// per-role eyebrow above it.
export function usePageHeading() {
  return useState<string>('page-heading-title', () => '')
}
