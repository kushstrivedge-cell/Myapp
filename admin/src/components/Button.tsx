import { ButtonHTMLAttributes, ReactNode } from 'react';
type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger';
  busy?: boolean;
};
export default function Button({
  children,
  variant = 'primary',
  busy = false,
  ...props
}: Props) {
  return (
    <button
      {...props}
      aria-busy={busy}
      disabled={busy || props.disabled}
      className={`button button-${variant} ${props.className ?? ''}`}
    >
      {busy && <span className="button-spinner" aria-hidden="true" />}
      {busy ? 'Working…' : children}
    </button>
  );
}
