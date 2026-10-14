"use client";

import { useActionState, useEffect } from "react";
import { login } from "@/lib/actions";
import { fieldClass, primaryButtonClass } from "@/components/styles";

export function LoginForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, action, pending] = useActionState(login, null);
  const waiting = pending || state?.ok === true;

  useEffect(() => {
    if (state?.ok) {
      window.location.assign("/");
    }
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-muted">E-mail</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          required
          defaultValue={defaultEmail}
          className={fieldClass}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-muted">Senha</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={fieldClass}
        />
      </label>
      {state?.error ? (
        <p className="rounded-2xl bg-clay/10 px-3 py-2 text-sm text-clay">{state.error}</p>
      ) : null}
      <button type="submit" disabled={waiting} className={primaryButtonClass}>
        {waiting ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
