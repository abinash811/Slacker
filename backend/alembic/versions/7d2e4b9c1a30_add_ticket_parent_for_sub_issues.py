"""add tickets.parent_id for sub-issues

Revision ID: 7d2e4b9c1a30
Revises: 5c1f0e7a9b21
Create Date: 2026-09-29 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7d2e4b9c1a30'
down_revision = '5c1f0e7a9b21'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('tickets', sa.Column('parent_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_tickets_parent_id', 'tickets', 'tickets', ['parent_id'], ['id'])
    op.create_index(op.f('ix_tickets_parent_id'), 'tickets', ['parent_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_tickets_parent_id'), table_name='tickets')
    op.drop_constraint('fk_tickets_parent_id', 'tickets', type_='foreignkey')
    op.drop_column('tickets', 'parent_id')
