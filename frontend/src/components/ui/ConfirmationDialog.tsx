import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "./Button";
import { ConfirmationContext, type ConfirmationOptions } from "./confirmationContext";
import { ModalDialog } from "./ModalDialog";

type ConfirmationRequest = Required<ConfirmationOptions>;

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmationRequest | null>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const close = useCallback((confirmed: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setRequest(null);
    resolve?.(confirmed);
  }, []);

  const confirm = useCallback((options: ConfirmationOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setRequest({
        cancelLabel: options.cancelLabel ?? "Cancelar",
        confirmLabel: options.confirmLabel ?? "Confirmar",
        description: options.description,
        title: options.title,
        variant: options.variant ?? "primary"
      });
    });
  }, []);

  useEffect(() => {
    return () => resolverRef.current?.(false);
  }, []);

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      {request ? (
        <ModalDialog onClose={() => close(false)} size="lg" title={request.title}>
          <div className="px-5 py-5 sm:px-6">
            <p className="text-sm leading-6 text-slate-700">{request.description}</p>
          </div>
          <footer className="flex flex-col-reverse gap-2 border-t border-stone-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <Button onClick={() => close(false)} variant="secondary">{request.cancelLabel}</Button>
            <Button onClick={() => close(true)} variant={request.variant}>{request.confirmLabel}</Button>
          </footer>
        </ModalDialog>
      ) : null}
    </ConfirmationContext.Provider>
  );
}
