"""
Camada de features para suportar arquitetura multi-nicho.

Uma empresa tem um conjunto de features habilitadas (registradas em
`empresa_features`). Endpoints usam `require_feature("x")` como dependencia
FastAPI para bloquear o acesso quando a feature nao esta ativa.

Backward compatibility: se uma empresa nao tiver NENHUM registro em
`empresa_features` (caso uma migration antiga tenha rodado sem o backfill),
assumimos o preset padrao de barbearia — assim ninguem perde acesso.
"""
from __future__ import annotations

from typing import Set

from fastapi import Depends, HTTPException, status

from src.core.security import get_current_user_token


# Preset default aplicado como fallback quando a empresa nao tem nenhuma
# feature registrada. Cobre o comportamento historico (barbearia).
DEFAULT_FEATURES: Set[str] = {
    "agenda",
    "profissionais",
    "servicos",
    "avaliacoes",
    "clientes",
    "mensagens",
}


# Presets conhecidos. Usados pelo admin para habilitar em lote.
#
# Nota hoteleira: o preset "hotel" NAO inclui "mensagens" porque os
# sistemas de reserva usados na hotelaria (Omnibees e cia) geralmente
# nao expoem API para disparo automatico de mensagens. O fluxo correto
# para hotel e a IA enviar o link de reserva (ex: book.omnibees.com/...)
# durante a conversa, nao disparos pos-reserva.
PRESETS: dict[str, Set[str]] = {
    "barbearia": {"agenda", "profissionais", "servicos", "avaliacoes", "clientes", "mensagens"},
    "hotel":     {"reservas", "quartos", "hospedes", "checkin", "clientes"},
    "clinica":   {"agenda", "profissionais", "avaliacoes", "clientes", "mensagens"},
}


async def get_features_for_empresa(empresa_id: int) -> Set[str]:
    """Retorna o conjunto de feature keys ativas para a empresa.

    Se a tabela nao existir (ambiente antigo, migration nao aplicada) ou a
    empresa nao tiver nenhuma linha, retorna o preset default (barbearia).
    """
    import src.core.database as _database
    if not _database.db_pool:
        return set(DEFAULT_FEATURES)
    try:
        rows = await _database.db_pool.fetch(
            "SELECT feature_key FROM empresa_features WHERE empresa_id = $1 AND ativo = TRUE",
            empresa_id,
        )
    except Exception:
        # Tabela ainda nao existe (migration nao rodou): fallback seguro.
        return set(DEFAULT_FEATURES)
    keys = {r["feature_key"] for r in rows}
    return keys or set(DEFAULT_FEATURES)


async def has_feature(empresa_id: int, feature: str) -> bool:
    """Helper puro: a empresa tem a feature habilitada?"""
    return feature in await get_features_for_empresa(empresa_id)


def require_feature(feature: str):
    """Factory de dependency FastAPI.

    Uso:
        @router.get("/barbeiros")
        async def listar(user = Depends(require_feature("profissionais"))):
            ...
    """

    async def _dep(token_payload: dict = Depends(get_current_user_token)) -> dict:
        # admin_master nao e bloqueado por feature — gerencia qualquer empresa.
        if token_payload.get("perfil") == "admin_master":
            return token_payload
        empresa_id = token_payload.get("empresa_id")
        if not empresa_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Token sem empresa_id",
            )
        if not await has_feature(empresa_id, feature):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Feature '{feature}' nao habilitada para esta empresa",
            )
        return token_payload

    return _dep


async def set_features_for_empresa(empresa_id: int, features: dict[str, bool]) -> None:
    """Atualiza em lote as features de uma empresa.

    `features` e um dict {feature_key: ativo}. Linhas inexistentes sao criadas;
    linhas existentes sao atualizadas.
    """
    import src.core.database as _database
    if not _database.db_pool:
        raise RuntimeError("db_pool nao inicializado")
    async with _database.db_pool.acquire() as conn:
        async with conn.transaction():
            for key, ativo in features.items():
                await conn.execute(
                    """
                    INSERT INTO empresa_features (empresa_id, feature_key, ativo, updated_at)
                    VALUES ($1, $2, $3, NOW())
                    ON CONFLICT (empresa_id, feature_key)
                    DO UPDATE SET ativo = EXCLUDED.ativo, updated_at = NOW()
                    """,
                    empresa_id, key, bool(ativo),
                )


async def get_feature_config(empresa_id: int, feature_key: str) -> dict:
    """Retorna o JSON config da feature para a empresa (ou {} se inexistente)."""
    import src.core.database as _database
    if not _database.db_pool:
        return {}
    try:
        row = await _database.db_pool.fetchrow(
            "SELECT config FROM empresa_features WHERE empresa_id = $1 AND feature_key = $2",
            empresa_id, feature_key,
        )
    except Exception:
        return {}
    if not row:
        return {}
    cfg = row["config"]
    if isinstance(cfg, str):
        import json
        try:
            return json.loads(cfg)
        except Exception:
            return {}
    return cfg or {}


async def set_feature_config(empresa_id: int, feature_key: str, config: dict) -> None:
    """Atualiza o JSON config da feature. Faz upsert; nao altera o flag ativo."""
    import src.core.database as _database
    import json as _json
    if not _database.db_pool:
        raise RuntimeError("db_pool nao inicializado")
    await _database.db_pool.execute(
        """
        INSERT INTO empresa_features (empresa_id, feature_key, ativo, config, updated_at)
        VALUES ($1, $2, TRUE, $3::jsonb, NOW())
        ON CONFLICT (empresa_id, feature_key)
        DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()
        """,
        empresa_id, feature_key, _json.dumps(config or {}),
    )


async def apply_preset(empresa_id: int, preset: str) -> Set[str]:
    """Habilita todas as features do preset, desativa as demais conhecidas E
    aplica os templates de mensagem (msg_*) daquele nicho na personalidade_ia.

    A escrita dos templates SOBRESCREVE qualquer texto custom anterior — isso
    e intencional: clicar num preset reseta para os defaults do nicho. Se o
    operador ja editou e quer preservar, NAO deve reclicar o preset.
    """
    if preset not in PRESETS:
        raise ValueError(f"Preset desconhecido: {preset}")
    desired = PRESETS[preset]
    all_known = set().union(*PRESETS.values())
    payload = {k: (k in desired) for k in all_known}
    await set_features_for_empresa(empresa_id, payload)

    # Escreve templates de mensagem do nicho. Best-effort: se falhar (ex:
    # coluna nao existe em ambiente antigo), o preset ainda foi aplicado.
    try:
        from src.services.message_templates import aplicar_templates_no_personalidade
        await aplicar_templates_no_personalidade(empresa_id, preset)
    except Exception as e:
        import logging
        logging.getLogger("motor-saas-ia").warning(
            f"Preset aplicado mas falhou ao escrever templates msg_* "
            f"empresa_id={empresa_id} preset={preset}: {e}"
        )

    return desired
