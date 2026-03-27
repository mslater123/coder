from datetime import datetime

from sqlalchemy import Index

from src.models.base import db


class CodeEditorAgent(db.Model):
    """Model for code editor AI agents connected to GPUs"""

    __tablename__ = "code_editor_agents"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    agent_type = db.Column(db.String(50), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True)
    gpu_id = db.Column(db.Integer, db.ForeignKey("gpus.id"), nullable=True)

    host = db.Column(db.String(255))
    port = db.Column(db.Integer)
    api_key = db.Column(db.String(255))
    endpoint = db.Column(db.String(500))

    model = db.Column(db.String(100), default="codellama")
    max_tokens = db.Column(db.Integer, default=2048)
    temperature = db.Column(db.Numeric(3, 2), default=0.3)
    config = db.Column(db.Text)

    is_active = db.Column(db.Boolean, default=True)
    is_available = db.Column(db.Boolean, default=True)
    last_used = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship("User", backref=db.backref("code_editor_agents", lazy=True))
    gpu = db.relationship("GPU", backref=db.backref("code_editor_agents", lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "agent_type": self.agent_type,
            "user_id": self.user_id,
            "gpu_id": self.gpu_id,
            "host": self.host,
            "port": self.port,
            "endpoint": self.endpoint,
            "model": self.model,
            "max_tokens": self.max_tokens,
            "temperature": float(self.temperature) if self.temperature else None,
            "config": self.config,
            "is_active": self.is_active,
            "is_available": self.is_available,
            "last_used": self.last_used.isoformat() if self.last_used else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "gpu": self.gpu.to_dict() if self.gpu else None,
        }


Index("idx_agent_type", CodeEditorAgent.agent_type)
Index("idx_agent_gpu_id", CodeEditorAgent.gpu_id)
