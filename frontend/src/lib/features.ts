/**
 * Camada de features no frontend.
 *
 * As features vem do endpoint /auth/me. Um provider (FeaturesProvider) faz o
 * fetch uma vez por sessao e disponibiliza via hook (useFeatures / useHasFeature).
 *
 * Backward compatibility: se o /me nao retornar o campo `features` (backend
 * antigo), consideramos o preset default de barbearia para nao quebrar a UI.
 */

export const DEFAULT_FEATURES = [
  "agenda",
  "profissionais",
  "servicos",
  "avaliacoes",
  "clientes",
] as const;

export type FeatureKey =
  | "agenda"
  | "profissionais"
  | "servicos"
  | "avaliacoes"
  | "clientes"
  | "reservas"
  | "quartos"
  | "hospedes"
  | "checkin";

export function hasFeature(
  features: readonly string[] | null | undefined,
  key: FeatureKey | string
): boolean {
  // fallback: sem lista => assume defaults (empresas antigas pre-migration)
  if (!features || features.length === 0) {
    return (DEFAULT_FEATURES as readonly string[]).includes(key);
  }
  return features.includes(key);
}

/**
 * Heuristica simples pra inferir um preset a partir das features ativas.
 * Usado so pra customizar labels da UI (ex: "Profissionais" -> "Barbeiros").
 */
export function inferPreset(features: readonly string[] | null | undefined): string {
  const f = new Set(features ?? DEFAULT_FEATURES);
  if (f.has("quartos") || f.has("reservas")) return "hotel";
  if (f.has("profissionais") && f.has("servicos") && f.has("avaliacoes")) return "barbearia";
  if (f.has("profissionais") && f.has("agenda")) return "clinica";
  return "barbearia";
}
