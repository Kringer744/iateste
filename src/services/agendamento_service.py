"""
Serviço de Agendamento para Barbearia.
Gerencia consulta de disponibilidade, criação de agendamentos,
lembretes automáticos e avaliações pós-atendimento.
"""
import logging
from datetime import datetime, timedelta, time as dt_time
from typing import Optional, List, Dict, Any
from zoneinfo import ZoneInfo

logger = logging.getLogger("agendamento")

TZ_SP = ZoneInfo("America/Sao_Paulo")

# ── Dias da semana em português ──
DIAS_SEMANA_PT = {
    0: "segunda-feira",
    1: "terça-feira",
    2: "quarta-feira",
    3: "quinta-feira",
    4: "sexta-feira",
    5: "sábado",
    6: "domingo",
}
DIAS_SEMANA_ABREV = {
    0: "seg", 1: "ter", 2: "qua", 3: "qui", 4: "sex", 5: "sáb", 6: "dom",
}


# ═══════════════════════════════════════════════════════════
#  BARBEIROS
# ═══════════════════════════════════════════════════════════

async def listar_barbeiros(db_pool, empresa_id: int) -> List[Dict]:
    """Lista barbeiros ativos da empresa."""
    rows = await db_pool.fetch(
        "SELECT * FROM barbeiros WHERE empresa_id = $1 AND ativo = true ORDER BY nome",
        empresa_id
    )
    return [dict(r) for r in rows]


async def buscar_barbeiro_por_nome(db_pool, empresa_id: int, nome: str) -> Optional[Dict]:
    """Busca barbeiro por nome (fuzzy)."""
    row = await db_pool.fetchrow(
        "SELECT * FROM barbeiros WHERE empresa_id = $1 AND ativo = true AND LOWER(nome) LIKE $2 LIMIT 1",
        empresa_id, f"%{nome.lower()}%"
    )
    return dict(row) if row else None


# ═══════════════════════════════════════════════════════════
#  SERVIÇOS
# ═══════════════════════════════════════════════════════════

async def listar_servicos(db_pool, empresa_id: int) -> List[Dict]:
    """Lista serviços ativos da empresa."""
    rows = await db_pool.fetch(
        "SELECT * FROM servicos WHERE empresa_id = $1 AND ativo = true ORDER BY nome",
        empresa_id
    )
    return [dict(r) for r in rows]


async def buscar_servico_por_nome(db_pool, empresa_id: int, nome: str) -> Optional[Dict]:
    """Busca serviço por nome (fuzzy)."""
    row = await db_pool.fetchrow(
        "SELECT * FROM servicos WHERE empresa_id = $1 AND ativo = true AND LOWER(nome) LIKE $2 LIMIT 1",
        empresa_id, f"%{nome.lower()}%"
    )
    return dict(row) if row else None


# ═══════════════════════════════════════════════════════════
#  CONSULTA DE DISPONIBILIDADE
# ═══════════════════════════════════════════════════════════

