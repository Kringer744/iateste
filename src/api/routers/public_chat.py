"""
Endpoint publico /v1/chat — autenticado por API Token de empresa.

Garantias de isolamento multi-tenant:
- Autenticacao SO via API token (`sk_emp_*`). Nao aceita JWT de usuario.
- empresa_id vem EXCLUSIVAMENTE do token validado em get_empresa_from_api_token.
- Nada vindo do body pode mudar a empresa de origem.
- Personalidade, FAQ, unidades e planos sao carregados com WHERE empresa_id = $1.
"""
import asyncio
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from src.core.config import logger
from src.core.redis_client import redis_client
from src.core.security import get_empresa_from_api_token

router = APIRouter(prefix="/v1", tags=["public-chat"])

# Rate limit: 30 chamadas/min por token de API.
_RL_LIMIT = 30
_RL_WINDOW = 60  # segundos


async def _rate_limit(token_id: int) -> None:
    """Bloqueia com 429 se token passar de _RL_LIMIT em _RL_WINDOW segundos."""
    key = f"v1chat:rl:{token_id}"
    try:
        count = await redis_client.incr(key)
        if count == 1:
            await redis_client.expire(key, _RL_WINDOW)
        if count > _RL_LIMIT:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit excedido ({_RL_LIMIT}/min). Aguarde alguns segundos.",
            )
    except HTTPException:
        raise
    except Exception as e:
        # Redis indisponivel: nao bloqueia (fail-open) mas loga.
        logger.warning(f"/v1/chat rate limit: redis indisponivel ({e}); seguindo sem RL")


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(default_factory=list, max_length=40)
    conversation_summary: Optional[str] = None
    personality_id: Optional[int] = None  # opcional; se omitido usa a ativa da empresa


class ChatResponse(BaseModel):
    reply: str
    model: str
    nome_ia: str
    empresa_id: int


@router.post("/chat", response_model=ChatResponse)
async def chat_publico(
    body: ChatRequest,
    auth: dict = Depends(get_empresa_from_api_token),
):
    """
    Endpoint publico para integrar IA da empresa em sistemas externos
    (n8n, automacoes, websites). Cada API token responde EXCLUSIVAMENTE
    com dados/personalidade da sua empresa.
    """
    from src.services.llm_service import cliente_ia
    from src.api.routers.management import (
        _load_playground_context,
        _build_playground_prompt,
    )

    if not cliente_ia:
        raise HTTPException(status_code=503, detail="Servico de IA nao configurado")

    empresa_id = int(auth["empresa_id"])
    await _rate_limit(int(auth["token_id"]))

    # Carrega contexto SO da empresa do token. Se personality_id for
    # passado e nao pertencer a essa empresa, _load_playground_context
    # devolve 404 (WHERE empresa_id = $2). Nao ha como vazar.
    try:
        p, model, temperature, max_tokens, faq_text, unidades, planos = await _load_playground_context(
            body.personality_id, empresa_id
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"/v1/chat: erro carregando contexto empresa={empresa_id}: {e}")
        raise HTTPException(status_code=500, detail="Falha ao carregar configuracao da IA")

    system_prompt = _build_playground_prompt(
        p, faq_text=faq_text, unidades=unidades, planos=planos
    )
    if body.conversation_summary and body.conversation_summary.strip():
        system_prompt += (
            f"\n\n[CONTEXTO DA CONVERSA ANTERIOR]\n"
            f"Resumo do que foi discutido ate agora:\n{body.conversation_summary}"
        )

    msgs: list[dict] = [{"role": "system", "content": system_prompt}]
    # Ignora mensagens system enviadas pelo cliente — system é nosso.
    recent = [m for m in body.messages if m.role in ("user", "assistant")]
    if not recent:
        raise HTTPException(status_code=400, detail="messages: forneca ao menos uma mensagem user")
    recent = recent[-20:]
    for m in recent:
        msgs.append({"role": m.role, "content": m.content})

    nome_ia = p.get("nome_ia") or "Assistente"

    try:
        response = await asyncio.wait_for(
            cliente_ia.chat.completions.create(
                model=model,
                messages=msgs,
                temperature=temperature,
                max_tokens=max_tokens,
            ),
            timeout=30,
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="IA demorou demais para responder")
    except Exception as e:
        logger.error(f"/v1/chat LLM error empresa={empresa_id}: {e}")
        raise HTTPException(status_code=502, detail=f"Erro IA: {str(e)[:200]}")

    reply = (response.choices[0].message.content or "") if response.choices else ""

    logger.info(
        f"/v1/chat OK empresa={empresa_id} token_id={auth['token_id']} "
        f"msgs={len(recent)} model={model}"
    )

    return ChatResponse(
        reply=reply,
        model=model,
        nome_ia=nome_ia,
        empresa_id=empresa_id,
    )
