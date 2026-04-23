"""add_quartos

Revision ID: y8z9a0b1c2d3
Revises: x7y8z9a0b1c2
Create Date: 2026-04-23

Cria tabela `quartos` para hotelaria. A IA le essas linhas no prompt
quando a feature 'quartos' esta habilitada para a empresa, permitindo
responder sobre tipos, precos, capacidade e comodidades.
"""
from typing import Sequence, Union
from alembic import op


revision: str = 'y8z9a0b1c2d3'
down_revision: Union[str, Sequence[str], None] = 'x7y8z9a0b1c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS quartos (
            id            SERIAL PRIMARY KEY,
            empresa_id    INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
            nome          VARCHAR(128) NOT NULL,
            descricao     TEXT,
            preco         NUMERIC(10, 2),
            capacidade    INTEGER NOT NULL DEFAULT 2,
            comodidades   TEXT,
            ativo         BOOLEAN NOT NULL DEFAULT TRUE,
            ordem         INTEGER NOT NULL DEFAULT 0,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_quartos_empresa_ativo
        ON quartos(empresa_id) WHERE ativo = TRUE;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS quartos;")