async def obter_slots_disponiveis(
    db_pool,
    empresa_id: int,
    data: datetime,
    barbeiro_id: Optional[int] = None,
    duracao_minutos: int = 30,
) -> List[Dict]:
    """
    Retorna slots disponíveis para uma data específica.
    Considera: horários do barbeiro, agendamentos existentes, bloqueios.
    """
    dia_semana = data.weekday()  # 0=seg, 6=dom

    # Busca horários configurados para esse dia da semana
    query_horarios = """
        SELECT hd.*, b.nome as barbeiro_nome
        FROM horarios_disponiveis hd
        JOIN barbeiros b ON b.id = hd.barbeiro_id
        WHERE hd.empresa_id = $1
          AND hd.dia_semana = $2
          AND hd.ativo = true
          AND b.ativo = true
    """
    params = [empresa_id, dia_semana]
    if barbeiro_id:
        query_horarios += " AND hd.barbeiro_id = $3"
        params.append(barbeiro_id)

    horarios = await db_pool.fetch(query_horarios, *params)
    if not horarios:
        return []

    # Busca agendamentos já existentes para essa data
    data_inicio = data.replace(hour=0, minute=0, second=0)
    data_fim = data.replace(hour=23, minute=59, second=59)

    agendamentos_existentes = await db_pool.fetch("""
        SELECT barbeiro_id, data_hora, duracao_minutos
        FROM agendamentos
        WHERE empresa_id = $1
          AND data_hora BETWEEN $2 AND $3
          AND status NOT IN ('cancelado')
    """, empresa_id, data_inicio, data_fim)

    # Busca bloqueios para essa data
    bloqueios = await db_pool.fetch("""
        SELECT barbeiro_id, data_inicio, data_fim
        FROM bloqueios_agenda
        WHERE empresa_id = $1
          AND data_inicio <= $3
          AND data_fim >= $2
    """, empresa_id, data_inicio, data_fim)

    # Monta set de horários ocupados por barbeiro
    ocupados = {}  # {barbeiro_id: [(hora_inicio, hora_fim), ...]}
    for ag in agendamentos_existentes:
        bid = ag['barbeiro_id']
        if bid not in ocupados:
            ocupados[bid] = []
        ag_inicio = ag['data_hora']
        ag_fim = ag_inicio + timedelta(minutes=ag['duracao_minutos'])
        ocupados[bid].append((ag_inicio, ag_fim))

    bloqueados = {}  # {barbeiro_id: [(inicio, fim), ...]}
    for bl in bloqueios:
        bid = bl['barbeiro_id']
        if bid not in bloqueados:
            bloqueados[bid] = []
        bloqueados[bid].append((bl['data_inicio'], bl['data_fim']))

    agora = datetime.now(TZ_SP).replace(tzinfo=None)
    slots = []

    for h in horarios:
        bid = h['barbeiro_id']
        bname = h['barbeiro_nome']
        intervalo = h['intervalo_minutos'] or duracao_minutos

        # Gera slots de intervalo em intervalo
        slot_time = datetime.combine(data.date(), h['hora_inicio'])
        fim_expediente = datetime.combine(data.date(), h['hora_fim'])

        while slot_time + timedelta(minutes=duracao_minutos) <= fim_expediente:
            slot_fim = slot_time + timedelta(minutes=duracao_minutos)

            # Verifica se não é passado
            if slot_time <= agora:
                slot_time += timedelta(minutes=intervalo)
                continue

            # Verifica bloqueio
            bloqueado = False
            for bl_inicio, bl_fim in bloqueados.get(bid, []):
                if slot_time < bl_fim and slot_fim > bl_inicio:
                    bloqueado = True
                    break
            if bloqueado:
                slot_time += timedelta(minutes=intervalo)
                continue

            # Verifica conflito com agendamento existente
            conflito = False
            for ag_inicio, ag_fim in ocupados.get(bid, []):
                if slot_time < ag_fim and slot_fim > ag_inicio:
                    conflito = True
                    break

            if not conflito:
                slots.append({
                    "barbeiro_id": bid,
                    "barbeiro_nome": bname,
                    "horario": slot_time.strftime("%H:%M"),
                    "data": slot_time.strftime("%d/%m/%Y"),
                    "datetime": slot_time,
                })

            slot_time += timedelta(minutes=intervalo)

    # Ordena por horário
    slots.sort(key=lambda s: s["datetime"])
    return slots


async def formatar_disponibilidade_para_ia(
    db_pool, empresa_id: int, data: datetime,
    barbeiro_id: Optional[int] = None, duracao_minutos: int = 30,
) -> str:
    """Retorna texto formatado com horários disponíveis para o prompt da IA."""
    slots = await obter_slots_disponiveis(db_pool, empresa_id, data, barbeiro_id, duracao_minutos)
    if not slots:
        dia_nome = DIAS_SEMANA_PT.get(data.weekday(), "")
        return f"Não há horários disponíveis para {dia_nome} ({data.strftime('%d/%m')})."

    # Agrupa por barbeiro
    por_barbeiro = {}
    for s in slots:
        bname = s["barbeiro_nome"]
        if bname not in por_barbeiro:
            por_barbeiro[bname] = []
        por_barbeiro[bname].append(s["horario"])

    dia_nome = DIAS_SEMANA_PT.get(data.weekday(), "")
    linhas = [f"Horários disponíveis para {dia_nome} ({data.strftime('%d/%m')}):"]
    for bname, horarios in por_barbeiro.items():
        linhas.append(f"• {bname}: {', '.join(horarios)}")

    return "\n".join(linhas)


