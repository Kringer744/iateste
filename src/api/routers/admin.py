"""
Endpoints exclusivos do PAINEL ADMIN MASTER.

Tudo aqui exige perfil = 'admin_master'. Cobre:
- Metricas globais agregadas (todas as empresas)
- Lista de empresas enriquecida com metricas por empresa
- Impersonation (entrar como cliente / voltar)
"""
from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import src.core.database as _database
from src.core.config import logger, ACCESS_TOKEN_EXPIRE_MINUTES
from src.core.security import get_current_user_token, create_access_token
from src.services.db_queries import buscar_usuario_por_email

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_master(token_payload: dict) -> None:
    if token_payload.get("perfil") != "admin_master":
        raise HTTPException(status_code=403, detail="Apenas admin_master")


# ─── stats globais ────────────────────────────────────────────────────────────


@router.get("/stats")
async def stats_globais(token_payload: dict = Depends(get_current_user_token)):
    """
    Metricas agregadas de TODAS as empresas. Apenas admin_master.
    Usado no topo do painel /admin.
    """
    _require_master(token_payload)
    if not _database.db_pool:
        raise HTTPException(status_code=503, detail="Banco indisponivel")

    async with _database.db_pool.acquire() as conn:
        # Tudo numa transacao readonly pra ter snapshot consistente
        empresas_ativas = await conn.fetchval(
            "SELECT COUNT(*) FROM empresas WHERE status = 'active'"
        )
        empresas_total = await conn.fetchval("SELECT COUNT(*) FROM empresas")
        usuarios_ativos = await conn.fetchval(
            "SELECT COUNT(*) FROM usuarios WHERE ativo = TRUE"
        )
        conversas_total = await conn.fetchval("SELECT COUNT(*) FROM conversas")
        conversas_30d = await conn.fetchval(
            "SELECT COUNT(*) FROM conversas WHERE created_at >= NOW() - INTERVAL '30 days'"
        )
        conversas_hoje = await conn.fetchval(
            "SELECT COUNT(*) FROM conversas WHERE created_at::date = CURRENT_DATE"
        )
        mensagens_total = await conn.fetchval("SELECT COUNT(*) FROM mensagens")
        leads_qualificados = await conn.fetchval(
            "SELECT COUNT(*) FROM conversas WHERE lead_qualificado = TRUE"
        )
        tokens_api = await conn.fetchval(
            "SELECT COUNT(*) FROM empresa_api_tokens WHERE ativo = TRUE"
        )

    return {
        "empresas": {"ativas": empresas_ativas or 0, "total": empresas_total or 0},
        "usuarios_ativos": usuarios_ativos or 0,
        "conversas": {
            "total": conversas_total or 0,
            "ultimos_30d": conversas_30d or 0,
            "hoje": conversas_hoje or 0,
        },
        "mensagens_total": mensagens_total or 0,
        "leads_qualificados": leads_qualificados or 0,
        "api_tokens_ativos": tokens_api or 0,
    }


# ─── lista empresas com metricas ──────────────────────────────────────────────


