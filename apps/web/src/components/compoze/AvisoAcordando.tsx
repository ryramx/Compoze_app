import { useEffect, useState } from "react";

/**
 * Explica a espera quando entrar ou criar conta passa de alguns segundos: no
 * Render grátis, é a API acordando (ver `lib/acordar.ts`).
 */
export function AvisoAcordando({ ativo }: { ativo: boolean }) {
  const [demorando, setDemorando] = useState(false);
  useEffect(() => {
    if (!ativo) {
      setDemorando(false);
      return;
    }
    const t = setTimeout(() => setDemorando(true), 4000);
    return () => clearTimeout(t);
  }, [ativo]);

  if (!demorando) return null;
  return (
    <p className="text-[13px] leading-snug text-tinta-3" role="status">
      O servidor estava parado e está acordando. Na primeira entrada depois de um tempo sem uso, isso leva até um minuto.
    </p>
  );
}
