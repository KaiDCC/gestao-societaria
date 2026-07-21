"""adiciona responsavel_id e migra dados em alvara

Revision ID: e10d61ec6be9
Revises: 1425b9707eb1
Create Date: 2026-05-15 08:41:28.268929

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e10d61ec6be9'
down_revision = '1425b9707eb1'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Usamos o batch_op para o SQLite aceitar a criação da coluna e da FK através de cópia de tabela
    with op.batch_alter_table('alvara', schema=None) as batch_op:
        batch_op.add_column(sa.Column('responsavel_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_alvara_responsavel_id', 'responsavel', ['responsavel_id'], ['id'])

    # 2. Migração de dados (fora do bloco with)
    op.execute("""
        UPDATE alvara 
        SET responsavel_id = (SELECT id FROM responsavel WHERE responsavel.nome = alvara.responsavel)
        WHERE responsavel_id IS NULL
    """)


def downgrade():
    with op.batch_alter_table('alvara', schema=None) as batch_op:
        batch_op.drop_constraint('fk_alvara_responsavel_id', type_='foreignkey')
        batch_op.drop_column('alvara', 'responsavel_id')
    # ### end Alembic commands ###
