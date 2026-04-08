"""add_barbearia_tables

Revision ID: t3u4v5w6x7y8
Revises: s2t3u4v5w6x7
Create Date: 2026-04-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 't3u4v5w6x7y8'
down_revision: Union[str, Sequence[str], None] = 's2t3u4v5w6x7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Barbeiros (profissionais)
    op.create_table(
        'barbeiros',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('empresa_id', sa.Integer, sa.ForeignKey('empresas.id', ondelete='CASCADE'), nullable=False),
        sa.Column('unidade_id', sa.Integer, sa.ForeignKey('unidades.id', ondelete='SET NULL'), nullable=True),
        sa.Column('nome', sa.String(120), nullable=False),
        sa.Column('telefone', sa.String(30), nullable=True),
        sa.Column('especialidades', sa.Text, nullable=True),  # "corte, barba, pigmentação"
        sa.Column('foto_url', sa.String(500), nullable=True),
        sa.Column('ativo', sa.Boolean, server_default='true'),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )

    # Horários disponíveis do barbeiro (agenda semanal recorrente)
    op.create_table(
        'horarios_disponiveis',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('barbeiro_id', sa.Integer, sa.ForeignKey('barbeiros.id', ondelete='CASCADE'), nullable=False),
        sa.Column('empresa_id', sa.Integer, sa.ForeignKey('empresas.id', ondelete='CASCADE'), nullable=False),
        sa.Column('dia_semana', sa.Integer, nullable=False),  # 0=seg, 1=ter, ..., 6=dom
        sa.Column('hora_inicio', sa.Time, nullable=False),     # ex: 09:00
        sa.Column('hora_fim', sa.Time, nullable=False),        # ex: 18:00
        sa.Column('intervalo_minutos', sa.Integer, server_default='30'),  # duração de cada slot
        sa.Column('ativo', sa.Boolean, server_default='true'),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )

    # Bloqueios pontuais (férias, feriados, folga extra)
    op.create_table(
        'bloqueios_agenda',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('barbeiro_id', sa.Integer, sa.ForeignKey('barbeiros.id', ondelete='CASCADE'), nullable=False),
        sa.Column('empresa_id', sa.Integer, sa.ForeignKey('empresas.id', ondelete='CASCADE'), nullable=False),
        sa.Column('data_inicio', sa.DateTime, nullable=False),
        sa.Column('data_fim', sa.DateTime, nullable=False),
        sa.Column('motivo', sa.String(200), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )

    # Serviços oferecidos
    op.create_table(
        'servicos',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('empresa_id', sa.Integer, sa.ForeignKey('empresas.id', ondelete='CASCADE'), nullable=False),
        sa.Column('nome', sa.String(120), nullable=False),       # "Corte masculino"
        sa.Column('descricao', sa.Text, nullable=True),
        sa.Column('duracao_minutos', sa.Integer, nullable=False, server_default='30'),
        sa.Column('preco', sa.Numeric(10, 2), nullable=True),
        sa.Column('ativo', sa.Boolean, server_default='true'),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )

    # Agendamentos
    op.create_table(
        'agendamentos',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('empresa_id', sa.Integer, sa.ForeignKey('empresas.id', ondelete='CASCADE'), nullable=False),
        sa.Column('barbeiro_id', sa.Integer, sa.ForeignKey('barbeiros.id', ondelete='SET NULL'), nullable=True),
        sa.Column('servico_id', sa.Integer, sa.ForeignKey('servicos.id', ondelete='SET NULL'), nullable=True),
        sa.Column('conversation_id', sa.Integer, nullable=True),  # link com conversa WhatsApp
        sa.Column('cliente_nome', sa.String(200), nullable=True),
        sa.Column('cliente_telefone', sa.String(30), nullable=True),
        sa.Column('data_hora', sa.DateTime, nullable=False),       # data+hora do agendamento
        sa.Column('duracao_minutos', sa.Integer, server_default='30'),
        sa.Column('status', sa.String(30), server_default="'confirmado'"),  # confirmado, cancelado, concluido, no_show
        sa.Column('notas', sa.Text, nullable=True),
        sa.Column('lembrete_1d_enviado', sa.Boolean, server_default='false'),
        sa.Column('lembrete_1h_enviado', sa.Boolean, server_default='false'),
        sa.Column('avaliacao_enviada', sa.Boolean, server_default='false'),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )

    # Avaliações pós-atendimento
    op.create_table(
        'avaliacoes',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('agendamento_id', sa.Integer, sa.ForeignKey('agendamentos.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('empresa_id', sa.Integer, sa.ForeignKey('empresas.id', ondelete='CASCADE'), nullable=False),
        sa.Column('barbeiro_id', sa.Integer, sa.ForeignKey('barbeiros.id', ondelete='SET NULL'), nullable=True),
        sa.Column('nota', sa.Integer, nullable=False),             # 1-5 estrelas
        sa.Column('comentario', sa.Text, nullable=True),
        sa.Column('cliente_telefone', sa.String(30), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )

    # Índices para performance
    op.create_index('ix_agendamentos_data_hora', 'agendamentos', ['data_hora'])
    op.create_index('ix_agendamentos_status', 'agendamentos', ['status'])
    op.create_index('ix_agendamentos_barbeiro_data', 'agendamentos', ['barbeiro_id', 'data_hora'])
    op.create_index('ix_agendamentos_empresa_status', 'agendamentos', ['empresa_id', 'status'])
    op.create_index('ix_horarios_barbeiro', 'horarios_disponiveis', ['barbeiro_id', 'dia_semana'])
    op.create_index('ix_avaliacoes_barbeiro', 'avaliacoes', ['barbeiro_id'])


def downgrade() -> None:
    op.drop_index('ix_avaliacoes_barbeiro')
    op.drop_index('ix_horarios_barbeiro')
    op.drop_index('ix_agendamentos_empresa_status')
    op.drop_index('ix_agendamentos_barbeiro_data')
    op.drop_index('ix_agendamentos_status')
    op.drop_index('ix_agendamentos_data_hora')
    op.drop_table('avaliacoes')
    op.drop_table('agendamentos')
    op.drop_table('servicos')
    op.drop_table('bloqueios_agenda')
    op.drop_table('horarios_disponiveis')
    op.drop_table('barbeiros')
