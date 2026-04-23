"""
CRUD de quartos (hotelaria).

Gated por `require_feature("quartos")` — empresas sem a feature ativa
nao acessam. admin_master ignora o gate e pode mexer em qualquer
empresa via `empresa_id` query param.

A IA consome esses dados em runtime via `listar_quartos_ativos()`
usado pelo prompt_builder.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from src.core.config import logger
from src.core.security import get_current_user_token
from src.api.deps.features import require_feature


router = APIRouter(prefix="/quartos", tags=["quartos"])


class QuartoRequest(BaseModel):
    nome: str
    descricao: Optional[str] = None
    preco: Optional[float] = None
    capacidade: Optional[int] = 2
    comodidades: Optional[str] = None
    ativo: Optional[bool] = True
    ordem: Optional[int] = 0


def _empresa_id_do_request(token_payload: dict, query_empresa_id: Optional[int]) -> int:
    if token_payload.get("perfil") == "admin_master" and query_empresa_id:
        return query_empresa_id
    eid = token_payload.get("empresa_id")
    if not eid:
        raise HTTPException(status_code=400, detail="Token sem empresa_id")
    return eid


@router.get("")
async def listar(
    empresa_id: Optional[int] = None,
    token_payload: dict = Depends(require_feature("quartos")),
):
    """Lista quartos da empresa (ou da informada em ?empresa_id= para admin_master)."""
    import src.core.database as _database
    eid = _empresa_id_do_request(token_payload, empresa_id)
    rows = await _database.db_pool.fetch(
        """
        SELECT id, nome, descricao, preco, capacidade, comodidades, ativo, ordem,
               created_at, updated_at
        FROM quartos
        WHERE empresa_id = $1
        ORDER BY ordem ASC, nome ASC
        """,
        eid,
    )
    return [dict(r) for r in rows]


@router.post("", status_code=201)
async def criar(
    body: QuartoRequest,
    empresa_id: Optional[int] = None,
    token_payload: dict = Depends(require_feature("quartos")),
):
    import src.core.database as _database
    eid = _empresa_id_do_request(token_payload, empresa_id)
    row = await _database.db_pool.fetchrow(
        """
        INSERT INTO quartos (empresa_id, nome, descricao, preco, capacidade, comodidades, ativo, ordem)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
        """,
        eid, body.nome, body.descricao, body.preco,
        body.capacidade or 2, body.comodidades,
        bool(body.ativo), body.ordem or 0,
    )
    logger.info(f"🛏️ Quarto criado empresa_id={eid} id={row['id']} nome={body.nome}")
    return {"id": row["id"], "message": "Quarto criado"}


@router.put("/{quarto_id}")
async def atualizar(
    quarto_id: int,
    body: QuartoRequest,
    token_payload: dict = Depends(require_feature("quartos")),
):
    import src.core.database as _database
    existente = await _database.db_pool.fetchrow(
        "SELECT empresa_id FROM quartos WHERE id = $1", quarto_id,
    )
    if not existente:
        raise HTTPException(status_code=404, detail="Quarto não encontrado")
    if (
        token_payload.get("perfil") != "admin_master"
        and existente["empresa_id"] != token_payload.get("empresa_id")
    ):
        raise HTTPException(status_code=403, detail="Sem permissão")

    await _database.db_pool.execute(
        """
        UPDATE quartos
           SET nome = $1, descricao = $2, preco = $3, capacidade = $4,
               comodidades = $5, ativo = $6, ordem = $7, updated_at = NOW()
         WHERE id = $8
        """,
        body.nome, body.descricao, body.preco, body.capacidade or 2,
        body.comodidades, bool(body.ativo), body.ordem or 0, quarto_id,
    )
    return {"message": "Quarto atualizado"}


@router.delete("/{quarto_id}")
async def excluir(
    quarto_id: int,
    token_payload: dict = Depends(require_feature("quartos")),
):
    import src.core.database as _database
    existente = await _database.db_pool.fetchrow(
        "SELECT empresa_id FROM quartos WHERE id = $1", quarto_id,
    )
    if not existente:
        raise HTTPException(status_code=404, detail="Quarto não encontrado")
    if (
        token_payload.get("perfil") != "admin_master"
        and existente["empresa_id"] != token_payload.get("empresa_id")
    ):
        raise HTTPException(status_code=403, detail="Sem permissão")

    await _database.db_pool.execute("DELETE FROM quartos WHERE id = $1", quarto_id)
    return {"message": "Quarto excluído"}


# ---------- Helpers para consumo da IA ----------

async def listar_quartos_ativos(empresa_id: int) -> list[dict]:
    """Usado pelo prompt_builder. Retorna apenas quartos ativos."""
    import src.core.database as _database
    if not _database.db_pool:
        return []
    try:
        rows = await _database.db_pool.fetch(
            """
            SELECT nome, descricao, preco, capacidade, comodidades
            FROM quartos
            WHERE empresa_id = $1 AND ativo = TRUE
            ORDER BY ordem ASC, nome ASC
            """,
            empresa_id,
        )
    except Exception:
        return []
    return [dict(r) for r in rows]


def formatar_quartos_para_prompt(quartos: list[dict]) -> str:
    """Bloco legivel pela IA com a lista de quartos/acomodacoes."""
    if not quartos:
        return ""
    linhas = []
    for q in quartos:
        partes = [f"• {q['nome']}"]
        if q.get("preco") is not None:
            partes.append(f"R$ {float(q['preco']):.2f}/diária")
        if q.get("capacidade"):
            partes.append(f"até {q['capacidade']} hóspede(s)")
        cabecalho = " — ".join(partes)
        detalhes = []
        if q.get("descricao"):
            detalhes.append(q["descricao"].strip())
        if q.get("comodidades"):
            detalhes.append(f"Comodidades: {q['comodidades'].strip()}")
        corpo = "\n  ".join(detalhes) if detalhes else ""
        linhas.append(cabecalho + (("\n  " + corpo) if corpo else ""))
    return "[QUARTOS / ACOMODAÇÕES]\n" + "\n".join(linhas)
