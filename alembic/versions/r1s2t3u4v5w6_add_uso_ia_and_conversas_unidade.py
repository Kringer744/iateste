"""add_uso_ia_table_and_conversas_unidade_id

Revision ID: r1s2t3u4v5w6
Revises: q0r1s2t3u4v5
Create Date: 2026-04-02

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'r1s2t3u4v5w6'
down_revision: Union[str, Sequence[str], None] = 'q0r1s2t3u4v5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Cria tabela uso_ia (rastreamento de tokens e custo por chamada à IA)
    op.execute("""
        CREATE TABLE IF NOT EXISTS uso_ia (
            id               SERIAL PRIMARY KEY,
            empresa_id       INTEGER NOT NULL,
            unidade_id       INTEGER,
            conversa_id      INTEGER,
            modelo           VARCHAR(150),
            tokens_prompt    INTEGER DEFAULT 0,
            tokens_completion INTEGER DEFAULT 0,
            custo_usd        NUMERIC(12, 6) DEFAULT 0,
            created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_uso_ia_empresa ON uso_ia (empresa_id, created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_uso_ia_unidade ON uso_ia (unidade_id, created_at)")

    # 2. Adiciona unidade_id em conversas (isolar conversas por unidade)
    op.execute("""
        ALTER TABLE conversas
        ADD COLUMN IF NOT EXISTS unidade_id INTEGER REFERENCES unidades(id) ON DELETE SET NULL
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_conversas_unidade ON conversas (unidade_id)")

    # 3. Adiciona todas_unidades ao faq se não existir (usado em queries de FAQ)
    op.execute("""
        ALTER TABLE faq
        ADD COLUMN IF NOT EXISTS todas_unidades BOOLEAN DEFAULT false
    """)
    op.execute("""
        ALTER TABLE faq
        ADD COLUMN IF NOT EXISTS prioridade INTEGER DEFAULT 0
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_conversas_unidade")
    op.execute("ALTER TABLE conversas DROP COLUMN IF EXISTS unidade_id")
    op.execute("DROP INDEX IF EXISTS idx_uso_ia_unidade")
    op.execute("DROP INDEX IF EXISTS idx_uso_ia_empresa")
    op.execute("DROP TABLE IF EXISTS uso_ia")
    op.execute("ALTER TABLE faq DROP COLUMN IF EXISTS prioridade")
    op.execute("ALTER TABLE faq DROP COLUMN IF EXISTS todas_unidades")
