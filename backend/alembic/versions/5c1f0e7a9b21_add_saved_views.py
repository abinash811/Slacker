"""add saved_views

Revision ID: 5c1f0e7a9b21
Revises: 8943e55243a4
Create Date: 2026-09-28 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5c1f0e7a9b21'
down_revision = '8943e55243a4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('saved_views',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=80), nullable=False),
    sa.Column('filters', sa.JSON(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'name', name='uq_saved_view_user_name')
    )
    op.create_index(op.f('ix_saved_views_user_id'), 'saved_views', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_saved_views_user_id'), table_name='saved_views')
    op.drop_table('saved_views')
