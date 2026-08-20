export type ToastMessage = { kind: 'success' | 'error'; text: string };
export default function Toast({
  message,
  onClose,
}: {
  message: ToastMessage | null;
  onClose: () => void;
}) {
  if (!message) return null;
  return (
    <button
      className={`toast toast-${message.kind}`}
      onClick={onClose}
      role="status"
    >
      {message.text}
      <span>×</span>
    </button>
  );
}
