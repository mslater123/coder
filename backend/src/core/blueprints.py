"""Register default HTTP blueprints."""

from flask import Flask

from src.api.routers.auth_routes import auth_bp
from src.api.routers.code_editor_routes import code_editor_bp
from src.api.routers.design_docs_routes import design_docs_bp
from src.api.routers.gpu_routes import gpu_bp
from src.api.routers.llm_manager_routes import llm_manager_bp
from src.api.routers.llm_routes import llm_bp
from src.api.routers.project_routes import project_bp
from src.api.routers.user_routes import user_bp


def register_default_blueprints(app: Flask) -> None:
    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(gpu_bp)
    app.register_blueprint(llm_bp)
    app.register_blueprint(llm_manager_bp)
    app.register_blueprint(code_editor_bp)
    app.register_blueprint(design_docs_bp)
    app.register_blueprint(project_bp)
