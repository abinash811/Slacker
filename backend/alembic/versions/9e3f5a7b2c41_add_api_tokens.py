"""add api_tokens for MCP access

Revision ID: 9e3f5a7b2c41
Revises: 7d2e4b9c1a30
Create Date: 2026-09-29 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9e3f5a7b2c41'
down_revision = '7d2e4b9c1a30'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('api_tokens',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=80), nullable=False),
    sa.Column('token_hash', sa.String(length=64), nullable=False),
    sa.Column('prefix', sa.String(length=16), nullable=False),
    sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('token_hash')
    )
    op.create_index(op.f('ix_api_tokens_user_id'), 'api_tokens', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_api_tokens_user_id'), table_name='api_tokens')
    op.drop_table('api_tokens')
