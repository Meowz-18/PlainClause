/**
 * Status announcer for phase changes.
 *
 * A role="status" element that announces major phase transitions:
 * parsing → analysing → complete. See DESIGN.md §7.2.
 */

interface StatusAnnouncerProps {
  /** Current status message to announce. */
  message: string;
}

export function StatusAnnouncer({ message }: StatusAnnouncerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {message}
    </div>
  );
}
