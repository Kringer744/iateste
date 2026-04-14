"""
Rotas de Agendamento para Barbearia.
CRUD de barbeiros, serviços, agendamentos, avaliações e horários.
"""
import logging
from datetime import datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from src.core.database import get_db_pool
from src.core.security import get_current_user_token as get_current_user
from src.services.agendamento_service import (
    listar_barbeiros, buscar_barbeiro_por_nome,
    listar_servicos, buscar_servico_por_nome,
    obter_slots_disponiveis, formatar_disponibilidade_para_ia,
    obter_proximos_dias_disponiveis,
    criar_agendamento, cancelar_agendamento, concluir_agendamento,
    buscar_agendamentos_cliente, buscar_agendamentos_barbeiro,
    salvar_avaliacao, media_avaliacoes_barbeiro,
    formatar_pedido_avaliacao,
)

logger = logging.getLogger("agendamento_api")
router = APIRouter(prefix="/agendamento", tags=["Agendamento"])

TZ_SP = ZoneInfo("America/Sao_Paulo")


# ── Schemas ──

class BarbeiroCreate(BaseModel):
    nome: str
    telefone: Optional[str] = None
    especialidades: Optional[str] = None
    foto_url: Optional[str] = None
    unidade_id: Optional[int] = None

class BarbeiroUpdate(BaseModel):
    nome: Optional[str] = None
    telefone: Optional[str] = None
    especialidades: Optional[str] = None
    foto_url: Optional[str] = None
    ativo: Optional[bool] = None

class ServicoCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    duracao_minutos: int = 30
    preco: Optional[float] = None

class ServicoUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    duracao_minutos: Optional[int] = None
    preco: Optional[float] = None
    ativo: Optional[bool] = None

class HorarioCreate(BaseModel):
    barbeiro_id: int
    dia_semana: int = Field(ge=0, le=6)  # 0=seg, 6=dom
    hora_inicio: str  # "09:00"
    hora_fim: str      # "18:00"
    intervalo_minutos: int = 30

class BloqueioCreate(BaseModel):
    barbeiro_id: int
    data_inicio: str  # "2026-04-10T09:00"
    data_fim: str
    motivo: Optional[str] = None

class AgendamentoCreate(BaseModel):
    barbeiro_id: int
    data_hora: str       # "2026-04-10T14:00"
    cliente_nome: str
    cliente_telefone: str
    servico_id: Optional[int] = None
    duracao_minutos: int = 30
    notas: Optional[str] = None

class AvaliacaoCreate(BaseModel):
    nota: int = Field(ge=1, le=5)
    comentario: Optional[str] = None


# ═══════════════════════════════════════════════════════════
#  BARBEIROS
# ═══════════════════════════════════════════════════════════

@router.get("/barbeiros")
async def api_listar_barbeiros(user=Depends(get_current_user)):
    db = await get_db_pool()
    return await listar_barbeiros(db, user['empresa_id'])

@router.post("/barbeiros")
async def api_criar_barbeiro(body: BarbeiroCreate, user=Depends(get_current_user)):
    db = await get_db_pool()
    row = await db.fetchrow("""
        INSERT INTO barbeiros (empresa_id, unidade_id, nome, telefone, especialidades, foto_url)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
    """, user['empresa_id'], body.unidade_id, body.nome, body.telefone, body.especialidades, body.foto_url)
    return dict(row)

@router.put("/barbeiros/{barbeiro_id}")
async def api_atualizar_barbeiro(barbeiro_id: int, body: BarbeiroUpdate, user=Depends(get_current_user)):
    db = await get_db_pool()
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if not updates:
        raise HTTPException(400, "Nenhum campo para atualizar")
    set_clause = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(updates.keys()))
    values = [barbeiro_id] + list(updates.values())
    await db.execute(
        f"UPDATE barbeiros SET {set_clause}, updated_at = NOW() WHERE id = $1 AND empresa_id = {user['empresa_id']}",
        *values
    )
    return {"ok": True}

