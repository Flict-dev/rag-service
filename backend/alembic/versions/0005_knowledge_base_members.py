"""Add knowledge base members.

Revision ID: 0005_knowledge_base_members
Revises: 0004_knowledge_bases_and_rag
Create Date: 2026-05-11
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0005_knowledge_base_members"
down_revision: str | None = "0004_knowledge_bases_and_rag"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "knowledge_base_members",
        sa.Column("knowledge_base_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("role_id", sa.String(), nullable=False),
        sa.Column("invited_by", sa.String(), nullable=True),
        sa.Column("created_at", sa.String(), nullable=False),
        sa.Column("updated_at", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["invited_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["knowledge_base_id"], ["knowledge_bases.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("knowledge_base_id", "user_id"),
    )
    op.execute(
        """
        INSERT INTO knowledge_base_members (
            knowledge_base_id,
            user_id,
            role_id,
            invited_by,
            created_at,
            updated_at
        )
        SELECT
            id,
            owner_id,
            'admin',
            owner_id,
            created_at,
            updated_at
        FROM knowledge_bases
        """
    )


def downgrade() -> None:
    op.drop_table("knowledge_base_members")
