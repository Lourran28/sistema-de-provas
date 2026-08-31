import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

import { Button } from "./Button";

type ModalDialogProps = {
  children: ReactNode;
  onClose: () => void;
  size?: "lg" | "3xl";
  title: string;
};

export function ModalDialog({ children, onClose, size = "3xl", title }: ModalDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    previousActiveElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";

    const focusableElements = getFocusableElements(dialog);
    (focusableElements[0] ?? dialog)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (!dialog || !isTopmostDialog(dialog)) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const elements = getFocusableElements(dialog);
      if (elements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActiveElementRef.current?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/35 px-4 py-6 sm:px-6" role="presentation">
      <div className="flex min-h-full items-center justify-center">
        <section aria-modal="true" aria-labelledby={titleId} className={`w-full ${size === "lg" ? "max-w-lg" : "max-w-3xl"} rounded-lg bg-white shadow-2xl`} ref={dialogRef} role="dialog" tabIndex={-1}>
          <header className="flex min-h-16 items-center justify-between gap-4 border-b border-stone-200 px-5 sm:px-6">
            <h2 className="text-lg font-semibold text-slate-950" id={titleId}>
              {title}
            </h2>
            <Button aria-label="Fechar" className="h-9 w-9 px-0" icon={X} onClick={onClose} title="Fechar" variant="ghost" />
          </header>
          {children}
        </section>
      </div>
    </div>
  );
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) {
    return [];
  }

  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => element.getAttribute("aria-hidden") !== "true");
}

function isTopmostDialog(dialog: HTMLElement) {
  const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"]');
  return dialogs[dialogs.length - 1] === dialog;
}
