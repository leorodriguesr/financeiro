"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { parseMonth, withMonth } from "@/lib/dates";

const links = [
  { href: "/", label: "Mês" },
  { href: "/despesas", label: "Despesas" },
  { href: "/cartoes", label: "Cartões" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SideNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const month = parseMonth(params.get("mes"));

  if (mobile) {
    return (
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 px-3 py-2 backdrop-blur lg:hidden">
        <ul className="grid grid-cols-3 gap-2">
          {links.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={withMonth(link.href, month)}
                  className={`block rounded-2xl px-2 py-2 text-center text-sm ${
                    active ? "bg-forest font-medium text-white" : "text-muted"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav className="mt-8">
      <ul className="flex flex-col gap-1">
        {links.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <li key={link.href}>
              <Link
                href={withMonth(link.href, month)}
                className={`block rounded-2xl px-3 py-2.5 text-sm ${
                  active ? "bg-card font-medium text-ink shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
