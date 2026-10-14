"use client";

import { useEffect, useState } from "react";
import { quietButtonClass } from "@/components/styles";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
};

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);
  return null;
}

export function InstallHint() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const nav = navigator as Navigator & { standalone?: boolean };
    const standalone = media.matches || Boolean(nav.standalone);
    setInstalled(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (installed) return null;

  return (
    <div className="mt-8 text-sm leading-6 text-muted">
      {prompt ? (
        <button
          type="button"
          className={quietButtonClass}
          onClick={() => {
            void prompt.prompt();
          }}
        >
          Instalar na tela inicial
        </button>
      ) : ios ? (
        <p>No iPhone, toque em Compartilhar e depois em Adicionar à Tela de Início.</p>
      ) : (
        <p>Dá para instalar a Casa na tela inicial pelo menu do navegador.</p>
      )}
    </div>
  );
}
