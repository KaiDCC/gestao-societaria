"""adiciona tipo endereco e complemento aos contratos

Revision ID: c1388898042e
Revises: e9479de0c560
Create Date: 2026-06-05 11:29:51.810917

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c1388898042e'
down_revision = 'e9479de0c560'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "tipo_endereco_dominio",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("codigo", sa.Integer(), nullable=False),
        sa.Column("descricao", sa.String(length=50), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("codigo")
    )

    op.add_column(
        "contrato",
        sa.Column("tipo_endereco_codigo", sa.Integer(), nullable=True)
    )

    op.add_column(
        "contrato",
        sa.Column("tipo_endereco", sa.String(length=50), nullable=True)
    )

    op.add_column(
        "contrato",
        sa.Column("complemento", sa.String(length=200), nullable=True)
    )

    tipo_endereco_table = sa.table(
        "tipo_endereco_dominio",
        sa.column("codigo", sa.Integer),
        sa.column("descricao", sa.String),
    )

    op.bulk_insert(
        tipo_endereco_table,
        [
            {"codigo": 2, "descricao": "Alameda"},
            {"codigo": 4, "descricao": "Avenida"},
            {"codigo": 10, "descricao": "Distrito"},
            {"codigo": 13, "descricao": "Estrada"},
            {"codigo": 15, "descricao": "Fazenda"},
            {"codigo": 21, "descricao": "Largo"},
            {"codigo": 28, "descricao": "Praça"},
            {"codigo": 29, "descricao": "Quadra"},
            {"codigo": 32, "descricao": "Rodovia"},
            {"codigo": 33, "descricao": "Rua"},
            {"codigo": 36, "descricao": "Travessa"},
            {"codigo": 41, "descricao": "Via"},
            {"codigo": 46, "descricao": "Alameda"},
            {"codigo": 47, "descricao": "Área"},
            {"codigo": 48, "descricao": "Avenida"},
            {"codigo": 50, "descricao": "Chácara"},
            {"codigo": 57, "descricao": "Estrada"},
            {"codigo": 72, "descricao": "Praça"},
            {"codigo": 73, "descricao": "Quadra"},
            {"codigo": 76, "descricao": "Rodovia"},
            {"codigo": 77, "descricao": "Rua"},
            {"codigo": 78, "descricao": "Setor"},
            {"codigo": 80, "descricao": "Travessa"},
            {"codigo": 85, "descricao": "Via"},
            {"codigo": 99, "descricao": "Outro"},
        ]
    )


def downgrade():
    op.drop_column("contrato", "complemento")
    op.drop_column("contrato", "tipo_endereco")
    op.drop_column("contrato", "tipo_endereco_codigo")
    op.drop_table("tipo_endereco_dominio")