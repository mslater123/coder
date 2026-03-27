from datetime import datetime

from sqlalchemy import Index

from src.models.base import db


class GPU(db.Model):
    """Model for tracking GPU devices"""

    __tablename__ = "gpus"

    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    vendor = db.Column(db.String(50))
    memory_total = db.Column(db.BigInteger)
    memory_used = db.Column(db.BigInteger, default=0)
    memory_free = db.Column(db.BigInteger)
    compute_capability = db.Column(db.String(20))
    driver_version = db.Column(db.String(50))
    temperature = db.Column(db.Integer)
    power_usage = db.Column(db.Numeric(10, 2))
    utilization = db.Column(db.Numeric(5, 2))
    is_available = db.Column(db.Boolean, default=True)
    current_task = db.Column(db.String(50))
    host_system = db.Column(db.String(200))
    last_seen = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "device_id": self.device_id,
            "name": self.name,
            "vendor": self.vendor,
            "memory_total": self.memory_total,
            "memory_used": self.memory_used,
            "memory_free": self.memory_free,
            "compute_capability": self.compute_capability,
            "driver_version": self.driver_version,
            "temperature": self.temperature,
            "power_usage": float(self.power_usage) if self.power_usage else None,
            "utilization": float(self.utilization) if self.utilization else None,
            "is_available": self.is_available,
            "current_task": self.current_task,
            "host_system": self.host_system,
            "last_seen": self.last_seen.isoformat() if self.last_seen else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class GPUTask(db.Model):
    """Model for tracking GPU tasks"""

    __tablename__ = "gpu_tasks"

    id = db.Column(db.Integer, primary_key=True)
    gpu_id = db.Column(db.Integer, db.ForeignKey("gpus.id"), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True)
    task_type = db.Column(db.String(50), nullable=False)
    task_name = db.Column(db.String(200))
    status = db.Column(db.String(50), default="running")
    start_time = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    end_time = db.Column(db.DateTime)
    config = db.Column(db.Text)
    progress = db.Column(db.Numeric(5, 2), default=0)
    error_message = db.Column(db.Text)
    result = db.Column(db.Text)

    gpu = db.relationship("GPU", backref=db.backref("tasks", lazy=True))
    user = db.relationship("User", backref=db.backref("gpu_tasks", lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "gpu_id": self.gpu_id,
            "user_id": self.user_id,
            "task_type": self.task_type,
            "task_name": self.task_name,
            "status": self.status,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "config": self.config,
            "progress": float(self.progress) if self.progress else None,
            "error_message": self.error_message,
            "result": self.result,
        }


Index("idx_gpu_device_id", GPU.device_id)
Index("idx_gpu_task_gpu_id", GPUTask.gpu_id)
Index("idx_gpu_task_status", GPUTask.status)
