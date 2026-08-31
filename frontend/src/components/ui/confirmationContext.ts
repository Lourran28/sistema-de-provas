import { createContext, useContext } from "react";

export type ConfirmationOptions = {
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  title: string;
  variant?: "danger" | "primary";
};

export type ConfirmationContextValue = {
  confirm: (options: ConfirmationOptions) => Promise<boolean>;
};

export const ConfirmationContext = createContext<ConfirmationContextValue | null>(null);

export function useConfirmation() {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error("useConfirmation deve ser usado dentro de ConfirmationProvider.");
  }
  return context;
}