async def obter_proximos_dias_disponiveis(
    db_pool, empresa_id: int, barbeiro_id: Optional[int] = None,
    dias_afrente: int = 7, duracao_minutos: int = 30,
) -> str:
    """Retorna resumo dos próximos dias com vagas, SEPARADO POR BARBEIRO."""
    hoje = datetime.now(TZ_SP).replace(tzinfo=None)
    linhas = []

    for i in range(dias_afrente):
        data = hoje + timedelta(days=i)
        slots = await obter_slots_disponiveis(db_pool, empresa_id, data, barbeiro_id, duracao_minutos)
        if slots:
            dia_nome = DIAS_SEMANA_ABREV.get(data.weekday(), "")
            label = "hoje" if i == 0 else ("amanhã" if i == 1 else f"{dia_nome} ({data.strftime('%d/%m')})")

            # Agrupa slots por barbeiro
            por_barbeiro = {}
            for s in slots:
                bname = s["barbeiro_nome"]
                if bname not in por_barbeiro:
                    por_barbeiro[bname] = []
                por_barbeiro[bname].append(s["horario"])

            if len(por_barbeiro) == 1:
                # Só 1 barbeiro — formato simples
                bname, horarios = next(iter(por_barbeiro.items()))
                linhas.append(f"• {label} ({bname}): {', '.join(horarios)}")
            else:
                # Múltiplos barbeiros — mostra cada um
                linhas.append(f"• {label}:")
                for bname, horarios in por_barbeiro.items():
                    linhas.append(f"  - {bname}: {', '.join(horarios)}")

    if not linhas:
        return "Não há horários disponíveis nos próximos dias."

    return "Disponibilidade por profissional:\n" + "\n".join(linhas)


# ═══════════════════════════════════════════════════════════
#  CRIAR / CANCELAR AGENDAMENTO
# ═══════════════════════════════════════════════════════════

async def criar_agendamento(
    db_pool,
    empresa_id: int,
    barbeiro_id: int,
    data_hora: datetime,
    cliente_nome: str,
    cliente_telefone: str,
    servico_id: Optional[int] = None,
    duracao_minutos: int = 30,
    conversation_id: Optional[int] = None,
    notas: Optional[str] = None,
) -> Optional[Dict]:
    """Cria um agendamento verificando conflitos."""

    # Verifica conflito
    conflito = await db_pool.fetchval("""
        SELECT 1 FROM agendamentos
        WHERE barbeiro_id = $1
          AND status NOT IN ('cancelado')
          AND data_hora < $2 + make_interval(mins => $3)
          AND data_hora + make_interval(mins => duracao_minutos) > $2
        LIMIT 1
    """, barbeiro_id, data_hora, duracao_minutos)

    if conflito:
        logger.warning(f"⚠️ Conflito de agendamento: barbeiro {barbeiro_id} em {data_hora}")
        return None

    row = await db_pool.fetchrow("""
        INSERT INTO agendamentos
            (empresa_id, barbeiro_id, servico_id, conversation_id,
             cliente_nome, cliente_telefone, data_hora, duracao_minutos, notas, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'confirmado')
        RETURNING *
    """, empresa_id, barbeiro_id, servico_id, conversation_id,
        cliente_nome, cliente_telefone, data_hora, duracao_minutos, notas)

    if row:
        logger.info(f"✅ Agendamento #{row['id']} criado: {cliente_nome} com barbeiro {barbeiro_id} em {data_hora}")
    return dict(row) if row else None


async def cancelar_agendamento(db_pool, agendamento_id: int) -> bool:
    """Cancela um agendamento."""
    result = await db_pool.execute(
        "UPDATE agendamentos SET status = 'cancelado', updated_at = NOW() WHERE id = $1 AND status = 'confirmado'",
        agendamento_id
    )
    return "UPDATE 1" in result


async def concluir_agendamento(db_pool, agendamento_id: int) -> bool:
    """Marca agendamento como concluído (corte feito)."""
    result = await db_pool.execute(
        "UPDATE agendamentos SET status = 'concluido', updated_at = NOW() WHERE id = $1 AND status = 'confirmado'",
        agendamento_id
    )
    return "UPDATE 1" in result


async def buscar_agendamentos_cliente(db_pool, empresa_id: int, telefone: str) -> List[Dict]:
    """Busca agendamentos futuros de um cliente por telefone."""
    agora = datetime.now(TZ_SP).replace(tzinfo=None)
    rows = await db_pool.fetch("""
        SELECT a.*, b.nome as barbeiro_nome, s.nome as servico_nome
        FROM agendamentos a
        LEFT JOIN barbeiros b ON b.id = a.barbeiro_id
        LEFT JOIN servicos s ON s.id = a.servico_id
        WHERE a.empresa_id = $1
          AND a.cliente_telefone = $2
          AND a.data_hora >= $3
          AND a.status = 'confirmado'
        ORDER BY a.data_hora
    """, empresa_id, telefone, agora)
    return [dict(r) for r in rows]


