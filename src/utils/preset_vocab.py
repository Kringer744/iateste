"""
Vocabulario por preset (nicho).

Este modulo centraliza listas de termos que antes estavam hardcoded em
`intent_helpers.py` e outros lugares como "barbeiro", "corte", "navalha".
Futuros nichos (hotel, clinica) registram seus termos aqui em vez de
espalhar regex pelo codigo.

Uso atual: scaffolding. `intent_helpers.py` continua usando sua regex
hardcoded (barbearia) para nao quebrar nada. Quando quisermos tornar o
classificador por empresa, trocamos a regex por `regex_modalidades(preset)`.
"""
from __future__ import annotations

from typing import Dict, Set
import re


# Termos de modalidades/servicos por preset. A key "default" e usada como
# fallback quando o preset e desconhecido — mantemos == "barbearia" para
# preservar o comportamento historico.
PRESET_MODALIDADES: Dict[str, Set[str]] = {
    "barbearia": {
        "corte", "barba", "barbeiro", "navalha", "degrade", "degradê",
        "pigmentacao", "pigmentação", "sobrancelha",
        "servicos", "serviços", "comodidades", "estrutura", "atividades",
    },
    "hotel": {
        "reserva", "reservas", "quarto", "quartos", "suite", "suíte",
        "check-in", "checkin", "check in", "check-out", "checkout",
        "diaria", "diária", "hospedagem", "pernoite",
        "cafe da manha", "café da manhã", "wifi", "piscina",
    },
    "clinica": {
        "consulta", "agendamento", "medico", "médico", "especialidade",
        "exame", "atendimento", "retorno", "encaixe",
    },
}
PRESET_MODALIDADES["default"] = PRESET_MODALIDADES["barbearia"]


def termos_modalidades(preset: str) -> Set[str]:
    """Retorna o conjunto de termos de modalidades para o preset."""
    return PRESET_MODALIDADES.get(preset) or PRESET_MODALIDADES["default"]


def regex_modalidades(preset: str) -> re.Pattern[str]:
    """Compila uma regex de alternancia com todos os termos do preset."""
    termos = termos_modalidades(preset)
    # Escapa e ordena por tamanho desc (match greedy em compostos primeiro).
    pattern = "|".join(re.escape(t) for t in sorted(termos, key=len, reverse=True))
    return re.compile(f"({pattern})", re.IGNORECASE)


def eh_modalidade(texto: str, preset: str = "default") -> bool:
    """True se o texto contem algum termo de modalidade do preset."""
    if not texto:
        return False
    return bool(regex_modalidades(preset).search(texto))
