"""
Promove um usuario existente para perfil = 'admin_master'.

Uso:
  python3 scripts/promover_admin.py <email>
  python3 scripts/promover_admin.py guilhermesilvasantos1206@gmail.com

Tambem aceita via env var EMAIL_ADMIN se nao quiser passar argumento.

IMPORTANTE: depois de promover, o usuario precisa FAZER LOGOUT + LOGIN
para o JWT carregar o novo perfil. Senao continua bloqueado com o token antigo.
"""
import asyncio
import os
import sys
import urllib.parse

import asyncpg


def build_dsn() -> str:
    raw = os.getenv("DATABASE_URL", "")
    if not raw:
        raise RuntimeError("DATABASE_URL nao definida no ambiente")
    if raw.startswith("postgres://"):
        raw = raw.replace("postgres://", "postgresql://", 1)
    # asyncpg nao gosta de querystring no DSN
    if "?" in raw:
        raw = raw.split("?", 1)[0]
    return raw


async def promover(email: str) -> None:
    email_norm = email.strip().lower()
    if "@" not in email_norm:
        print(f"❌ Email invalido: {email}")
        sys.exit(2)

    dsn = build_dsn()
    print(f"🔌 Conectando ao banco...")
    conn = await asyncpg.connect(dsn)
    try:
        usr = await conn.fetchrow(
            "SELECT id, nome, email, perfil, empresa_id FROM usuarios WHERE LOWER(email) = $1",
            email_norm,
        )
        if not usr:
            print(f"❌ Usuario com email '{email_norm}' nao encontrado.")
            print("   Cadastre o usuario primeiro (via /admin ou /register) e tente de novo.")
            sys.exit(3)

        print(f"✅ Encontrado: id={usr['id']} nome='{usr['nome']}' "
              f"perfil_atual='{usr['perfil']}' empresa_id={usr['empresa_id']}")

        if usr["perfil"] == "admin_master":
            print("ℹ️  Ja era admin_master. Nada para fazer.")
            return

        await conn.execute(
            "UPDATE usuarios SET perfil = 'admin_master', ativo = TRUE, updated_at = NOW() WHERE id = $1",
            usr["id"],
        )
        print(f"🎉 Promovido a admin_master: {usr['email']}")
        print("")
        print("⚠️  IMPORTANTE: faca LOGOUT e LOGIN de novo na interface para o")
        print("    JWT carregar o novo perfil. O login vai te redirecionar")
        print("    direto para /admin.")
    finally:
        await conn.close()


def main() -> None:
    email = None
    if len(sys.argv) > 1:
        email = sys.argv[1]
    else:
        email = os.getenv("EMAIL_ADMIN")
    if not email:
        print("Uso: python3 scripts/promover_admin.py <email>")
        print("  ou: EMAIL_ADMIN=foo@bar.com python3 scripts/promover_admin.py")
        sys.exit(1)
    asyncio.run(promover(email))


if __name__ == "__main__":
    main()