async def buscar_agendamentos_barbeiro(db_pool, barbeiro_id: int, data: Optional[datetime] = None) -> List[Dict]:
    """Busca agendamentos de um barbeiro para uma data."""
    if not data:
        data = datetime.now(TZ_SP).replace(tzinfo=None)
    data_inicio = data.replace(hour=0, minute=0, second=0)
    data_fim = data.replace(hour=23, minute=59, second=59)

    rows = await db_pool.fetch("""
        SELECT a.*, s.nome as servico_nome
        FROM agendamentos a
        LEFT JOIN servicos s ON s.id = a.servico_id
        WHERE a.barbeiro_id = $1
          AND a.data_hora BETWEEN $2 AND $3
          AND a.status NOT IN ('cancelado')
        ORDER BY a.data_hora
    """, barbeiro_id, data_inicio, data_fim)
    return [dict(r) for r in rows]


# ═══════════════════════════════════════════════════════════
#  AVALIAÇÕES
# ═══════════════════════════════════════════════════════════

async def salvar_avaliacao(
    db_pool, agendamento_id: int, empresa_id: int,
    barbeiro_id: int, nota: int, comentario: Optional[str] = None,
    cliente_telefone: Optional[str] = None,
) -> Optional[Dict]:
    """Salva avaliação pós-atendimento."""
    if nota < 1 or nota > 5:
        return None
    row = await db_pool.fetchrow("""
        INSERT INTO avaliacoes (agendamento_id, empresa_id, barbeiro_id, nota, comentario, cliente_telefone)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (agendamento_id) DO UPDATE SET nota = $4, comentario = $5
        RETURNING *
    """, agendamento_id, empresa_id, barbeiro_id, nota, comentario, cliente_telefone)
    return dict(row) if row else None


async def media_avaliacoes_barbeiro(db_pool, barbeiro_id: int) -> Dict:
    """Retorna média e total de avaliações de um barbeiro."""
    row = await db_pool.fetchrow("""
        SELECT AVG(nota)::numeric(3,1) as media, COUNT(*) as total
        FROM avaliacoes WHERE barbeiro_id = $1
    """, barbeiro_id)
    return {"media": float(row['media'] or 0), "total": row['total'] or 0}


# ═══════════════════════════════════════════════════════════
#  FORMATAÇÃO PARA IA
# ═══════════════════════════════════════════════════════════

def formatar_agendamento_confirmacao(
    agendamento: Dict, barbeiro_nome: str, servico_nome: Optional[str] = None,
    templates: Optional[Dict[str, str]] = None,
) -> str:
    """Formata confirmação de agendamento para WhatsApp."""
    data_hora = agendamento['data_hora']
    dia_nome = DIAS_SEMANA_PT.get(data_hora.weekday(), "")

    template = (templates or {}).get("msg_confirmacao_agendamento")
    if template:
        try:
            return template.format(
                dia=dia_nome.capitalize(),
                data=data_hora.strftime('%d/%m/%Y'),
                horario=data_hora.strftime('%H:%M'),
                barbeiro=barbeiro_nome,
                servico=servico_nome or "",
            )
        except (KeyError, IndexError, ValueError):
            pass  # fall through to default

    texto = f"✅ *Agendamento Confirmado!*\n\n"
    texto += f"📅 {dia_nome.capitalize()}, {data_hora.strftime('%d/%m/%Y')}\n"
    texto += f"🕐 {data_hora.strftime('%H:%M')}\n"
    texto += f"💈 {barbeiro_nome}\n"
    if servico_nome:
        texto += f"✂️ {servico_nome}\n"
    texto += f"\nTe esperamos! Se precisar remarcar ou cancelar, é só me avisar 😊"

    return texto


def formatar_lembrete(
    agendamento: Dict, barbeiro_nome: str, tipo: str = "1d",
    templates: Optional[Dict[str, str]] = None,
) -> str:
    """Formata mensagem de lembrete."""
    data_hora = agendamento['data_hora']
    dia_nome = DIAS_SEMANA_PT.get(data_hora.weekday(), "")

    template_key = "msg_lembrete_1d" if tipo == "1d" else "msg_lembrete_1h"
    template = (templates or {}).get(template_key)
    if template:
        try:
            return template.format(
                dia=dia_nome.capitalize(),
                data=data_hora.strftime('%d/%m'),
                horario=data_hora.strftime('%H:%M'),
                barbeiro=barbeiro_nome,
                servico="",
            )
        except (KeyError, IndexError, ValueError):
            pass  # fall through to default

    if tipo == "1d":
        texto = f"👋 Oi! Lembrando que *amanhã* você tem horário marcado:\n\n"
    else:
        texto = f"⏰ Falta *1 hora* pro seu horário:\n\n"

    texto += f"📅 {dia_nome.capitalize()}, {data_hora.strftime('%d/%m')} às {data_hora.strftime('%H:%M')}\n"
    texto += f"💈 Com {barbeiro_nome}\n"
    texto += f"\nVocê confirma? Responde *sim* ou *não* 😊"

    return texto


