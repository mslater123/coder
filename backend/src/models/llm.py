from datetime import datetime

from sqlalchemy import Index

from src.models.base import db


class LLMQuery(db.Model):
    """Model for tracking LLM queries and responses"""

    __tablename__ = "llm_queries"

    id = db.Column(db.Integer, primary_key=True)
    query_id = db.Column(db.String(100), unique=True, nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True)
    prompt = db.Column(db.Text, nullable=False)
    model = db.Column(db.String(100), nullable=False)
    response = db.Column(db.Text)
    gpu_id = db.Column(db.Integer, db.ForeignKey("gpus.id"), nullable=True)
    task_id = db.Column(db.Integer, db.ForeignKey("gpu_tasks.id"), nullable=True)
    status = db.Column(db.String(50), default="pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    completed_at = db.Column(db.DateTime)

    user = db.relationship("User", backref=db.backref("llm_queries", lazy=True))
    gpu = db.relationship("GPU", backref=db.backref("llm_queries", lazy=True))
    task = db.relationship("GPUTask", backref=db.backref("llm_query", uselist=False))

    def to_dict(self):
        return {
            "id": self.id,
            "query_id": self.query_id,
            "user_id": self.user_id,
            "prompt": self.prompt,
            "model": self.model,
            "response": self.response,
            "gpu_id": self.gpu_id,
            "task_id": self.task_id,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


Index("idx_llm_query_id", LLMQuery.query_id)
