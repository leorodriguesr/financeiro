import { setMonthClosing } from "@/lib/actions";
import { fieldClass, primaryButtonClass } from "@/components/styles";

export function ClosingForm({
  cardId,
  month,
  day,
  next,
}: {
  cardId: string;
  month: string;
  day: number;
  next: string;
}) {
  return (
    <form key={`${cardId}-${month}-${day}`} action={setMonthClosing} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="card_id" value={cardId} />
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-muted">Dia de fechamento neste mês</span>
        <input
          name="closing_day"
          type="number"
          min={1}
          max={28}
          required
          defaultValue={day}
          className={`${fieldClass} w-28`}
        />
      </label>
      <button type="submit" className={primaryButtonClass}>
        Salvar neste mês
      </button>
    </form>
  );
}
