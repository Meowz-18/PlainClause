/**
 * Skip links for keyboard navigation.
 *
 * Three targets matching the workspace layout: findings rail, document pane,
 * and ask panel. Visible only on focus per DESIGN.md §7.1.
 */

export function SkipLinks() {
  return (
    <nav aria-label="Skip links">
      <a href="#findings" className="skip-link">
        Skip to findings
      </a>
      <a href="#document" className="skip-link">
        Skip to document
      </a>
      <a href="#ask" className="skip-link">
        Skip to ask
      </a>
    </nav>
  );
}