@router.delete("/barbeiros/{barbeiro_id}")
async def api_desativar_barbeiro(barbeiro_id: int, user=Depends(get_current_user)):
    db = await get_db_pool()
    await db.execute(
        "UPDATE barbeiros SET ativo = false, updated_at = NOW() WHERE id = $1 AND empresa_id = $2",
        barbeiro_id, user['empresa_id']
    )
    return {"ok": True}


# ═══════════════════════════════════════════════════════════
#  SERVIÇOS
# ═══════════════════════════════════════════════════════════

@router.get("/servicos")
async def api_listar_servicos(user=Depends(get_current_user)):
    db = await get_db_pool()
    return await listar_servicos(db, user['empresa_id'])

@router.post("/servicos")
async def api_criar_servico(body: ServicoCreate, user=Depends(get_current_user)):
    db = await get_db_pool()
    row = await db.fetchrow("""
        INSERT INTO servicos (empresa_id, nome, descricao, duracao_minutos, preco)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    """, user['empresa_id'], body.nome, body.descricao, body.duracao_minutos, body.preco)
    return dict(row)

@router.put("/servicos/{servico_id}")
async def api_atualizar_servico(servico_id: int, body: ServicoUpdate, user=Depends(get_current_user)):
    db = await get_db_pool()
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if not updates:
        raise HTTPException(400, "Nenhum campo para atualizar")
    set_clause = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(updates.keys()))
    values = [servico_id] + list(updates.values())
    await db.execute(
        f"UPDATE servicos SET {set_clause}, updated_at = NOW() WHERE id = $1 AND empresa_id = {user['empresa_id']}",
        *values
    )
    return {"ok": True}

@router.delete("/servicos/{servico_id}")
async def api_desativar_servico(servico_id: int, user=Depends(get_current_user)):
    db = await get_db_pool()
    await db.execute(
        "UPDATE servicos SET ativo = false WHERE id = $1 AND empresa_id = $2",
        servico_id, user['empresa_id']
    )
    return {"ok": True}


# ═══════════════════════════════════════════════════════════
#  HORÁRIOS DISPONÍVEIS
# ═══════════════════════════════════════════════════════════

@router.get("/horarios/{barbeiro_id}")
async def api_listar_horarios(barbeiro_id: int, user=Depends(get_current_user)):
    db = await get_db_pool()
    rows = await db.fetch(
        "SELECT * FROM horarios_disponiveis WHERE barbeiro_id = $1 AND empresa_id = $2 ORDER BY dia_semana, hora_inicio",
        barbeiro_id, user['empresa_id']
    )
    return [dict(r) for r in rows]

@router.post("/horarios")
async def api_criar_horario(body: HorarioCreate, user=Depends(get_current_user)):
    db = await get_db_pool()
    from datetime import time as dt_time
    h_inicio = dt_time(*map(int, body.hora_inicio.split(":")))
    h_fim = dt_time(*map(int, body.hora_fim.split(":")))
    row = await db.fetchrow("""
        INSERT INTO horarios_disponiveis (barbeiro_id, empresa_id, dia_semana, hora_inicio, hora_fim, intervalo_minutos)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
    """, body.barbeiro_id, user['empresa_id'], body.dia_semana, h_inicio, h_fim, body.intervalo_minutos)
    return dict(row)

@router.delete("/horarios/{horario_id}")
async def api_deletar_horario(horario_id: int, user=Depends(get_current_user)):
    db = await get_db_pool()
    await db.execute(
        "DELETE FROM horarios_disponiveis WHERE id = $1 AND empresa_id = $2",
        horario_id, user['empresa_id']
    )
    return {"ok": True}


# ═══════════════════════════════════════════════════════════
#  BLOQUEIOS
# ═══════════════════════════════════════════════════════════

