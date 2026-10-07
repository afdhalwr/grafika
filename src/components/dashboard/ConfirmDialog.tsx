'use client';

import { useCallback, useRef, useState } from 'react';
import { Modal } from '@/components/Modal';

type Ask = { title: string; text: string; ok?: string };

/** `const ok = await confirm({...})` — dialog konfirmasi berbasis Promise. */
export function useConfirm() {
  const [ask, setAsk] = useState<Ask | null>(null);
  const resolver = useRef<(v: boolean) => void>(() => {});

  const confirm = useCallback((a: Ask) => {
    setAsk(a);
    return new Promise<boolean>(resolve => { resolver.current = resolve; });
  }, []);

  const done = (v: boolean) => {
    setAsk(null);
    resolver.current(v);
  };

  const dialog = (
    <Modal open={!!ask} onClose={() => done(false)} title={ask?.title || 'Yakin?'} small closeOnBackdrop={false} showClose={false}>
      <div className="modal-body"><p className="text-fg-2">{ask?.text}</p></div>
      <div className="modal-foot">
        <button className="btn btn-ghost" type="button" onClick={() => done(false)} data-autofocus>Batal</button>
        <button className="btn btn-danger" type="button" onClick={() => done(true)}>{ask?.ok || 'Ya, lanjutkan'}</button>
      </div>
    </Modal>
  );

  return { confirm, dialog };
}
