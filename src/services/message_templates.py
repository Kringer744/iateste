"""
Templates padrao das mensagens automaticas do WhatsApp por preset (nicho).

Sao aplicados em `personalidade_ia` quando o admin clica em um preset
(barbearia / hotel / clinica) no /admin/features. Os campos espelham
exatamente os usados no frontend (frontend/src/app/dashboard/mensagens/page.tsx).

As VARIAVEIS interpoladas no momento do envio ({dia}, {data}, {horario},
{barbeiro}, {servico}, {estrelas}) sao as mesmas em todos os presets — o
backend de envio nao sabe nada sobre nicho. Quem traduz "barbeiro" para o
contexto do hotel/clinica e o TEXTO escolhido pelo nicho.
"""

# Campos da personalidade_ia que armazenam os templates editaveis
MESSAGE_FIELDS = (
    "msg_confirmacao_agendamento",
    "msg_lembrete_1d",
    "msg_lembrete_1h",
    "msg_avaliacao",
    "msg_avaliacao_obrigado",
)

MESSAGE_TEMPLATES_BY_PRESET: dict[str, dict[str, str]] = {
    "barbearia": {
        "msg_confirmacao_agendamento": (
            "✅ *Agendamento Confirmado!*\n\n"
            "📅 {dia}, {data}\n"
            "🕐 {horario}\n"
            "💈 {barbeiro}\n"
            "✂️ {servico}\n\n"
            "Te esperamos! Se precisar remarcar ou cancelar, é só me avisar 😊"
        ),
        "msg_lembrete_1d": (
            "👋 Oi! Lembrando que *amanhã* você tem horário marcado:\n\n"
            "📅 {dia}, {data} às {horario}\n"
            "💈 Com {barbeiro}\n\n"
            "Você confirma? Responde *sim* ou *não* 😊"
        ),
        "msg_lembrete_1h": (
            "⏰ Falta *1 hora* pro seu horário:\n\n"
            "📅 {dia}, {data} às {horario}\n"
            "💈 Com {barbeiro}\n\n"
            "Você confirma? Responde *sim* ou *não* 😊"
        ),
        "msg_avaliacao": (
            "✂️ Corte finalizado! Como foi seu atendimento com *{barbeiro}*?\n\n"
            "Dá uma nota de *1 a 5* ⭐\n\n"
            "1 ⭐ - Ruim\n"
            "2 ⭐⭐ - Regular\n"
            "3 ⭐⭐⭐ - Bom\n"
            "4 ⭐⭐⭐⭐ - Muito bom\n"
            "5 ⭐⭐⭐⭐⭐ - Excelente\n\n"
            "Só mandar o número! 😊"
        ),
        "msg_avaliacao_obrigado": (
            "Obrigado pela avaliação! {estrelas}\n\n"
            "Sua opinião é muito importante pra gente! 😊"
        ),
    },

    "hotel": {
        "msg_confirmacao_agendamento": (
            "✅ *Reserva Confirmada!*\n\n"
            "📅 Check-in: {dia}, {data}\n"
            "🕐 A partir das {horario}\n"
            "🛏️ {servico}\n"
            "👤 Atendimento: {barbeiro}\n\n"
            "Mal podemos esperar pra te receber! Qualquer dúvida, é só chamar 😊"
        ),
        "msg_lembrete_1d": (
            "👋 Oi! Lembrando que *amanhã* é seu check-in conosco:\n\n"
            "📅 {dia}, {data} a partir das {horario}\n"
            "🛎️ {barbeiro} já vai te recepcionar\n\n"
            "Precisa de algo extra antes da chegada? Só me avisar 😊"
        ),
        "msg_lembrete_1h": (
            "🛬 Falta *1 hora* pro seu check-in:\n\n"
            "📅 {dia}, {data} às {horario}\n"
            "🛎️ {barbeiro} te aguarda na recepção\n\n"
            "Boa viagem! Qualquer coisa, é só chamar 😊"
        ),
        "msg_avaliacao": (
            "🛏️ Esperamos que tenha curtido sua estadia! Como foi seu atendimento com *{barbeiro}*?\n\n"
            "Dá uma nota de *1 a 5* ⭐\n\n"
            "1 ⭐ - Ruim\n"
            "2 ⭐⭐ - Regular\n"
            "3 ⭐⭐⭐ - Bom\n"
            "4 ⭐⭐⭐⭐ - Muito bom\n"
            "5 ⭐⭐⭐⭐⭐ - Excelente\n\n"
            "Só mandar o número! 😊"
        ),
        "msg_avaliacao_obrigado": (
            "Obrigado pela avaliação! {estrelas}\n\n"
            "Volta sempre! Sua opinião nos ajuda a melhorar 😊"
        ),
    },

    "clinica": {
        "msg_confirmacao_agendamento": (
            "✅ *Consulta Confirmada!*\n\n"
            "📅 {dia}, {data}\n"
            "🕐 {horario}\n"
            "👨‍⚕️ {barbeiro}\n"
            "🩺 {servico}\n\n"
            "Chegue 10 minutos antes. Pra remarcar ou cancelar, é só me avisar 😊"
        ),
        "msg_lembrete_1d": (
            "👋 Oi! Lembrando que *amanhã* você tem consulta marcada:\n\n"
            "📅 {dia}, {data} às {horario}\n"
            "👨‍⚕️ Com {barbeiro}\n\n"
            "Você confirma a presença? Responde *sim* ou *não* 😊"
        ),
        "msg_lembrete_1h": (
            "⏰ Falta *1 hora* pra sua consulta:\n\n"
            "📅 {dia}, {data} às {horario}\n"
            "👨‍⚕️ Com {barbeiro}\n\n"
            "Nos vemos em breve! 😊"
        ),
        "msg_avaliacao": (
            "🩺 Consulta finalizada! Como foi seu atendimento com *{barbeiro}*?\n\n"
            "Dá uma nota de *1 a 5* ⭐\n\n"
            "1 ⭐ - Ruim\n"
            "2 ⭐⭐ - Regular\n"
            "3 ⭐⭐⭐ - Bom\n"
            "4 ⭐⭐⭐⭐ - Muito bom\n"
            "5 ⭐⭐⭐⭐⭐ - Excelente\n\n"
            "Só mandar o número! 😊"
        ),
        "msg_avaliacao_obrigado": (
            "Obrigado pela avaliação! {estrelas}\n\n"
            "Sua opinião é muito importante pra gente! 😊"
        ),
    },
}


