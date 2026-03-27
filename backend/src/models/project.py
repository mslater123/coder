import json
import uuid
from datetime import datetime

from sqlalchemy import Text

from src.models.base import db

project_users = db.Table(
    "project_users",
    db.Column("project_id", db.String(36), db.ForeignKey("projects.id"), primary_key=True),
    db.Column("user_id", db.String(36), db.ForeignKey("users.id"), primary_key=True),
    db.Column("role", db.String(50), default="member"),
    db.Column("joined_at", db.DateTime, default=datetime.utcnow),
)


class Project(db.Model):
    """Model for projects - projects have UUIDs and users are attached to them"""

    __tablename__ = "projects"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(Text, nullable=True)
    settings = db.Column(Text)
    created_by = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    users = db.relationship("User", secondary=project_users, backref=db.backref("projects", lazy="dynamic"))
    creator = db.relationship("User", foreign_keys=[created_by], backref=db.backref("created_projects", lazy=True))

    def to_dict(self):
        settings_dict = {}
        if self.settings:
            try:
                settings_dict = json.loads(self.settings)
            except Exception:
                pass
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "settings": settings_dict,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "user_ids": [user.id for user in self.users],
        }
