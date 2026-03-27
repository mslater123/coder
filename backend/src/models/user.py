import uuid
from datetime import datetime

from sqlalchemy import Index
from werkzeug.security import check_password_hash, generate_password_hash

from src.models.base import db


class User(db.Model):
    """Model for user accounts"""

    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(200), nullable=True)
    address = db.Column(db.Text, nullable=True)
    profile_image = db.Column(db.String(500), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_login = db.Column(db.DateTime)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        try:
            return {
                "id": self.id,
                "username": self.username,
                "email": getattr(self, "email", None),
                "name": getattr(self, "name", None),
                "address": getattr(self, "address", None),
                "profile_image": getattr(self, "profile_image", None),
                "is_active": self.is_active,
                "is_admin": self.is_admin,
                "created_at": self.created_at.isoformat() if self.created_at else None,
                "last_login": self.last_login.isoformat() if self.last_login else None,
            }
        except Exception as e:
            import traceback

            print(f"Error in User.to_dict(): {e}")
            traceback.print_exc()
            return {
                "id": getattr(self, "id", None),
                "username": getattr(self, "username", ""),
                "email": getattr(self, "email", None),
                "name": getattr(self, "name", None),
                "address": getattr(self, "address", None),
                "profile_image": getattr(self, "profile_image", None),
                "is_active": getattr(self, "is_active", True),
                "is_admin": getattr(self, "is_admin", False),
                "created_at": self.created_at.isoformat()
                if hasattr(self, "created_at") and self.created_at
                else None,
                "last_login": self.last_login.isoformat()
                if hasattr(self, "last_login") and self.last_login
                else None,
            }


class UserSettings(db.Model):
    """Model for storing user preferences and settings"""

    __tablename__ = "user_settings"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, unique=True)

    editor_theme = db.Column(db.String(50), default="vs-dark")
    editor_font_size = db.Column(db.Integer, default=14)
    editor_font_family = db.Column(db.String(100), default='Consolas, "Courier New", monospace')
    editor_tab_size = db.Column(db.Integer, default=2)
    editor_word_wrap = db.Column(db.String(20), default="on")
    editor_minimap = db.Column(db.Boolean, default=True)
    editor_line_numbers = db.Column(db.String(20), default="on")

    ai_default_model = db.Column(db.String(100), default="codellama")
    ai_temperature = db.Column(db.Numeric(3, 2), default=0.3)
    ai_max_tokens = db.Column(db.Integer, default=2048)
    ai_auto_apply = db.Column(db.Boolean, default=True)
    selected_agent_id = db.Column(db.Integer, nullable=True)

    git_use_git = db.Column(db.Boolean, default=False)
    git_repo_path = db.Column(db.String(500))
    git_repo_url = db.Column(db.String(500))
    git_auto_commit = db.Column(db.Boolean, default=False)

    use_file_system = db.Column(db.Boolean, default=True)

    additional_settings = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship("User", backref=db.backref("settings", uselist=False))

    def to_dict(self):
        import json

        return {
            "id": self.id,
            "user_id": self.user_id,
            "editor_theme": self.editor_theme,
            "editor_font_size": self.editor_font_size,
            "editor_font_family": self.editor_font_family,
            "editor_tab_size": self.editor_tab_size,
            "editor_word_wrap": self.editor_word_wrap,
            "editor_minimap": self.editor_minimap,
            "editor_line_numbers": self.editor_line_numbers,
            "ai_default_model": self.ai_default_model,
            "ai_temperature": float(self.ai_temperature) if self.ai_temperature else 0.3,
            "ai_max_tokens": self.ai_max_tokens,
            "ai_auto_apply": self.ai_auto_apply if self.ai_auto_apply is not None else True,
            "selected_agent_id": self.selected_agent_id,
            "git_use_git": self.git_use_git,
            "git_repo_path": self.git_repo_path,
            "git_repo_url": self.git_repo_url,
            "git_auto_commit": self.git_auto_commit,
            "use_file_system": self.use_file_system,
            "additional_settings": json.loads(self.additional_settings) if self.additional_settings else {},
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


Index("idx_user_username", User.username)
Index("idx_user_settings_user", UserSettings.user_id)
