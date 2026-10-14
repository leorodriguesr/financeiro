import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
import { InstallHint } from "@/components/pwa";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-forest-deep text-paper lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "repeating-linear-gradient(transparent, transparent 31px, rgba(243,239,230,0.08) 32px)",
          }}
        />
        <p className="relative font-serif text-3xl">Casa</p>
        <div className="relative max-w-md">
          <p className="text-sm uppercase tracking-[0.18em] text-gold">Gastos da casa</p>
          <p className="mt-4 font-serif text-5xl leading-[1.05] tracking-tight">
            O mês, o cartão e o que ainda cabe.
          </p>
          <ul className="mt-8 space-y-3 text-sm leading-6 text-paper/80">
            <li>Lance o que saiu em dinheiro, débito, Pix ou cartão.</li>
            <li>No cartão, compra até o fechamento entra naquele mês. Depois dele, o gasto vai para o mês seguinte.</li>
            <li>O que você recebe no mês vira o teto. Parcelas do cartão já saem dessa conta.</li>
          </ul>
        </div>
        <p className="relative text-sm text-paper/70">Uso pessoal.</p>
      </section>

      <section className="flex items-center justify-center px-5 py-16">
        <div className="w-full max-w-sm">
          <p className="font-serif text-4xl lg:hidden">Casa</p>
          <h1 className="mt-3 font-serif text-4xl tracking-tight lg:mt-0">Entrar</h1>
          <p className="mt-2 mb-8 text-sm leading-6 text-muted">
            A conta da casa. Depois de entrar, o acesso fica salvo neste aparelho.
          </p>
          <LoginForm defaultEmail={process.env.ADMIN_EMAIL ?? ""} />
          <InstallHint />
        </div>
      </section>
    </div>
  );
}
