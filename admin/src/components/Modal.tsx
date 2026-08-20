import { ReactNode, useEffect, useRef } from 'react';
type Props = {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
};
export default function Modal({
  title,
  children,
  onClose,
  className = '',
}: Props) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const overflow = document.body.style.overflow,
      previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    const items = () =>
      Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    items()[0]?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const all = items();
        if (!all.length) return;
        const first = all[0],
          last = all[all.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="overlay"
      role="presentation"
      onMouseDown={event => event.target === event.currentTarget && onClose()}
    >
      <section
        ref={panel}
        className={`modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-head">
          <h2 id="modal-title">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose}>
            &times;
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
