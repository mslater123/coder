import json
from datetime import datetime

from sqlalchemy import Index, Text

from src.models.base import db


class CodebaseAnalysis(db.Model):
    """Model for caching codebase analysis results"""

    __tablename__ = "codebase_analysis"

    id = db.Column(db.Integer, primary_key=True)
    project_path = db.Column(db.String(500), nullable=False, index=True)
    working_dir = db.Column(db.String(500), nullable=False)
    analysis_hash = db.Column(db.String(64), nullable=False, index=True)
    analysis_data = db.Column(Text, nullable=False)
    file_count = db.Column(db.Integer, default=0)
    language_breakdown = db.Column(Text)
    dependencies = db.Column(Text)
    functions = db.Column(Text)
    classes = db.Column(Text)
    imports = db.Column(Text)
    structure_summary = db.Column(Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "project_path": self.project_path,
            "working_dir": self.working_dir,
            "analysis_hash": self.analysis_hash,
            "analysis_data": json.loads(self.analysis_data) if self.analysis_data else {},
            "file_count": self.file_count,
            "language_breakdown": json.loads(self.language_breakdown) if self.language_breakdown else {},
            "dependencies": json.loads(self.dependencies) if self.dependencies else {},
            "functions": json.loads(self.functions) if self.functions else {},
            "classes": json.loads(self.classes) if self.classes else {},
            "imports": json.loads(self.imports) if self.imports else {},
            "structure_summary": self.structure_summary,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class ProjectFileCache(db.Model):
    """Model for caching project file structure and contents"""

    __tablename__ = "project_file_cache"

    id = db.Column(db.Integer, primary_key=True)
    project_path = db.Column(db.String(500), nullable=False, index=True)
    working_dir = db.Column(db.String(500), nullable=False, index=True)
    file_path = db.Column(db.String(1000), nullable=False)
    file_content = db.Column(db.Text)
    file_size = db.Column(db.Integer, default=0)
    file_mtime = db.Column(db.Float)
    is_directory = db.Column(db.Boolean, default=False)
    file_hash = db.Column(db.String(64))


Index("idx_codebase_analysis_path", CodebaseAnalysis.project_path)
Index("idx_codebase_analysis_hash", CodebaseAnalysis.analysis_hash)
Index("idx_project_file_cache_path", ProjectFileCache.project_path)
Index("idx_project_file_cache_working_dir", ProjectFileCache.working_dir)
Index("idx_project_file_cache_file_path", ProjectFileCache.file_path)
