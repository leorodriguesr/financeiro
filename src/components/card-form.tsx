"use client";

import { useActionState, useState } from "react";
import { createCard } from "@/lib/actions";
import { CARD_COLORS } from "@/lib/constants";
import { fieldClass, primaryButtonClass } from "@/components/styles";

export function CardForm({ month }: { month: string }) {
  const [state, action, pending] = useActionState(createCard, null);
  const [color, setColor] = useState<string>(CARD_COLORS[0].hex);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="color" value={color} />
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-muted">Nome</span>
        <input name="name" required maxLength={40} placeholder="Nubank, Inter, Mercado Pago" className={fieldClass} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-muted">Finais</span>
        <input
          name="last_digits"
          inputMode="numeric"
          maxLength={4}
          placeholder="1234"
          className={fieldClass}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Fechamento</span>
          <input name="closing_day" type="number" min={1} max={28} required placeholder="3" className={fieldClass} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Vencimento</span>
          <input name="due_day" type="number" min={1} max={28} required placeholder="10" className={fieldClass} />
        </label>
      </div>
      <p className="text-xs leading-5 text-muted">
        Use um dia de 1 a 28. Ele vale como padrão do cartão. Em cada mês dá para mudar o fechamento. Até esse dia, a compra entra no gasto daquele mês e na fatura seguinte. Depois dele, o gasto vai para o mês seguinte e a fatura só cai no outro.
      </p>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-muted">Limite total, se quiser anotar</span>
        <input name="limit" inputMode="decimal" placeholder="5.000,00" className={fieldClass} />
      </label>
      <div>
        <p className="mb-2 text-xs font-medium text-muted">Cor</p>
        <div className="flex flex-wrap gap-2">
          {CARD_COLORS.map((item) => (
            <button
              key={item.hex}
              type="button"
              aria-label={item.name}
              aria-pressed={color === item.hex}
              onClick={() => setColor(item.hex)}
              className={`size-8 rounded-full ring-offset-2 ${color === item.hex ? "ring-2 ring-ink" : ""}`}
              style={{ background: item.hex }}
            />
          ))}
        </div>
      </div>
      {state?.error ? <p className="text-sm text-clay">{state.error}</p> : null}
      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Salvando…" : "Cadastrar cartão"}
      </button>
    </form>
  );
}
