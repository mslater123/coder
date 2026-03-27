"""Built-in observability routes."""

from flask import Flask, jsonify

from src.core.constants import API_SERVICE_NAME, HEALTH_PATH


def register_health_routes(app: Flask) -> None:
    @app.route(HEALTH_PATH, methods=["GET"])
    def health_check():
        return jsonify({"status": "healthy", "service": API_SERVICE_NAME})
