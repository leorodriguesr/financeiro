export const METHODS = [
  { id: "dinheiro", label: "Dinheiro" },
  { id: "debito", label: "Débito" },
  { id: "pix", label: "Pix" },
  { id: "credito", label: "Cartão" },
] as const;

export type PaymentMethod = (typeof METHODS)[number]["id"];

export const CARD_COLORS = [
  { name: "Verde", hex: "#1e6b45" },
  { name: "Marinho", hex: "#243044" },
  { name: "Terracota", hex: "#b5523a" },
  { name: "Vinho", hex: "#7a3048" },
  { name: "Azul", hex: "#1f6f8b" },
  { name: "Dourado", hex: "#8a6a2f" },
] as const;

export const DEFAULT_CATEGORIES = [
  { name: "Moradia", tone: "#1e6b45" },
  { name: "Mercado", tone: "#3d7a4a" },
  { name: "Contas", tone: "#1f6f8b" },
  { name: "Transporte", tone: "#243044" },
  { name: "Saúde", tone: "#b5523a" },
  { name: "Educação", tone: "#7a3048" },
  { name: "Lazer", tone: "#8a6a2f" },
  { name: "Assinaturas", tone: "#3d5a80" },
  { name: "Outros", tone: "#6f675c" },
] as const;

export function methodLabel(id: string) {
  return METHODS.find((method) => method.id === id)?.label ?? id;
}

export function isPaymentMethod(value: string): value is PaymentMethod {
  return METHODS.some((method) => method.id === value);
}
