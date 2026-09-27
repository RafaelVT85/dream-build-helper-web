// Picture-in-Picture pra build do Shape of Dreams. Porta a ideia do legado
// (documentPictureInPicture.requestWindow + mover o DOM real pra lá) de um jeito
// React-idiomático: em vez de mover nós DOM manualmente, usamos createPortal
// pra renderizar a árvore React de verdade dentro da janela PiP, então estado e
// interatividade (edição inline, marcar "já consegui" etc.) continuam funcionando.
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

// TS ainda não tem o tipo dessa API experimental no lib.dom.
declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
      window: Window | null;
    };
  }
}

function copyStylesInto(pip: Window) {
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const cssRules = Array.from(sheet.cssRules)
        .map((r) => r.cssText)
        .join("\n");
      const style = pip.document.createElement("style");
      style.textContent = cssRules;
      pip.document.head.appendChild(style);
    } catch {
      // stylesheet de outra origem (ex: fonte do Google) — não dá pra ler as
      // regras por CORS, então só linka o arquivo direto.
      if (sheet.href) {
        const link = pip.document.createElement("link");
        link.rel = "stylesheet";
        link.href = sheet.href;
        pip.document.head.appendChild(link);
      }
    }
  }
}

export function usePictureInPicture() {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const isSupported = typeof window !== "undefined" && !!window.documentPictureInPicture;

  const openPiP = useCallback(
    async (title: string, width = 420, height = 620) => {
      if (!window.documentPictureInPicture) return;
      const pip = await window.documentPictureInPicture.requestWindow({ width, height });
      pip.document.title = title;
      pip.document.documentElement.setAttribute(
        "data-shape-theme",
        document.documentElement.getAttribute("data-shape-theme") ?? "roxo"
      );
      pip.document.documentElement.style.setProperty(
        "--bg-alpha",
        document.documentElement.style.getPropertyValue("--bg-alpha") || "1"
      );
      pip.document.documentElement.style.setProperty(
        "--accent",
        document.documentElement.style.getPropertyValue("--accent") || "#7c8cff"
      );
      copyStylesInto(pip);
      pip.document.body.style.margin = "0";
      pip.document.body.style.background = "var(--bg)";
      pip.document.body.style.colorScheme = "dark";

      pip.addEventListener(
        "pagehide",
        () => {
          setPipWindow(null);
        },
        { once: true }
      );

      setPipWindow(pip);
    },
    []
  );

  const closePiP = useCallback(() => {
    pipWindow?.close();
    setPipWindow(null);
  }, [pipWindow]);

  // Se a página principal for desmontada (troca de rota) com o PiP ainda
  // aberto, fecha a janela junto pra não deixar um PiP órfão sem dono do estado.
  useEffect(() => {
    return () => {
      pipWindow?.close();
    };
  }, [pipWindow]);

  return { isSupported, pipWindow, openPiP, closePiP };
}

export function PiPPortal({ pipWindow, children }: { pipWindow: Window; children: React.ReactNode }) {
  return createPortal(<div style={{ padding: 16 }}>{children}</div>, pipWindow.document.body);
}
