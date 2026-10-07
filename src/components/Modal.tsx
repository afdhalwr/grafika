'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';

/** Pembungkus <dialog> bawaan peramban: fokus, Esc, dan latar sudah ditangani peramban. */
export function Modal({
  open,
  onClose,
  title,
  children,
  small = false,
  closeOnBackdrop = true,
  showClose = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  small?: boolean;
  closeOnBackdrop?: boolean;
  showClose?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`modal${small ? ' modal-sm' : ''}`}
      aria-labelledby={titleId}
      onCancel={e => { e.preventDefault(); onClose(); }}
      onClick={e => { if (closeOnBackdrop && e.target === ref.current) onClose(); }}
    >
      {open && (
        <>
          <div className="modal-head">
            <h2 id={titleId}>{title}</h2>
            {showClose && (
              <button className="icon-btn plain" type="button" onClick={onClose} aria-label="Tutup">
                <Icon name="x" />
              </button>
            )}
          </div>
          {children}
        </>
      )}
    </dialog>
  );
}