def get_templates_for_preset(preset: str) -> dict[str, str]:
    """Devolve o dict completo de templates para o preset, ou o de barbearia
    como fallback se preset desconhecido."""
    return MESSAGE_TEMPLATES_BY_PRESET.get(
        preset, MESSAGE_TEMPLATES_BY_PRESET["barbearia"]
    )


async def aplicar_templates_no_personalidade(empresa_id: int, preset: str) -> None:
    """
    Escreve os 5 templates de mensagem do preset na linha `personalidade_ia`
    da empresa. Se a empresa nao tiver personalidade ainda, cria uma minima
    so com os campos msg_*. Se ja tiver, faz UPDATE sobrescrevendo os msg_*
    (mantendo o resto intacto).
    """
    import src.core.database as _database
    if not _database.db_pool:
        return

    templates = get_templates_for_preset(preset)

    async with _database.db_pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id FROM personalidade_ia WHERE empresa_id = $1 ORDER BY updated_at DESC LIMIT 1",
            empresa_id,
        )
        if row:
            # Update apenas os msg_* — mantém personalidade, prompt, modelo intactos
            await conn.execute(
                f"""
                UPDATE personalidade_ia
                SET msg_confirmacao_agendamento = $2,
                    msg_lembrete_1d             = $3,
                    msg_lembrete_1h             = $4,
                    msg_avaliacao               = $5,
                    msg_avaliacao_obrigado      = $6,
                    updated_at                  = NOW()
                WHERE id = $1
                """,
                row["id"],
                templates["msg_confirmacao_agendamento"],
                templates["msg_lembrete_1d"],
                templates["msg_lembrete_1h"],
                templates["msg_avaliacao"],
                templates["msg_avaliacao_obrigado"],
            )
        else:
            # Cria personalidade minima com so os templates (ativo=false pra nao
            # ligar a IA sem o operador revisar primeiro o resto)
            await conn.execute(
                """
                INSERT INTO personalidade_ia (
                    empresa_id, ativo,
                    msg_confirmacao_agendamento, msg_lembrete_1d, msg_lembrete_1h,
                    msg_avaliacao, msg_avaliacao_obrigado,
                    created_at, updated_at
                ) VALUES ($1, FALSE, $2, $3, $4, $5, $6, NOW(), NOW())
                """,
                empresa_id,
                templates["msg_confirmacao_agendamento"],
                templates["msg_lembrete_1d"],
                templates["msg_lembrete_1h"],
                templates["msg_avaliacao"],
                templates["msg_avaliacao_obrigado"],
            )