@router.post("/bloqueios")
async def api_criar_bloqueio(body: BloqueioCreate, user=Depends(get_current_user)):
    db = await get_db_pool()
    row = await db.fetchrow("""
        INSERT INTO bloqueios_agenda (barbeiro_id, empresa_id, data_inicio, data_fim, motivo)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    """, body.barbeiro_id, user['empresa_id'],
        datetime.fromisoformat(body.data_inicio),
        datetime.fromisoformat(body.data_fim),
        body.motivo)
    return dict(row)

@router.get("/bloqueios/{barbeiro_id}")
async def api_listar_bloqueios(barbeiro_id: int, user=Depends(get_current_user)):
    db = await get_db_pool()
    rows = await db.fetch(
        "SELECT * FROM bloqueios_agenda WHERE barbeiro_id = $1 AND empresa_id = $2 AND data_fim >= NOW() ORDER BY data_inicio",
        barbeiro_id, user['empresa_id']
    )
    return [dict(r) for r in rows]

@router.delete("/bloqueios/{bloqueio_id}")
async def api_deletar_bloqueio(bloqueio_id: int, user=Depends(get_current_user)):
    db = await get_db_pool()
    await db.execute(
        "DELETE FROM bloqueios_agenda WHERE id = $1 AND empresa_id = $2",
        bloqueio_id, user['empresa_id']
    )
    return {"ok": True}


# ═══════════════════════════════════════════════════════════
#  DISPONIBILIDADE (consulta pública para IA)
# ═══════════════════════════════════════════════════════════

@router.get("/disponibilidade")
async def api_disponibilidade(
    data: Optional[str] = None,
    barbeiro_id: Optional[int] = None,
    user=Depends(get_current_user),
):
    db = await get_db_pool()
    if data:
        dt = datetime.strptime(data, "%Y-%m-%d")
    else:
        dt = datetime.now(TZ_SP).replace(tzinfo=None)

    slots = await obter_slots_disponiveis(db, user['empresa_id'], dt, barbeiro_id)
    return {"data": dt.strftime("%Y-%m-%d"), "slots": slots}

@router.get("/disponibilidade/resumo")
async def api_disponibilidade_resumo(
    barbeiro_id: Optional[int] = None,
    dias: int = 7,
    user=Depends(get_current_user),
):
    db = await get_db_pool()
    texto = await obter_proximos_dias_disponiveis(db, user['empresa_id'], barbeiro_id, dias)
    return {"resumo": texto}


# ═══════════════════════════════════════════════════════════
#  AGENDAMENTOS
# ═══════════════════════════════════════════════════════════

@router.get("/agendamentos")
async def api_listar_agendamentos(
    data: Optional[str] = None,
    barbeiro_id: Optional[int] = None,
    status: Optional[str] = None,
    user=Depends(get_current_user),
):
    db = await get_db_pool()
    query = """
        SELECT a.*, b.nome as barbeiro_nome, s.nome as servico_nome
        FROM agendamentos a
        LEFT JOIN barbeiros b ON b.id = a.barbeiro_id
        LEFT JOIN servicos s ON s.id = a.servico_id
        WHERE a.empresa_id = $1
    """
    params = [user['empresa_id']]
    idx = 2

    if data:
        dt = datetime.strptime(data, "%Y-%m-%d")
        query += f" AND a.data_hora::date = ${idx}"
        params.append(dt.date())
        idx += 1
    if barbeiro_id:
        query += f" AND a.barbeiro_id = ${idx}"
        params.append(barbeiro_id)
        idx += 1
    if status:
        query += f" AND a.status = ${idx}"
        params.append(status)
        idx += 1

    query += " ORDER BY a.data_hora DESC LIMIT 100"
    rows = await db.fetch(query, *params)
    return [dict(r) for r in rows]

