"""add segmento to empresas

Revision ID: w6x7y8z9a0b1
Revises: v5w6x7y8z9a0
Create Date: 2026-04-17

Adiciona a coluna `segmento` na tabela `empresas` para suportar
multi-segmento (barbearia, hotel, ...). Cada empresa pertence a um
segmento e seus usuários só acessam a árvore de rotas correspondente.
"""
from typing import Sequence, Union
from alembic import op


revision: str = 'w6x7y8z9a0b1'
down_revision: Union[str, Sequence[str], None] = 'v5w6x7y8z9a0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE empresas
        ADD COLUMN IF NOT EXISTS segmento VARCHAR(32) NOT NULL DEFAULT 'barbearia'
    """)
    op.execute("""
        ALTER TABLE empresas
        ADD CONSTRAINT empresas_segmento_check
        CHECK (segmento IN ('barbearia', 'hotel'))
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_empresas_segmento ON empresas(segmento)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_empresas_segmento")
    op.execute("ALTER TABLE empresas DROP CONSTRAINT IF EXISTS empresas_segmento_check")
    op.execute("ALTER TABLE empresas DROP COLUMN IF EXISTS segmento")
