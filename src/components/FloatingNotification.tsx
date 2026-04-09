import { useEffect, useRef, type ReactNode } from 'react';

export type FloatingNotificationProps = {
  open: boolean;
  /** `0` = stay until dismissed; positive = auto-hide after N seconds. When `0`, dismissible is forced true. */
  durationSeconds: number;
  dismissible?: boolean;
  leading?: ReactNode;
  onDismiss?: () => void;
  className?: string;
  children: ReactNode;
};

export function FloatingNotification({
  open,
  durationSeconds,
  dismissible = true,
  leading,
  onDismiss,
  className = '',
  children,
}: FloatingNotificationProps) {
  const effectiveDismissible = durationSeconds === 0 ? true : dismissible;
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!open || durationSeconds <= 0) return;
    const id = window.setTimeout(() => {
      onDismissRef.current?.();
    }, durationSeconds * 1000);
    return () => window.clearTimeout(id);
  }, [open, durationSeconds]);

  if (!open) return null;

  return (
    <div
      className={`floating-notification ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      {leading != null ? <span className="floating-notification-leading">{leading}</span> : null}
      <span className="floating-notification-message">{children}</span>
      {effectiveDismissible ? (
        <button
          type="button"
          className="floating-notification-close"
          onClick={() => onDismiss?.()}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
