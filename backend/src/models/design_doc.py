from datetime import datetime

from sqlalchemy import Text

from src.models.base import db


class DesignDoc(db.Model):
    """Model for design documents (Confluence-style documentation)"""

    __tablename__ = "design_docs"

    id = db.Column(db.String(100), primary_key=True)
    title = db.Column(db.String(500), nullable=False)
    content = db.Column(Text, nullable=False, default="")
    project_id = db.Column(db.String(100), nullable=True, index=True)
    tags = db.Column(db.String(500), default="")
    author_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True)
    author = db.Column(db.String(100), nullable=False, default="Unknown")
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = db.relationship("User", backref=db.backref("design_docs", lazy=True))

    def to_dict(self):
        project_name = None
        if self.project_id:
            project_name = self.project_id

        return {
            "id": self.id,
            "title": self.title,
            "content": self.content,
            "projectId": self.project_id,
            "projectName": project_name,
            "tags": self.tags.split(",") if self.tags else [],
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
            "author": self.author,
        }