@router.post("/agendamentos")
async def api_criar_agendamento(body: AgendamentoCreate, user=Depends(get_current_user)):
    db = await get_db_pool()
    data_hora = datetime.fromisoformat(body.data_hora)
    result = await criar_agendamento(
        db, user['empresa_id'], body.barbeiro_id, data_hora,
        body.cliente_nome, body.cliente_telefone,
        body.servico_id, body.duracao_minutos, notas=body.notas,
    )
    if not result:
        raise HTTPException(409, "Horário já ocupado")
    return result

@router.patch("/agendamentos/{agendamento_id}/cancelar")
async def api_cancelar_agendamento(agendamento_id: int, user=Depends(get_current_user)):
    db = await get_db_pool()
    ok = await cancelar_agendamento(db, agendamento_id)
    if not ok:
        raise HTTPException(404, "Agendamento não encontrado ou já cancelado")
    return {"ok": True}

@router.patch("/agendamentos/{agendamento_id}/concluir")
async def api_concluir_agendamento(agendamento_id: int, user=Depends(get_current_user)):
    """Marca corte como feito — dispara avaliação automática."""
    db = await get_db_pool()
    ok = await concluir_agendamento(db, agendamento_id)
    if not ok:
        raise HTTPException(404, "Agendamento não encontrado ou já finalizado")
    return {"ok": True, "message": "Corte concluído! Avaliação será enviada ao cliente."}


# ═══════════════════════════════════════════════════════════
#  AVALIAÇÕES
# ═══════════════════════════════════════════════════════════

@router.post("/agendamentos/{agendamento_id}/avaliar")
async def api_avaliar(agendamento_id: int, body: AvaliacaoCreate, user=Depends(get_current_user)):
    db = await get_db_pool()
    ag = await db.fetchrow("SELECT * FROM agendamentos WHERE id = $1 AND empresa_id = $2", agendamento_id, user['empresa_id'])
    if not ag:
        raise HTTPException(404, "Agendamento não encontrado")
    result = await salvar_avaliacao(
        db, agendamento_id, user['empresa_id'],
        ag['barbeiro_id'], body.nota, body.comentario, ag['cliente_telefone']
    )
    return result

@router.get("/avaliacoes/{barbeiro_id}")
async def api_avaliacoes_barbeiro(barbeiro_id: int, user=Depends(get_current_user)):
    db = await get_db_pool()
    media = await media_avaliacoes_barbeiro(db, barbeiro_id)
    rows = await db.fetch("""
        SELECT av.*, a.cliente_nome, a.data_hora
        FROM avaliacoes av
        JOIN agendamentos a ON a.id = av.agendamento_id
        WHERE av.barbeiro_id = $1 AND av.empresa_id = $2
        ORDER BY av.created_at DESC LIMIT 50
    """, barbeiro_id, user['empresa_id'])
    return {"media": media, "avaliacoes": [dict(r) for r in rows]}


# ═══════════════════════════════════════════════════════════
#  CLIENTES (lista única a partir de agendamentos + memoria)
# ═══════════════════════════════════════════════════════════

@router.get("/clientes")
async def api_listar_clientes(
    busca: Optional[str] = None,
    user=Depends(get_current_user),
):
    """Lista clientes únicos (de agendamentos + memoria_cliente)."""
    db = await get_db_pool()
    empresa_id = user['empresa_id']
    rows = await db.fetch("""
        SELECT
            cliente_telefone AS telefone,
            MAX(cliente_nome) AS nome,
            COUNT(*) AS total_agendamentos,
            MAX(data_hora) AS ultimo_agendamento
        FROM agendamentos
        WHERE empresa_id = $1 AND cliente_telefone IS NOT NULL AND cliente_telefone != ''
        GROUP BY cliente_telefone
        ORDER BY MAX(data_hora) DESC
    """, empresa_id)

    clientes = []
    for r in rows:
        fone = r['telefone']
        nome = r['nome'] or fone
        if busca and busca.lower() not in nome.lower() and busca not in fone:
            continue
        notas_count = await db.fetchval(
            "SELECT COUNT(*) FROM memoria_cliente WHERE contato_fone = $1 AND empresa_id = $2",
            "".join(filter(str.isdigit, fone)), empresa_id
        )
        clientes.append({
            "telefone": fone,
            "nome": nome,
            "total_agendamentos": r['total_agendamentos'],
            "ultimo_agendamento": r['ultimo_agendamento'].isoformat() if r['ultimo_agendamento'] else None,
            "total_notas": notas_count,
        })
    return clientes


