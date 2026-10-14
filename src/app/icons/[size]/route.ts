import { appIcon } from "@/lib/app-icon";

const ALLOWED = new Set([192, 512]);

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const pixels = Number((await params).size);
  if (!ALLOWED.has(pixels)) {
    return new Response("Ícone não encontrado.", { status: 404 });
  }
  return appIcon(pixels);
}
