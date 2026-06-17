import time
from typing import Optional
from src.core.config import logger, PROMETHEUS_OK
import redis.asyncio as redis
from src.core.redis_client import redis_client

# Optional prometheus imports, we will inject METRIC_ERROS_TOTAL if available
try:
    from prometheus_client import Counter
    METRIC_ERROS_TOTAL = Counter("saas_erros_total", "Erros críticos por tipo", ["tipo"])
except Exception:
    pass

class CircuitBreaker:
    """
    Circuit Breaker para chamadas ao LLM.
    - CLOSED: operação normal
    - OPEN: muitas falhas → bloqueia por `recovery_timeout` segundos
    - HALF_OPEN: após recovery, testa 1 chamada para ver se voltou

    Todos os estados persistem no Redis — funciona com múltiplos workers.
    """
    def __init__(
        self,
        name: str,
        redis_client: redis.Redis,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        success_threshold: int = 2,
    ):
        self.name             = name
        self.redis_client     = redis_client
        self.failure_threshold = failure_threshold
        self.recovery_timeout  = recovery_timeout
        self.success_threshold = success_threshold

    def _keys(self):
        return (
            f"cb:{self.name}:state",
            f"cb:{self.name}:failures",
            f"cb:{self.name}:successes",
            f"cb:{self.name}:opened_at",
        )

    async def get_state(self) -> str:
        k_state, _, _, k_opened = self._keys()
        state = await self.redis_client.get(k_state) or b"CLOSED"
        state_str = state.decode() if isinstance(state, bytes) else state
        
        if state_str == "OPEN":
            opened_at = await self.redis_client.get(k_opened)
            if opened_at and (time.time() - float(opened_at)) > self.recovery_timeout:
                await self.redis_client.set(k_state, "HALF_OPEN")
                return "HALF_OPEN"
        return state_str

    async def record_success(self):
        k_state, k_fail, k_succ, _ = self._keys()
        state = await self.get_state()
        if state == "HALF_OPEN":
            succs = await self.redis_client.incr(k_succ)
            if succs >= self.success_threshold:
                await self.redis_client.mset({k_state: "CLOSED", k_fail: 0, k_succ: 0})
                await self.redis_client.delete(f"cb:{self.name}:half_open_test")
                logger.info(f"✅ CircuitBreaker [{self.name}] → CLOSED (recuperado)")
        else:
            await self.redis_client.set(k_fail, 0)

    async def record_failure(self):
        k_state, k_fail, k_succ, k_opened = self._keys()
        state = await self.get_state()
        if state == "HALF_OPEN":
            # Voltou a falhar em teste — reabre
            await self.redis_client.mset({
                k_state: "OPEN",
                k_succ:  0,
                k_opened: str(time.time()),
            })
            await self.redis_client.delete(f"cb:{self.name}:half_open_test")
            logger.warning(f"⚡ CircuitBreaker [{self.name}] → OPEN novamente (falha em HALF_OPEN)")
        else:
            fails = await self.redis_client.incr(k_fail)
            ttl = await self.redis_client.ttl(k_fail)
            if ttl in (-1, -2):
                await self.redis_client.expire(k_fail, 120)
            if fails >= self.failure_threshold:
                await self.redis_client.mset({
                    k_state:  "OPEN",
                    k_opened: str(time.time()),
                    k_succ:   0,
                })
                logger.error(
                    f"🔴 CircuitBreaker [{self.name}] → OPEN "
                    f"({fails} falhas em 120s)"
                )
                if PROMETHEUS_OK:
                    try:
                        from prometheus_client import REGISTRY
                        if 'saas_erros_total' in REGISTRY._names_to_collectors:
                            REGISTRY._names_to_collectors['saas_erros_total'].labels(tipo="circuit_breaker_open").inc()
                    except Exception:
                        pass

    async def is_allowed(self) -> bool:
        state = await self.get_state()
        if state == "CLOSED":
            return True
        if state == "HALF_OPEN":
            test_key = f"cb:{self.name}:half_open_test"
            acquired = await self.redis_client.set(test_key, "1", nx=True, ex=30)
            return bool(acquired)
        # OPEN — verifica se recovery_timeout já passou
        return False

# --- DASHBOARD AUTHENTICATION ---
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status
from src.core.config import JWT_SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, AUTH_DISABLED, DEV_ADMIN_EMAIL

