import { useEffect, useId, useRef, type ReactNode } from "react";

/** Native modal: focus containment, Escape and focus restoration work on mobile too. */
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    // Switching from a long explanation to the proof guide starts at its top.
    if (ref.current) ref.current.scrollTop = 0;
  }, [title]);
  useEffect(() => {
    const dialog = ref.current!;
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      opener?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const box = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < box.left ||
            event.clientX > box.right ||
            event.clientY < box.top ||
            event.clientY > box.bottom
          )
            onClose();
        }
      }}
    >
      <header className="sheet-header">
        <h2 id={titleId}>{title}</h2>
        <button autoFocus onClick={onClose} aria-label="閉じる">
          閉じる ×
        </button>
      </header>
      <div className="sheet-body">{children}</div>
    </dialog>
  );
}
