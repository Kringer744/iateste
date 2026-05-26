"""add_empresa_api_tokens

Revision ID: z9a0b1c2d3e4
Revises: y8z9a0b1c2d3
Create Date: 2026-05-22

Cria a tabela `empresa_api_tokens`: cada empresa pode gerar 1+ tokens
de API para autenticar chamadas externas ao endpoint /v1/chat sem expor
o JWT de usuário. Guardamos apenas o hash do token (sha256) — o valor
em claro é mostrado uma única vez no momento da criação.
"""
from typing import Sequence, Union
from alembic import op


revision: str = 'z9a0b1c2d3e4'
down_revision: Union[str, Sequence[str], None] = 'y8z9a0b1c2d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS empresa_api_tokens (
            id            SERIAL PRIMARY KEY,
            empresa_id    INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
            nome          VARCHAR(128) NOT NULL,
            token_hash    CHAR(64) NOT NULL,
            token_prefix  VARCHAR(12) NOT NULL,
            ativo         BOOLEAN NOT NULL DEFAULT TRUE,
            created_by    INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
            last_used_at  TIMESTAMPTZ,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS ux_empresa_api_tokens_hash
        ON empresa_api_tokens(token_hash);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_empresa_api_tokens_empresa
        ON empresa_api_tokens(empresa_id) WHERE ativo = TRUE;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS empresa_api_tokens CASCADE;")
