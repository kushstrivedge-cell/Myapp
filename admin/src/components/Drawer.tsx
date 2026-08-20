import { ReactNode } from 'react';
import Modal from './Modal';

export default function Drawer({
  title,
  children,
  onClose,
  className = '',
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      className={`drawer-panel ${className}`.trim()}
    >
      <div className="drawer-content">{children}</div>
    </Modal>
  );
}
