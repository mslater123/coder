from flask import Blueprint, jsonify, request, current_app, send_from_directory
from src.models import db, User, UserSettings
from src.utils.auth_request import get_current_user_id
import json
import os
import traceback
from werkzeug.utils import secure_filename
import uuid

def require_admin_or_self(target_user_id=None):
    """Check if current user is admin or is accessing their own data"""
    current_user_id = get_current_user_id(request)
    if not current_user_id:
        return None, jsonify({'error': 'Authentication required'}), 401
    
    current_user = User.query.get(current_user_id)
    if not current_user:
        return None, jsonify({'error': 'User not found'}), 404
    
    # Allow if admin
    if current_user.is_admin:
        return current_user, None, None
    
    # Allow if accessing own data
    if target_user_id and current_user_id == target_user_id:
        return current_user, None, None
    
    # Otherwise deny
    return None, jsonify({'error': 'Admin access required'}), 403

user_bp = Blueprint('user', __name__, url_prefix='/api/users')

@user_bp.route('/', methods=['GET'])
def get_users():
    """Get all users (admin only)"""
    current_user, error_response, status_code = require_admin_or_self()
    if error_response:
        return error_response, status_code
    
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])

@user_bp.route('/<user_id>', methods=['GET'])
def get_user(user_id):
    """Get specific user"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user.to_dict())

@user_bp.route('/<user_id>', methods=['PUT'])
def update_user(user_id):
    """Update user information (admin can update anyone, users can only update themselves)"""
    current_user, error_response, status_code = require_admin_or_self(user_id)
    if error_response:
        return error_response, status_code
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json() or {}
    
    # Users can update their own profile info
    if 'email' in data:
        user.email = data['email']
    if 'name' in data:
        user.name = data['name']
    if 'address' in data:
        user.address = data['address']
    if 'profile_image' in data:
        user.profile_image = data['profile_image']
    
    # Only admins can update these fields
    if current_user.is_admin:
        if 'is_active' in data:
            user.is_active = data['is_active']
        if 'is_admin' in data:
            user.is_admin = data['is_admin']
    
    db.session.commit()
    return jsonify(user.to_dict())

@user_bp.route('/<user_id>/toggle-active', methods=['POST'])
def toggle_active(user_id):
    """Toggle user active status (admin only)"""
    current_user, error_response, status_code = require_admin_or_self()
    if error_response:
        return error_response, status_code
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    user.is_active = not user.is_active
    db.session.commit()
    
    return jsonify({
        'success': True,
        'user': user.to_dict()
    })

@user_bp.route('/<user_id>', methods=['DELETE'])
def delete_user(user_id):
    """Delete user (admin only)"""
    current_user, error_response, status_code = require_admin_or_self()
    if error_response:
        return error_response, status_code
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'User deleted'})

@user_bp.route('/search', methods=['GET'])
def search_users():
    """Search users by username or email (admin only)"""
    current_user, error_response, status_code = require_admin_or_self()
    if error_response:
        return error_response, status_code
    
    query = request.args.get('q', '')
    
    if not query:
        return jsonify({'error': 'Search query required'}), 400
    
    users = User.query.filter(
        (User.username.ilike(f'%{query}%')) |
        (User.email.ilike(f'%{query}%'))
    ).all()
    
    return jsonify([user.to_dict() for user in users])

@user_bp.route('/list-for-project', methods=['GET'])
def list_users_for_project():
    """List users for project management (allows project owners/admins to see users)"""
    current_user_id = get_current_user_id(request)
    if not current_user_id:
        return jsonify({'error': 'Authentication required'}), 401
    
    current_user = User.query.get(current_user_id)
    if not current_user:
        return jsonify({'error': 'User not found'}), 404
    
    # Allow admins
    if current_user.is_admin:
        users = User.query.filter(User.is_active == True).all()
        return jsonify({
            'success': True,
            'users': [user.to_dict() for user in users]
        })
    
    # For non-admins, check if they're managing a project
    project_id = request.args.get('project_id')
    if project_id:
        from src.models import Project, project_users
        from sqlalchemy import select
        
        # Check if user is owner or admin of the project
        project = Project.query.get(project_id)
        if project and project.created_by == current_user_id:
            # User is project owner
            users = User.query.filter(User.is_active == True).all()
            return jsonify({
                'success': True,
                'users': [user.to_dict() for user in users]
            })
        
        # Check if user is admin of the project using project_users table
        try:
            result = db.session.execute(
                select(project_users.c.role).where(
                    (project_users.c.project_id == project_id) &
                    (project_users.c.user_id == current_user_id)
                )
            ).first()
            
            if result and result[0] in ['owner', 'admin']:
                # User is project admin
                users = User.query.filter(User.is_active == True).all()
                return jsonify({
                    'success': True,
                    'users': [user.to_dict() for user in users]
                })
        except Exception as e:
            print(f"Error checking project role: {e}")
            import traceback
            traceback.print_exc()
    
    # Default: return empty list for non-admins without project access
    return jsonify({
        'success': True,
        'users': []
    })

@user_bp.route('/<user_id>/settings', methods=['GET'])
def get_user_settings(user_id):
    """Get user settings (admin can view anyone, users can only view their own)"""
    # Accept any user ID format - validate user exists instead
    user_id = str(user_id).strip()
    if not user_id:
        return jsonify({
            'success': False,
            'error': 'User ID is required'
        }), 400
    
    current_user, error_response, status_code = require_admin_or_self(user_id)
    if error_response:
        return error_response, status_code
    
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({
                'success': False,
                'error': f'User not found: {user_id}'
            }), 404
        
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
            except Exception as e:
                print(f"Error parsing additional_settings: {e}")
                additional = {}
        
        result = settings.to_dict()
        result['window_layout'] = additional.get('window_layout', {})
        
        return jsonify({
            'success': True,
            'settings': result
        })
    except Exception as e:
        print(f"Error in get_user_settings: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc() if os.getenv('FLASK_DEBUG') == 'True' else None
        }), 500

@user_bp.route('/<user_id>/settings', methods=['PUT'])
def update_user_settings(user_id):
    """Update user settings (admin can update anyone, users can only update their own)"""
    # Accept any user ID format - validate user exists instead
    user_id = str(user_id).strip()
    if not user_id:
        return jsonify({
            'success': False,
            'error': 'User ID is required'
        }), 400
    
    current_user, error_response, status_code = require_admin_or_self(user_id)
    if error_response:
        return error_response, status_code
    
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({
                'success': False,
                'error': f'User not found: {user_id}'
            }), 404
        
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
        if 'selected_agent_id' in data:
            settings.selected_agent_id = data['selected_agent_id'] if data['selected_agent_id'] is not None else None
        
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
                except Exception as e:
                    print(f"Error parsing existing additional_settings: {e}")
                    additional = {}
            
            # Update window layout if provided
            if 'window_layout' in data:
                additional['window_layout'] = data['window_layout']
            
            # Merge any other additional settings
            if 'additional_settings' in data:
                # Deep merge to preserve existing settings
                if isinstance(data['additional_settings'], dict):
                    for key, value in data['additional_settings'].items():
                        if key == 'expanded_folders' and isinstance(value, dict):
                            # Merge expanded folders by project
                            if 'expanded_folders' not in additional:
                                additional['expanded_folders'] = {}
                            additional['expanded_folders'].update(value)
                        else:
                            additional[key] = value
                else:
                    additional.update(data['additional_settings'])
            
            settings.additional_settings = json.dumps(additional)
        
        db.session.commit()
        
        # Return updated settings with parsed additional_settings
        result = settings.to_dict()
        additional = {}
        if settings.additional_settings:
            try:
                additional = json.loads(settings.additional_settings)
            except Exception as e:
                print(f"Error parsing additional_settings in response: {e}")
                additional = {}
        result['window_layout'] = additional.get('window_layout', {})
        
        return jsonify({
            'success': True,
            'settings': result
        })
    except Exception as e:
        print(f"Error in update_user_settings: {e}")
        import traceback
        traceback.print_exc()
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc() if os.getenv('FLASK_DEBUG') == 'True' else None
        }), 500

@user_bp.route('/<user_id>/profile-image', methods=['POST'])
def upload_profile_image(user_id):
    """Upload profile image for user (users can only upload their own, admins can upload for anyone)"""
    current_user, error_response, status_code = require_admin_or_self(user_id)
    if error_response:
        return error_response, status_code
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Check file extension
    allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    if '.' not in file.filename or file.filename.rsplit('.', 1)[1].lower() not in allowed_extensions:
        return jsonify({'error': 'Invalid file type. Allowed: png, jpg, jpeg, gif, webp'}), 400
    
    # Generate unique filename
    filename = f"{user_id}_{uuid.uuid4().hex}.{file.filename.rsplit('.', 1)[1].lower()}"
    filename = secure_filename(filename)
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    
    # Save file
    file.save(filepath)
    
    # Update user profile image
    user.profile_image = f"/api/users/{user_id}/profile-image/{filename}"
    db.session.commit()
    
    return jsonify({
        'success': True,
        'profile_image': user.profile_image,
        'user': user.to_dict()
    })

@user_bp.route('/<user_id>/profile-image/<filename>', methods=['GET'])
def get_profile_image(user_id, filename):
    """Serve profile image"""
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)
