"""
Gestao de API Tokens por empresa.

Cada empresa pode ter 1+ tokens para autenticar chamadas externas ao
endpoint /v1/chat (n8n, integracoes proprias, etc).

Regras de permissao:
- admin_master: pode listar/criar/revogar tokens de qualquer empresa.
- admin (da propria empresa): pode listar/criar/revogar tokens da PROPRIA empresa.
- demais perfis: 403.
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

import src.core.database as _database
from src.core.config import logger
from src.core.security import (
    get_current_user_token,
    gerar_api_token,
)

router = APIRouter(prefix="/api-tokens", tags=["api-tokens"])


# ---------- schemas ----------

class TokenCreateRequest(BaseModel):
    empresa_id: int
    nome: str = Field(..., min_length=2, max_length=128)


class TokenResponse(BaseModel):
    id: int
    empresa_id: int
    nome: str
    token_prefix: str
    ativo: bool
    last_used_at: Optional[str] = None
    created_at: Optional[str] = None


class TokenCreatedResponse(TokenResponse):
    token: str  # so na criacao


# ---------- helpers ----------

def _checar_acesso(token_payload: dict, empresa_id: int) -> None:
    perfil = token_payload.get("perfil")
    if perfil == "admin_master":
        return
    if perfil == "admin" and int(token_payload.get("empresa_id") or 0) == int(empresa_id):
        return
    raise HTTPException(status_code=403, detail="Sem permissao para essa empresa")


def _serialize(row) -> dict:
    return {
        "id": row["id"],
        "empresa_id": row["empresa_id"],
        "nome": row["nome"],
        "token_prefix": row["token_prefix"],
        "ativo": row["ativo"],
        "last_used_at": row["last_used_at"].isoformat() if row.get("last_used_at") else None,
        "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
    }


# ---------- endpoints ----------

@router.get("", response_model=List[TokenResponse])
async def listar_tokens(
    empresa_id: Optional[int] = None,
    token_payload: dict = Depends(get_current_user_token),
):
    """
    Lista tokens. admin_master vê todos (ou filtra por empresa_id).
    admin vê apenas tokens da própria empresa.
    """
    if not _database.db_pool:
        raise HTTPException(status_code=503, detail="Banco indisponivel")

    perfil = token_payload.get("perfil")
    if perfil == "admin_master":
        if empresa_id:
            rows = await _database.db_pool.fetch(
                """
                SELECT id, empresa_id, nome, token_prefix, ativo, last_used_at, created_at
                FROM empresa_api_tokens WHERE empresa_id = $1 ORDER BY created_at DESC
                """,
                empresa_id,
            )
        else:
            rows = await _database.db_pool.fetch(
                """
                SELECT id, empresa_id, nome, token_prefix, ativo, last_used_at, created_at
                FROM empresa_api_tokens ORDER BY empresa_id, created_at DESC
                """
            )
    elif perfil == "admin":
        user_emp = int(token_payload.get("empresa_id") or 0)
        if empresa_id and int(empresa_id) != user_emp:
            raise HTTPException(status_code=403, detail="Sem permissao para essa empresa")
        rows = await _database.db_pool.fetch(
            """
            SELECT id, empresa_id, nome, token_prefix, ativo, last_used_at, created_at
            FROM empresa_api_tokens WHERE empresa_id = $1 ORDER BY created_at DESC
            """,
            user_emp,
        )
    else:
        raise HTTPException(status_code=403, detail="Sem permissao")

    return [_serialize(r) for r in rows]


@router.post("", response_model=TokenCreatedResponse, status_code=201)
async def criar_token(
    body: TokenCreateRequest,
    token_payload: dict = Depends(get_current_user_token),
):
    """
    Cria um novo API token para a empresa. O valor em CLARO retorna
    apenas nessa resposta — não é possível recuperá-lo depois.
    """
    if not _database.db_pool:
        raise HTTPException(status_code=503, detail="Banco indisponivel")

    _checar_acesso(token_payload, body.empresa_id)

    empresa = await _database.db_pool.fetchrow(
        "SELECT id, nome FROM empresas WHERE id = $1", body.empresa_id
    )
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa nao encontrada")

    # busca user_id do criador
    creator_id = None
    try:
        from src.services.db_queries import buscar_usuario_por_email
        user = await buscar_usuario_por_email(token_payload.get("sub"))
        if user:
            creator_id = user["id"]
    except Exception:
        pass

    raw_token, token_hash, prefix = gerar_api_token()

    row = await _database.db_pool.fetchrow(
        """
        INSERT INTO empresa_api_tokens (empresa_id, nome, token_hash, token_prefix, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, empresa_id, nome, token_prefix, ativo, last_used_at, created_at
        """,
        body.empresa_id, body.nome.strip(), token_hash, prefix, creator_id,
    )

    logger.info(
        f"API token criado empresa={body.empresa_id} nome='{body.nome}' "
        f"prefix={prefix} by={token_payload.get('sub')}"
    )

    data = _serialize(row)
    data["token"] = raw_token
    return data


@router.delete("/{token_id}", status_code=204)
async def revogar_token(
    token_id: int,
    token_payload: dict = Depends(get_current_user_token),
):
    """Revoga (deleta) um token. admin_master ou admin da própria empresa."""
    if not _database.db_pool:
        raise HTTPException(status_code=503, detail="Banco indisponivel")

    row = await _database.db_pool.fetchrow(
        "SELECT id, empresa_id FROM empresa_api_tokens WHERE id = $1", token_id
    )
    if not row:
        raise HTTPException(status_code=404, detail="Token nao encontrado")

    # Para evitar oracle de enumeracao cross-tenant: trata "sem acesso" como 404.
    perfil = token_payload.get("perfil")
    if perfil != "admin_master":
        if perfil != "admin" or int(token_payload.get("empresa_id") or 0) != int(row["empresa_id"]):
            raise HTTPException(status_code=404, detail="Token nao encontrado")

    await _database.db_pool.execute("DELETE FROM empresa_api_tokens WHERE id = $1", token_id)
    logger.info(
        f"API token revogado id={token_id} empresa={row['empresa_id']} by={token_payload.get('sub')}"
    )
    return None
