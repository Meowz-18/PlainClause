/**
 * Skip links for keyboard navigation.
 *
 * Three targets matching the workspace layout: findings rail, document pane,
 * and ask panel. Visible only on focus per DESIGN.md §7.1.
 */

export function SkipLinks() {
  return (
    <nav aria-label="Skip links">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
    </nav>
  );
}