# ═══════════════════════════════════════════════════════════
#  PERSONA / NOTAS DE CLIENTES
# ═══════════════════════════════════════════════════════════

class PersonaClienteCreate(BaseModel):
    contato_fone: str
    tipo: str = Field(default="persona", description="persona, preferencia, historico")
    conteudo: str

class PersonaClienteUpdate(BaseModel):
    conteudo: Optional[str] = None
    tipo: Optional[str] = None
    relevancia: Optional[float] = None


@router.get("/clientes/{telefone}/persona")
async def get_persona_cliente(telefone: str, user=Depends(get_current_user)):
    """Lista persona/notas de um cliente pelo telefone."""
    db = await get_db_pool()
    empresa_id = user.get("empresa_id")
    fone_limpo = "".join(filter(str.isdigit, telefone))
    rows = await db.fetch(
        """SELECT id, tipo, conteudo, relevancia, created_at, updated_at
           FROM memoria_cliente
           WHERE contato_fone = $1 AND empresa_id = $2
           ORDER BY relevancia DESC, updated_at DESC""",
        fone_limpo, empresa_id
    )
    return [dict(r) for r in rows]


@router.post("/clientes/persona", status_code=201)
async def criar_persona_cliente(body: PersonaClienteCreate, user=Depends(get_current_user)):
    """Barbeiro adiciona nota/persona sobre um cliente."""
    db = await get_db_pool()
    empresa_id = user.get("empresa_id")
    fone_limpo = "".join(filter(str.isdigit, body.contato_fone))
    row = await db.fetchrow(
        """INSERT INTO memoria_cliente (empresa_id, contato_fone, tipo, conteudo, relevancia)
           VALUES ($1, $2, $3, $4, 1.0)
           RETURNING id""",
        empresa_id, fone_limpo, body.tipo, body.conteudo
    )
    # Limpa cache Redis
    from src.core.redis_client import redis_client
    await redis_client.delete(f"{empresa_id}:memoria_lp:{fone_limpo}")
    return {"id": row["id"], "status": "created"}


@router.put("/clientes/persona/{nota_id}")
async def atualizar_persona_cliente(nota_id: int, body: PersonaClienteUpdate, user=Depends(get_current_user)):
    """Atualiza uma nota/persona de cliente."""
    db = await get_db_pool()
    empresa_id = user.get("empresa_id")
    sets = []
    params = []
    idx = 1
    if body.conteudo is not None:
        sets.append(f"conteudo = ${idx}")
        params.append(body.conteudo)
        idx += 1
    if body.tipo is not None:
        sets.append(f"tipo = ${idx}")
        params.append(body.tipo)
        idx += 1
    if body.relevancia is not None:
        sets.append(f"relevancia = ${idx}")
        params.append(body.relevancia)
        idx += 1
    if not sets:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    sets.append("updated_at = NOW()")
    params.extend([nota_id, empresa_id])
    await db.execute(
        f"UPDATE memoria_cliente SET {', '.join(sets)} WHERE id = ${idx} AND empresa_id = ${idx+1}",
        *params
    )
    return {"status": "updated"}


@router.delete("/clientes/persona/{nota_id}")
async def deletar_persona_cliente(nota_id: int, user=Depends(get_current_user)):
    """Remove uma nota/persona de cliente."""
    db = await get_db_pool()
    empresa_id = user.get("empresa_id")
    await db.execute(
        "DELETE FROM memoria_cliente WHERE id = $1 AND empresa_id = $2",
        nota_id, empresa_id
    )
    return {"status": "deleted"}