@router.get("/empresas-com-stats")
async def empresas_com_stats(token_payload: dict = Depends(get_current_user_token)):
    """
    Lista empresas enriquecidas com contadores. Uma query so com LEFT JOIN
    + aggregates pra evitar N+1.
    """
    _require_master(token_payload)
    if not _database.db_pool:
        raise HTTPException(status_code=503, detail="Banco indisponivel")

    rows = await _database.db_pool.fetch(
        """
        SELECT
            e.id,
            e.nome,
            e.nome_fantasia,
            e.cnpj,
            e.email,
            e.telefone,
            e.plano,
            e.status,
            e.created_at,
            COALESCE(u.qtd_usuarios, 0)   AS qtd_usuarios,
            COALESCE(c.qtd_conversas, 0)  AS qtd_conversas,
            COALESCE(c.qtd_leads, 0)      AS qtd_leads,
            COALESCE(c.conversas_30d, 0)  AS conversas_30d,
            COALESCE(m.qtd_mensagens, 0)  AS qtd_mensagens,
            COALESCE(t.qtd_tokens, 0)     AS qtd_tokens
        FROM empresas e
        LEFT JOIN (
            SELECT empresa_id, COUNT(*) AS qtd_usuarios
            FROM usuarios WHERE ativo = TRUE GROUP BY empresa_id
        ) u ON u.empresa_id = e.id
        LEFT JOIN (
            SELECT empresa_id,
                   COUNT(*) AS qtd_conversas,
                   COUNT(*) FILTER (WHERE lead_qualificado = TRUE) AS qtd_leads,
                   COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS conversas_30d
            FROM conversas GROUP BY empresa_id
        ) c ON c.empresa_id = e.id
        LEFT JOIN (
            SELECT empresa_id, COUNT(*) AS qtd_mensagens
            FROM mensagens GROUP BY empresa_id
        ) m ON m.empresa_id = e.id
        LEFT JOIN (
            SELECT empresa_id, COUNT(*) AS qtd_tokens
            FROM empresa_api_tokens WHERE ativo = TRUE GROUP BY empresa_id
        ) t ON t.empresa_id = e.id
        ORDER BY c.qtd_conversas DESC NULLS LAST, e.nome
        """
    )

    return [
        {
            "id": r["id"],
            "nome": r["nome"],
            "nome_fantasia": r["nome_fantasia"],
            "cnpj": r["cnpj"],
            "email": r["email"],
            "telefone": r["telefone"],
            "plano": r["plano"],
            "status": r["status"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            "qtd_usuarios": int(r["qtd_usuarios"]),
            "qtd_conversas": int(r["qtd_conversas"]),
            "qtd_leads": int(r["qtd_leads"]),
            "conversas_30d": int(r["conversas_30d"]),
            "qtd_mensagens": int(r["qtd_mensagens"]),
            "qtd_tokens": int(r["qtd_tokens"]),
        }
        for r in rows
    ]


# ─── impersonation ────────────────────────────────────────────────────────────


class ImpersonateResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    empresa_id: int
    empresa_nome: str
    impersonating: bool = True


@router.post("/impersonate/{empresa_id}", response_model=ImpersonateResponse)
async def impersonate_empresa(
    empresa_id: int,
    token_payload: dict = Depends(get_current_user_token),
):
    """
    Gera um JWT que faz o admin_master 'entrar como' uma empresa cliente.
    O JWT mantem perfil=admin_master (pra voltar) mas troca empresa_id para
    a alvo. Adiciona flag `impersonating=true` e claim `original_email`
    pra possibilitar /admin/impersonate/stop.
    """
    _require_master(token_payload)

    if not _database.db_pool:
        raise HTTPException(status_code=503, detail="Banco indisponivel")

    empresa = await _database.db_pool.fetchrow(
        "SELECT id, nome FROM empresas WHERE id = $1", empresa_id
    )
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa nao encontrada")

    original_email = token_payload.get("sub")

    new_token = create_access_token(
        data={
            "sub": original_email,
            "perfil": "admin_master",
            "empresa_id": empresa_id,
            "impersonating": True,
            "original_email": original_email,
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    logger.info(
        f"🎭 Impersonate: {original_email} -> empresa_id={empresa_id} ({empresa['nome']})"
    )
    return ImpersonateResponse(
        access_token=new_token,
        empresa_id=empresa_id,
        empresa_nome=empresa["nome"],
        impersonating=True,
    )


@router.post("/impersonate/stop")
async def impersonate_stop(token_payload: dict = Depends(get_current_user_token)):
    """
    Sai do modo impersonation: devolve um JWT 'normal' do usuario original.
    Funciona somente se o token atual tiver flag impersonating=true.
    """
    if not token_payload.get("impersonating"):
        raise HTTPException(status_code=400, detail="Nao esta em modo impersonation")

    original_email = token_payload.get("original_email") or token_payload.get("sub")
    if not original_email:
        raise HTTPException(status_code=400, detail="Token sem original_email")

    user = await buscar_usuario_por_email(original_email)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario original nao encontrado")

    new_token = create_access_token(
        data={
            "sub": user["email"],
            "perfil": user["perfil"],
            "empresa_id": user["empresa_id"],
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    logger.info(f"🎭 Impersonate stop: voltando para {original_email}")
    return {
        "access_token": new_token,
        "token_type": "bearer",
        "perfil": user["perfil"],
        "empresa_id": user["empresa_id"],
    }
