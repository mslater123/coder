from flask import Blueprint, jsonify, request
from models import db, User, UserSettings
import json

user_bp = Blueprint('user', __name__, url_prefix='/api/users')

@user_bp.route('/', methods=['GET'])
def get_users():
    """Get all users (admin only in production)"""
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])

@user_bp.route('/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """Get specific user"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user.to_dict())

@user_bp.route('/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    """Update user information"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json() or {}
    
    if 'email' in data:
        user.email = data['email']
    if 'is_active' in data:
        user.is_active = data['is_active']
    if 'is_admin' in data:
        user.is_admin = data['is_admin']
    
    db.session.commit()
    return jsonify(user.to_dict())

@user_bp.route('/<int:user_id>/toggle-active', methods=['POST'])
def toggle_active(user_id):
    """Toggle user active status"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    user.is_active = not user.is_active
    db.session.commit()
    
    return jsonify({
        'success': True,
        'user': user.to_dict()
    })

@user_bp.route('/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    """Delete user"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'User deleted'})

@user_bp.route('/search', methods=['GET'])
def search_users():
    """Search users by username or email"""
    query = request.args.get('q', '')
    
    if not query:
        return jsonify({'error': 'Search query required'}), 400
    
    users = User.query.filter(
        (User.username.ilike(f'%{query}%')) |
        (User.email.ilike(f'%{query}%'))
    ).all()
    
    return jsonify([user.to_dict() for user in users])

@user_bp.route('/<int:user_id>/settings', methods=['GET'])
def get_user_settings(user_id):
    """Get user settings"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    settings = UserSettings.query.filter_by(user_id=user_id).first()
    if not settings:
        # Create default settings if they don't exist
        settings = UserSettings(user_id=user_id)
        db.session.add(settings)
        db.session.commit()
    
    # Parse additional_settings JSON to extract window_layout
    additional = {}
    if settings.additional_settings:
        try:
            additional = json.loads(settings.additional_settings)
except Exception:
            additional = {}
    
    result = settings.to_dict()
    result['window_layout'] = additional.get('window_layout', {})
    
    return jsonify({
        'success': True,
        'settings': result
    })

@user_bp.route('/<int:user_id>/settings', methods=['PUT'])
def update_user_settings(user_id):
    """Update user settings"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json() or {}
    settings = UserSettings.query.filter_by(user_id=user_id).first()
    
    if not settings:
        settings = UserSettings(user_id=user_id)
        db.session.add(settings)
    
    # Update editor settings
    if 'editor_theme' in data:
        settings.editor_theme = data['editor_theme']
    if 'editor_font_size' in data:
        settings.editor_font_size = data['editor_font_size']
    if 'editor_font_family' in data:
        settings.editor_font_family = data['editor_font_family']
    if 'editor_tab_size' in data:
        settings.editor_tab_size = data['editor_tab_size']
    if 'editor_word_wrap' in data:
        settings.editor_word_wrap = data['editor_word_wrap']
    if 'editor_minimap' in data:
        settings.editor_minimap = data['editor_minimap']
    if 'editor_line_numbers' in data:
        settings.editor_line_numbers = data['editor_line_numbers']
    
    # Update AI settings
    if 'ai_default_model' in data:
        settings.ai_default_model = data['ai_default_model']
    if 'ai_temperature' in data:
        settings.ai_temperature = data['ai_temperature']
    if 'ai_max_tokens' in data:
        settings.ai_max_tokens = data['ai_max_tokens']
    if 'ai_auto_apply' in data:
        settings.ai_auto_apply = data['ai_auto_apply']
    
    # Update Git settings
    if 'git_use_git' in data:
        settings.git_use_git = data['git_use_git']
    if 'git_repo_path' in data:
        settings.git_repo_path = data['git_repo_path']
    if 'git_repo_url' in data:
        settings.git_repo_url = data['git_repo_url']
    if 'git_auto_commit' in data:
        settings.git_auto_commit = data['git_auto_commit']
    
    # Update file system settings
    if 'use_file_system' in data:
        settings.use_file_system = data['use_file_system']
    
    # Update additional settings (window layout, etc.)
    if 'window_layout' in data or 'additional_settings' in data:
        # Get existing additional settings
        additional = {}
        if settings.additional_settings:
            try:
                additional = json.loads(settings.additional_settings)
except Exception:
                additional = {}
        
        # Update window layout if provided
        if 'window_layout' in data:
            additional['window_layout'] = data['window_layout']
        
        # Merge any other additional settings
        if 'additional_settings' in data:
            additional.update(data['additional_settings'])
        
        settings.additional_settings = json.dumps(additional)
    
    db.session.commit()
    
    # Return updated settings with parsed additional_settings
    result = settings.to_dict()
    additional = {}
    if settings.additional_settings:
        try:
            additional = json.loads(settings.additional_settings)
except Exception:
            additional = {}
    result['window_layout'] = additional.get('window_layout', {})
    
    return jsonify({
        'success': True,
        'settings': result
    })
