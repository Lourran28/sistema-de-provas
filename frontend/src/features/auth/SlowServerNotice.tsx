import { useEffect, useState } from "react";

type SlowServerNoticeProps = {
  className?: string;
};

export function SlowServerNotice({ className = "" }: SlowServerNoticeProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setIsVisible(true), 3_000);
    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <p className={className} role="status">
      Iniciando o servidor. No plano atual, isso pode levar cerca de 1 minuto.
    </p>
  );
}
