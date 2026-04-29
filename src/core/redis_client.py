import time
import json
from typing import Any
import redis.asyncio as redis
from src.core.config import REDIS_URL, logger

# Inicialização global do redis_client
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

# Memória local para fallback em caso de falha no Redis
_LOCAL_REDIS_FALLBACK: dict[str, tuple[float, str]] = {}
_FALLBACK_MAX_SIZE = 1000
_FALLBACK_OP_COUNT = 0
_FALLBACK_GC_INTERVAL = 100  # cleanup a cada N operações


def _fallback_gc():
    """Remove itens expirados do fallback local."""
    global _FALLBACK_OP_COUNT
    _FALLBACK_OP_COUNT += 1
    if _FALLBACK_OP_COUNT < _FALLBACK_GC_INTERVAL:
        return
    _FALLBACK_OP_COUNT = 0
    now = time.time()
    expired = [k for k, (exp, _) in _LOCAL_REDIS_FALLBACK.items() if exp < now]
    for k in expired:
        _LOCAL_REDIS_FALLBACK.pop(k, None)
    if expired:
        logger.debug(f"🧹 Redis fallback GC: {len(expired)} itens expirados removidos")


def _fallback_evict_if_full():
    """Evicta itens mais antigos se ultrapassar o limite."""
    while len(_LOCAL_REDIS_FALLBACK) >= _FALLBACK_MAX_SIZE:
        oldest_key = min(_LOCAL_REDIS_FALLBACK, key=lambda k: _LOCAL_REDIS_FALLBACK[k][0])
        _LOCAL_REDIS_FALLBACK.pop(oldest_key, None)


async def redis_get_json(key: str, default=None):
    _fallback_gc()
    try:
        raw = await redis_client.get(key)
    except Exception as e:
        logger.warning(f"⚠️ Redis GET falhou ({type(e).__name__}: {e}), usando fallback local")
        raw = None

    if raw is not None:
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError) as e:
            logger.warning(f"⚠️ Redis JSON parse falhou para key={key}: {e}")
            return default

    # Fallback local em memória quando Redis estiver indisponível
    now = time.time()
    item = _LOCAL_REDIS_FALLBACK.get(key)
    if item:
        exp_ts, raw_local = item
        if exp_ts >= now:
            try:
                return json.loads(raw_local)
            except (json.JSONDecodeError, TypeError):
                return default
        _LOCAL_REDIS_FALLBACK.pop(key, None)
    return default


async def redis_set_json(key: str, value: Any, ttl: int):
    payload = json.dumps(value, default=str)
    try:
        await redis_client.setex(key, ttl, payload)
    except Exception as e:
        logger.warning(f"⚠️ Redis SET falhou ({type(e).__name__}: {e}), salvando em fallback local")
        _fallback_evict_if_full()
        _LOCAL_REDIS_FALLBACK[key] = (time.time() + max(1, ttl), payload)


async def invalidar_cache_ia_por_slug(slug: str, empresa_id: int) -> int:
    """Apaga todos os caches de resposta da IA para um slug de uma empresa.

    Necessário sempre que dados que afetam o prompt são alterados (unidade,
    personalidade IA, FAQ, planos, etc). Sem isso a IA continua respondendo
    com base em respostas antigas em cache (e.g. nome do hotel antigo).

    MULTI-TENANT: TODAS as chaves DEVEM incluir empresa_id pra evitar leak entre
    clientes. Padroes apagados (formato canonico atual + legado):
      - cache:intent:{empresa_id}:{slug}:*  (canonico)
      - cache:ia:{empresa_id}:{slug}:*      (canonico)
      - semcache:{empresa_id}:{slug}:*      (canonico)
      - cache:intent:{slug}:*               (legado, sem empresa_id)
      - cache:ia:{slug}:*                   (legado)
      - semcache:{slug}:*                   (legado)

    Os patterns legado existem porque ate ha pouco a chave nao tinha
    empresa_id no namespace. Apagar ambos garante limpeza completa
    durante a migracao.

    Retorna a quantidade total de chaves apagadas.
    """
    if not slug or not empresa_id:
        return 0
    total = 0
    try:
        patterns = [
            # Formato canonico (com empresa_id) — PRIMARY
            f"cache:intent:{empresa_id}:{slug}:*",
            f"cache:ia:{empresa_id}:{slug}:*",
            f"semcache:{empresa_id}:{slug}:*",
            # Formato legado (sem empresa_id) — limpeza durante migracao
            f"cache:intent:{slug}:*",
            f"cache:ia:{slug}:*",
            f"semcache:{slug}:*",
        ]
        for pattern in patterns:
            cursor = 0
            while True:
                cursor, keys = await redis_client.scan(cursor, match=pattern, count=200)
                if keys:
                    total += await redis_client.delete(*keys)
                if cursor == 0:
                    break
        if total:
            logger.info(
                f"🧹 invalidar_cache_ia_por_slug(empresa={empresa_id} slug={slug}) "
                f"apagou {total} chaves"
            )
    except Exception as e:
        logger.warning(f"Falha ao invalidar cache IA por slug={slug} empresa={empresa_id}: {e}")
    return total


async def invalidar_cache_ia_por_empresa(empresa_id: int) -> int:
    """Apaga caches de IA de TODAS as unidades de uma empresa.

    Usar quando a alteração afeta o prompt de toda a empresa (e.g.
    personalidade IA, regras globais).
    """
    if not empresa_id:
        return 0
    try:
        # Import tardio pra evitar ciclo: db_queries -> redis_client
        import src.core.database as _db
        if not _db.db_pool:
            return 0
        rows = await _db.db_pool.fetch(
            "SELECT slug FROM unidades WHERE empresa_id = $1 AND ativa = TRUE",
            empresa_id,
        )
        total = 0
        for r in rows:
            total += await invalidar_cache_ia_por_slug(r["slug"], empresa_id)
        return total
    except Exception as e:
        logger.warning(f"Falha ao invalidar cache IA por empresa={empresa_id}: {e}")
        return 0
