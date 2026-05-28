"""
Cria (ou redefine) um usuario com perfil = 'admin_master'.

Util quando voce perdeu acesso ao admin master (ex: excluiu sem querer)
ou quando vai bootstrap um ambiente novo.

Uso:
  python3 scripts/criar_admin_master.py <email> <senha> [nome]

Exemplo:
  python3 scripts/criar_admin_master.py guilherme@empresa.com MinhaSenh@123 "Guilherme Santos"

Variaveis de ambiente alternativas (se preferir nao passar pela linha):
  ADMIN_EMAIL, ADMIN_SENHA, ADMIN_NOME

Comportamento:
- Se o e-mail JA existe: atualiza senha + perfil + ativa.
- Se NAO existe: cria vinculado a uma empresa interna 'Closer IA Internal'
  (cria a empresa se ela nao existir ainda).

IMPORTANTE: depois de rodar, faca LOGIN com o e-mail+senha — o login vai
te redirecionar direto pra /admin.
"""
import asyncio
import os
import sys
import uuid

import asyncpg
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

EMPRESA_INTERNA_NOME = "Closer IA Internal"


def build_dsn() -> str:
    raw = os.getenv("DATABASE_URL", "")
    if not raw:
        raise RuntimeError("DATABASE_URL nao definida no ambiente")
    if raw.startswith("postgres://"):
        raw = raw.replace("postgres://", "postgresql://", 1)
    if "?" in raw:
        raw = raw.split("?", 1)[0]
    return raw


async def _garantir_empresa_interna(conn) -> int:
    row = await conn.fetchrow(
        "SELECT id FROM empresas WHERE nome = $1 LIMIT 1", EMPRESA_INTERNA_NOME
    )
    if row:
        return int(row["id"])
    novo = await conn.fetchrow(
        """
        INSERT INTO empresas (uuid, nome, nome_fantasia, plano, status, created_at)
        VALUES ($1, $2, 'Admin Master', 'internal', 'active', NOW())
        RETURNING id
        """,
        str(uuid.uuid4()),
        EMPRESA_INTERNA_NOME,
    )
    print(f"📦 Empresa interna criada: {EMPRESA_INTERNA_NOME} (id={novo['id']})")
    return int(novo["id"])


async def criar(email: str, senha: str, nome: str) -> None:
    email_norm = email.strip().lower()
    if "@" not in email_norm:
        print(f"❌ Email invalido: {email}")
        sys.exit(2)
    if len(senha) < 6:
        print("❌ Senha deve ter ao menos 6 caracteres.")
        sys.exit(2)

    senha_hash = pwd_context.hash(senha)
    dsn = build_dsn()
    print("🔌 Conectando ao banco...")
    conn = await asyncpg.connect(dsn)
    try:
        usr = await conn.fetchrow(
            "SELECT id, perfil, empresa_id FROM usuarios WHERE LOWER(email) = $1",
            email_norm,
        )
        if usr:
            await conn.execute(
                """
                UPDATE usuarios
                SET senha_hash = $1, perfil = 'admin_master', ativo = TRUE, nome = $2, updated_at = NOW()
                WHERE id = $3
                """,
                senha_hash, nome.strip(), usr["id"],
            )
            print(f"♻️  Usuario existente atualizado para admin_master: {email_norm} (id={usr['id']})")
        else:
            empresa_id = await _garantir_empresa_interna(conn)
            new_id = await conn.fetchval(
                """
                INSERT INTO usuarios (nome, email, senha_hash, perfil, empresa_id, ativo, created_at)
                VALUES ($1, $2, $3, 'admin_master', $4, TRUE, NOW())
                RETURNING id
                """,
                nome.strip(), email_norm, senha_hash, empresa_id,
            )
            print(f"✅ Admin master criado: {email_norm} (id={new_id}, empresa_id={empresa_id})")

        print("")
        print("🔑 Use estas credenciais pra logar:")
        print(f"   E-mail: {email_norm}")
        print(f"   Senha:  {senha}")
        print("")
        print("➡️  O login vai te redirecionar direto pra /admin.")
    finally:
        await conn.close()


def main() -> None:
    email = sys.argv[1] if len(sys.argv) > 1 else os.getenv("ADMIN_EMAIL")
    senha = sys.argv[2] if len(sys.argv) > 2 else os.getenv("ADMIN_SENHA")
    nome  = sys.argv[3] if len(sys.argv) > 3 else (os.getenv("ADMIN_NOME") or "Admin Master")

    if not email or not senha:
        print("Uso: python3 scripts/criar_admin_master.py <email> <senha> [nome]")
        print("ou exporte ADMIN_EMAIL e ADMIN_SENHA no ambiente.")
        sys.exit(1)

    asyncio.run(criar(email, senha, nome))


if __name__ == "__main__":
    main()