def formatar_pedido_avaliacao(
    agendamento: Dict, barbeiro_nome: str,
    templates: Optional[Dict[str, str]] = None,
) -> str:
    """Formata pedido de avaliação pós-corte."""
    template = (templates or {}).get("msg_avaliacao")
    if template:
        try:
            return template.format(
                barbeiro=barbeiro_nome,
                dia="",
                data="",
                horario="",
                servico="",
                estrelas="",
            )
        except (KeyError, IndexError, ValueError):
            pass  # fall through to default

    texto = f"✂️ Corte finalizado! Como foi seu atendimento com *{barbeiro_nome}*?\n\n"
    texto += "Dá uma nota de *1 a 5* ⭐\n\n"
    texto += "1 ⭐ - Ruim\n"
    texto += "2 ⭐⭐ - Regular\n"
    texto += "3 ⭐⭐⭐ - Bom\n"
    texto += "4 ⭐⭐⭐⭐ - Muito bom\n"
    texto += "5 ⭐⭐⭐⭐⭐ - Excelente\n\n"
    texto += "Só mandar o número! 😊"

    return texto


def formatar_avaliacao_obrigado(
    nota: int,
    templates: Optional[Dict[str, str]] = None,
) -> str:
    """Formata mensagem de agradecimento pós-avaliação."""
    estrelas = "⭐" * nota
    template = (templates or {}).get("msg_avaliacao_obrigado")
    if template:
        try:
            return template.format(estrelas=estrelas, barbeiro="", dia="", data="", horario="", servico="")
        except (KeyError, IndexError, ValueError):
            pass  # fall through to default

    return f"Obrigado pela avaliação! {estrelas}\n\nSua opinião é muito importante pra gente! 😊"


# ═══════════════════════════════════════════════════════════
#  PARSE DE DATA/HORA DO TEXTO DO CLIENTE
# ═══════════════════════════════════════════════════════════

def parse_data_texto(texto: str) -> Optional[datetime]:
    """
    Tenta extrair data de texto em linguagem natural.
    Exemplos: "hoje", "amanhã", "sexta", "15/04", "sexta que vem"
    """
    import re
    texto = texto.lower().strip()
    agora = datetime.now(TZ_SP).replace(tzinfo=None)

    # Hoje / amanhã
    if "hoje" in texto:
        return agora
    if "amanha" in texto or "amanhã" in texto:
        return agora + timedelta(days=1)

    # Dia da semana
    dias_map = {
        "segunda": 0, "terça": 1, "terca": 1, "quarta": 2,
        "quinta": 3, "sexta": 4, "sabado": 5, "sábado": 5, "domingo": 6,
    }
    for nome, dia_num in dias_map.items():
        if nome in texto:
            dias_ate = (dia_num - agora.weekday()) % 7
            if dias_ate == 0:
                dias_ate = 7  # próxima semana se for hoje
            return agora + timedelta(days=dias_ate)

    # Data explícita dd/mm
    match = re.search(r'(\d{1,2})[/\-.](\d{1,2})', texto)
    if match:
        dia, mes = int(match.group(1)), int(match.group(2))
        ano = agora.year
        try:
            data = datetime(ano, mes, dia)
            if data < agora:
                data = datetime(ano + 1, mes, dia)
            return data
        except ValueError:
            pass

    return None


def parse_hora_texto(texto: str) -> Optional[str]:
    """
    Tenta extrair horário de texto.
    Exemplos: "14h", "14:30", "2 da tarde", "10 horas"
    """
    import re
    texto = texto.lower().strip()

    # Formato HH:MM ou HHhMM
    match = re.search(r'(\d{1,2})[h:](\d{2})', texto)
    if match:
        h, m = int(match.group(1)), int(match.group(2))
        if 0 <= h <= 23 and 0 <= m <= 59:
            return f"{h:02d}:{m:02d}"

    # Formato HHh ou HH horas
    match = re.search(r'(\d{1,2})\s*(?:h|hora|horas)\b', texto)
    if match:
        h = int(match.group(1))
        if 0 <= h <= 23:
            return f"{h:02d}:00"

    # "2 da tarde" / "3 da tarde"
    match = re.search(r'(\d{1,2})\s*(?:da tarde|da noite)', texto)
    if match:
        h = int(match.group(1))
        if h < 12:
            h += 12
        return f"{h:02d}:00"

    # "10 da manhã"
    match = re.search(r'(\d{1,2})\s*da manha', texto)
    if match:
        h = int(match.group(1))
        return f"{h:02d}:00"

    return None