# Contexto para hashing de senhas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# auto_error=False: quando AUTH_DISABLED, requisições sem header Authorization
# não podem ser barradas pelo próprio scheme — o tratamento fica na dependência.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=not AUTH_DISABLED)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user_token(token: Optional[str] = Depends(oauth2_scheme)):
    """
    Dependência para validar o token JWT e retornar os dados do payload.
    """
    # Modo sem login (ambiente de teste): trata qualquer requisição como admin_master.
    if AUTH_DISABLED:
        return {
            "sub": DEV_ADMIN_EMAIL,
            "perfil": "admin_master",
            "empresa_id": 1,
            "auth_disabled": True,
        }
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        return payload
    except JWTError:
        raise credentials_exception


# --- API TOKEN POR EMPRESA (uso externo, multi-tenant) ---

import hashlib
import secrets as _secrets
from fastapi import Request

_API_TOKEN_PREFIX = "sk_emp_"
_LAST_USED_TASKS: set = set()  # guarda refs pra background tasks não serem GC'd

def gerar_api_token() -> tuple[str, str, str]:
    """
    Gera um novo API token de empresa.
    Retorna (token_em_claro, sha256_hash, prefixo_visivel).
    O claro só existe nesta chamada — só guardamos o hash no banco.
    """
    raw = _secrets.token_urlsafe(32)
    token = f"{_API_TOKEN_PREFIX}{raw}"
    h = hashlib.sha256(token.encode("utf-8")).hexdigest()
    prefix = token[: len(_API_TOKEN_PREFIX) + 4]  # ex: "sk_emp_abcd"
    return token, h, prefix


def hash_api_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def get_empresa_from_api_token(request: Request) -> dict:
    """
    Dependência alternativa ao JWT: autentica via API token de empresa.
    Espera header `Authorization: Bearer sk_emp_...`.
    Retorna {empresa_id, token_id, nome}.
    Atualiza last_used_at de forma fire-and-forget.
    """
    import src.core.database as _database

    auth = request.headers.get("authorization") or request.headers.get("Authorization") or ""
    if not auth.lower().startswith("bearer "):
        raise HTTPException(
            status_code=401,
            detail="Token de API ausente. Use header Authorization: Bearer sk_emp_...",
        )
    token = auth.split(" ", 1)[1].strip()
    if not token.startswith(_API_TOKEN_PREFIX):
        raise HTTPException(status_code=401, detail="Formato de token inválido")

    if not _database.db_pool:
        raise HTTPException(status_code=503, detail="Banco indisponível")

    h = hash_api_token(token)
    row = await _database.db_pool.fetchrow(
        """
        SELECT t.id, t.empresa_id, t.nome, t.ativo, e.status AS empresa_status
        FROM empresa_api_tokens t
        JOIN empresas e ON e.id = t.empresa_id
        WHERE t.token_hash = $1
        """,
        h,
    )
    if not row or not row["ativo"]:
        raise HTTPException(status_code=401, detail="Token inválido ou revogado")
    if row["empresa_status"] not in (None, "active"):
        raise HTTPException(status_code=403, detail="Empresa inativa")

    # Atualiza last_used_at em background (best-effort).
    # asyncio.create_task pode ser GC'd se não guardarmos a ref; usamos um set global.
    import asyncio as _asyncio
    async def _bump_last_used(tid: int):
        try:
            await _database.db_pool.execute(
                "UPDATE empresa_api_tokens SET last_used_at = NOW() WHERE id = $1",
                tid,
            )
        except Exception as _e:
            logger.debug(f"falha atualizando last_used_at token={tid}: {_e}")
    try:
        _task = _asyncio.create_task(_bump_last_used(row["id"]))
        _LAST_USED_TASKS.add(_task)
        _task.add_done_callback(_LAST_USED_TASKS.discard)
    except Exception:
        pass

    return {
        "empresa_id": int(row["empresa_id"]),
        "token_id": int(row["id"]),
        "nome": row["nome"],
    }

# Instância Global do Circuit Breaker para a IA
cb_llm = CircuitBreaker(
    name="LLM_GLOBAL",
    redis_client=redis_client,
    failure_threshold=5,
    recovery_timeout=45,
    success_threshold=2
)

