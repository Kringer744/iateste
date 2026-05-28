/**
 * Formata um erro vindo do axios/fetch para uma string segura pra exibir
 * em alert/toast. Trata os formatos comuns que o FastAPI retorna:
 *   - 4xx/5xx com `detail` string                 -> usa direto
 *   - 4xx/5xx com `detail` objeto                 -> JSON.stringify resumido
 *   - 422 validation: `detail` lista de erros     -> junta msgs
 *   - erro de rede sem response                   -> usa err.message
 *   - fallback                                    -> mensagem default
 */
export function formatErr(err: any, fallback = "Erro inesperado."): string {
  if (!err) return fallback;
  const data = err?.response?.data;
  const detail = data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    // Pydantic ValidationError: [{loc:[...], msg:"...", type:"..."}, ...]
    return detail
      .map((d: any) => {
        const loc = Array.isArray(d?.loc) ? d.loc.slice(1).join(".") : "";
        return loc ? `${loc}: ${d?.msg || "inválido"}` : (d?.msg || JSON.stringify(d));
      })
      .join("; ");
  }

  if (detail && typeof detail === "object") {
    return detail.msg || detail.message || JSON.stringify(detail);
  }

  // Proxy do Next.js devolve { error: { code, message } }
  if (data?.error?.message) return data.error.message;

  if (typeof err?.message === "string" && err.message) return err.message;

  return fallback;
}
