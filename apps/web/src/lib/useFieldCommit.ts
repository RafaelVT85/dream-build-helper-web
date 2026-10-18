import { useEffect, useRef } from "react";

// Salva um campo de texto sozinho: ~0,8s depois de parar de digitar, ao sair do
// campo (flush) e se o componente sumir com texto ainda pendente. Antes só
// salvava ao sair do campo — fechar a aba, trocar de tela ou recarregar a lista
// no meio da digitação perdia o texto.
export function useFieldCommit(commit: (value: string) => void, delay = 800) {
  const timer = useRef<number | undefined>(undefined);
  const pending = useRef<string | null>(null);
  const latest = useRef(commit);
  latest.current = commit;

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      if (pending.current !== null) {
        const v = pending.current;
        pending.current = null;
        latest.current(v);
      }
    },
    [],
  );

  return {
    schedule(value: string) {
      pending.current = value;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        const v = pending.current;
        pending.current = null;
        timer.current = undefined;
        if (v !== null) latest.current(v);
      }, delay);
    },
    flush(value: string) {
      window.clearTimeout(timer.current);
      timer.current = undefined;
      pending.current = null;
      latest.current(value);
    },
  };
}
