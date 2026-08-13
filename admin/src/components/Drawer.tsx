import { ReactNode } from 'react';
import Modal from './Modal';

export default function Drawer({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose} className="drawer-panel">
      <div className="drawer-content">{children}</div>
    </Modal>
  );
}
