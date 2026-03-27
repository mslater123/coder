from flask import Blueprint, jsonify, request
from src.models import db, Project, User, project_users
from src.utils.auth_request import get_current_user_id
from datetime import datetime
from sqlalchemy import insert
import json
import uuid
import os

project_bp = Blueprint('project', __name__, url_prefix='/api/projects')

@project_bp.route('', methods=['GET'])
def list_projects():
    """List all projects for the current user"""
    try:
        user_id = get_current_user_id(request)
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'User authentication required'
            }), 401
        
        # Validate user_id is a UUID (not an integer)
        if len(user_id) <= 10 and '-' not in user_id:
            return jsonify({
                'success': False,
                'error': 'Invalid user ID format. Please log in again.'
            }), 400
        
        # Get all projects this user has access to:
        # 1. Projects created by the user
        # 2. Projects the user is attached to
        created_projects = Project.query.filter_by(created_by=user_id).all()
        attached_projects = Project.query.join(project_users).filter(
            project_users.c.user_id == user_id
        ).all()
        
        # Combine and deduplicate
        all_projects = {p.id: p for p in created_projects + attached_projects}
        projects = list(all_projects.values())
        projects.sort(key=lambda p: p.updated_at, reverse=True)
        
        return jsonify({
            'success': True,
            'projects': [project.to_dict() for project in projects]
        }), 200
    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc() if os.getenv('FLASK_DEBUG') == 'True' else None
        }), 500

@project_bp.route('', methods=['POST'])
def create_project():
    """Create a new project for the current user"""
    try:
        user_id = get_current_user_id(request)
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'User authentication required. Please log in.'
            }), 401
        
        # Verify user exists (accept any format of user ID)
        user = User.query.get(user_id)
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found. Please log in again.'
            }), 404
        
        data = request.get_json() or {}
        name = data.get('name', '').strip()
        if not name:
            return jsonify({
                'success': False,
                'error': 'Project name is required'
            }), 400
        
        description = data.get('description', '').strip()
        settings = data.get('settings', {})
        
        # Create project with UUID
        project = Project(
            id=str(uuid.uuid4()),
            created_by=user_id,
            name=name,
            description=description if description else None,
            settings=json.dumps(settings) if settings else None
        )
        
        db.session.add(project)
        db.session.flush()  # Flush to get the project.id
        
        # Attach creator to project as owner - use relationship which handles the association table
        project.users.append(user)
        
        # Update the role in the association table after adding the user
        # We need to do this via a separate query since the relationship doesn't set the role
        try:
            from sqlalchemy import text
            db.session.execute(
                text("""
                    UPDATE project_users 
                    SET role = 'owner' 
                    WHERE project_id = :project_id AND user_id = :user_id
                """),
                {
                    'project_id': project.id,
                    'user_id': user_id
                }
            )
        except Exception as e:
            print(f"Warning: Could not set role to owner: {e}")
            # Role will default to 'member', but that's okay - we can fix it later
        
        db.session.commit()

        # Create on-disk workspace: backend/code/<project_uuid>/ (same root used by code editor APIs)
        try:
            from src.api.routers.code_editor_routes import get_project_directory
            get_project_directory(project.id)
        except Exception as dir_err:
            print(f"Warning: project DB row created but code directory setup failed: {dir_err}")
        
        return jsonify({
            'success': True,
            'project': project.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error creating project: {str(e)}")
        print(f"Traceback: {error_traceback}")
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': error_traceback
        }), 500

@project_bp.route('/<project_id>', methods=['GET'])
def get_project(project_id):
    """Get a specific project (only if it belongs to the current user)"""
    try:
        user_id = get_current_user_id(request)
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'User authentication required'
            }), 401
        
        # Validate user_id is a UUID (not an integer)
        if len(user_id) <= 10 and '-' not in user_id:
            return jsonify({
                'success': False,
                'error': 'Invalid user ID format. Please log in again.'
            }), 400
        
        project = Project.query.get(project_id)
        if not project:
            return jsonify({
                'success': False,
                'error': 'Project not found'
            }), 404
        
        # Ensure user has access to this project (creator or attached user)
        user_attached = db.session.query(project_users).filter_by(
            project_id=project_id, 
            user_id=user_id
        ).first()
        
        if not user_attached and project.created_by != user_id:
            return jsonify({
                'success': False,
                'error': 'Access denied'
            }), 403
        
        return jsonify({
            'success': True,
            'project': project.to_dict()
        }), 200
    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc() if os.getenv('FLASK_DEBUG') == 'True' else None
        }), 500

@project_bp.route('/<project_id>', methods=['PUT'])
def update_project(project_id):
    """Update a project (only if it belongs to the current user)"""
    try:
        user_id = get_current_user_id(request)
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'User authentication required'
            }), 401
        
        # Validate user_id is a UUID (not an integer)
        if len(user_id) <= 10 and '-' not in user_id:
            return jsonify({
                'success': False,
                'error': 'Invalid user ID format. Please log in again.'
            }), 400
        
        project = Project.query.get(project_id)
        if not project:
            return jsonify({
                'success': False,
                'error': 'Project not found'
            }), 404
        
        # Ensure user has access to this project (creator or attached user)
        user_attached = db.session.query(project_users).filter_by(
            project_id=project_id, 
            user_id=user_id
        ).first()
        
        if not user_attached and project.created_by != user_id:
            return jsonify({
                'success': False,
                'error': 'Access denied'
            }), 403
        
        data = request.get_json() or {}
        
        if 'name' in data:
            name = data['name'].strip()
            if name:
                project.name = name
        
        if 'description' in data:
            project.description = data['description'].strip() if data['description'] else None
        
        if 'settings' in data:
            project.settings = json.dumps(data['settings']) if data['settings'] else None
        
        project.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'project': project.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc() if os.getenv('FLASK_DEBUG') == 'True' else None
        }), 500

@project_bp.route('/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    """Delete a project (only if it belongs to the current user)"""
    try:
        user_id = get_current_user_id(request)
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'User authentication required'
            }), 401
        
        # Validate user_id is a UUID (not an integer)
        if len(user_id) <= 10 and '-' not in user_id:
            return jsonify({
                'success': False,
                'error': 'Invalid user ID format. Please log in again.'
            }), 400
        
        project = Project.query.get(project_id)
        if not project:
            return jsonify({
                'success': False,
                'error': 'Project not found'
            }), 404
        
        # Only creator can delete project
        if project.created_by != user_id:
            return jsonify({
                'success': False,
                'error': 'Only project creator can delete the project'
            }), 403
        
        db.session.delete(project)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Project deleted successfully'
        }), 200
    except Exception as e:
        db.session.rollback()
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc() if os.getenv('FLASK_DEBUG') == 'True' else None
        }), 500

def get_user_project_role(project_id: str, user_id: str) -> str:
    """Get the role of a user in a project (owner, admin, member, viewer, or None)"""
    project = Project.query.get(project_id)
    if not project:
        return None
    
    # Creator is always owner
    if project.created_by == user_id:
        return 'owner'
    
    # Check project_users table
    user_attachment = db.session.query(project_users).filter_by(
        project_id=project_id,
        user_id=user_id
    ).first()
    
    if user_attachment:
        # Get role from the attachment
        from sqlalchemy import select
        result = db.session.execute(
            select(project_users.c.role).where(
                (project_users.c.project_id == project_id) &
                (project_users.c.user_id == user_id)
            )
        ).first()
        if result:
            return result[0] or 'member'
        return 'member'
    
    return None

def can_manage_project_users(project_id: str, user_id: str) -> bool:
    """Check if user can manage project users (owner or admin)"""
    role = get_user_project_role(project_id, user_id)
    return role in ['owner', 'admin']

@project_bp.route('/<project_id>/users', methods=['GET'])
def list_project_users(project_id):
    """List all users in a project (only accessible by project members)"""
    try:
        user_id = get_current_user_id(request)
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'User authentication required'
            }), 401
        
        # Validate user_id is a UUID
        if len(user_id) <= 10 or '-' not in user_id:
            return jsonify({
                'success': False,
                'error': 'Invalid user ID format. Please log in again.'
            }), 400
        
        project = Project.query.get(project_id)
        if not project:
            return jsonify({
                'success': False,
                'error': 'Project not found'
            }), 404
        
        # Ensure user has access to this project
        user_role = get_user_project_role(project_id, user_id)
        if not user_role:
            return jsonify({
                'success': False,
                'error': 'Access denied'
            }), 403
        
        # Get all users attached to the project
        from sqlalchemy import select
        attachments = db.session.execute(
            select(project_users).where(project_users.c.project_id == project_id)
        ).all()
        
        users = []
        # Add creator as owner
        creator = User.query.get(project.created_by)
        if creator:
            users.append({
                'user_id': creator.id,
                'username': creator.username,
                'email': creator.email,
                'name': creator.name,
                'role': 'owner',
                'is_creator': True
            })
        
        # Add attached users
        for attachment in attachments:
            # Skip creator if already added
            if attachment.user_id == project.created_by:
                continue
            
            user = User.query.get(attachment.user_id)
            if user:
                # Get role from attachment
                role_result = db.session.execute(
                    select(project_users.c.role).where(
                        (project_users.c.project_id == project_id) &
                        (project_users.c.user_id == attachment.user_id)
                    )
                ).first()
                role = role_result[0] if role_result else 'member'
                
                users.append({
                    'user_id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'name': user.name,
                    'role': role,
                    'is_creator': False
                })
        
        return jsonify({
            'success': True,
            'users': users
        }), 200
    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc() if os.getenv('FLASK_DEBUG') == 'True' else None
        }), 500

@project_bp.route('/<project_id>/users', methods=['POST'])
def add_project_user(project_id):
    """Add a user to a project (only accessible by owner/admin)"""
    try:
        user_id = get_current_user_id(request)
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'User authentication required'
            }), 401
        
        # Validate user_id is a UUID
        if len(user_id) <= 10 or '-' not in user_id:
            return jsonify({
                'success': False,
                'error': 'Invalid user ID format. Please log in again.'
            }), 400
        
        project = Project.query.get(project_id)
        if not project:
            return jsonify({
                'success': False,
                'error': 'Project not found'
            }), 404
        
        # Check if user can manage project users
        if not can_manage_project_users(project_id, user_id):
            return jsonify({
                'success': False,
                'error': 'Only project owners and admins can add users'
            }), 403
        
        data = request.get_json() or {}
        target_user_id = data.get('user_id', '').strip()
        role = data.get('role', 'member').strip().lower()
        
        if not target_user_id:
            return jsonify({
                'success': False,
                'error': 'User ID is required'
            }), 400
        
        # Validate role
        if role not in ['admin', 'member', 'viewer']:
            return jsonify({
                'success': False,
                'error': 'Invalid role. Must be admin, member, or viewer'
            }), 400
        
        # Verify target user exists
        target_user = User.query.get(target_user_id)
        if not target_user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        # Don't allow adding the creator (they're already owner)
        if target_user_id == project.created_by:
            return jsonify({
                'success': False,
                'error': 'Project creator is already an owner'
            }), 400
        
        # Check if user is already attached
        existing = db.session.execute(
            select(project_users).where(
                (project_users.c.project_id == project_id) &
                (project_users.c.user_id == target_user_id)
            )
        ).first()
        
        if existing:
            # Update role if different
            from sqlalchemy import update
            db.session.execute(
                update(project_users).where(
                    (project_users.c.project_id == project_id) &
                    (project_users.c.user_id == target_user_id)
                ).values(role=role)
            )
            db.session.commit()
            return jsonify({
                'success': True,
                'message': f'User role updated to {role}',
                'user': {
                    'user_id': target_user.id,
                    'username': target_user.username,
                    'email': target_user.email,
                    'name': target_user.name,
                    'role': role
                }
            }), 200
        
        # Add user to project
        db.session.execute(
            insert(project_users).values(
                project_id=project_id,
                user_id=target_user_id,
                role=role
            )
        )
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'User added to project as {role}',
            'user': {
                'user_id': target_user.id,
                'username': target_user.username,
                'email': target_user.email,
                'name': target_user.name,
                'role': role
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc() if os.getenv('FLASK_DEBUG') == 'True' else None
        }), 500

@project_bp.route('/<project_id>/users/<target_user_id>', methods=['PUT'])
def update_project_user_role(project_id, target_user_id):
    """Update a user's role in a project (only accessible by owner/admin)"""
    try:
        user_id = get_current_user_id(request)
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'User authentication required'
            }), 401
        
        # Validate user_id is a UUID
        if len(user_id) <= 10 or '-' not in user_id:
            return jsonify({
                'success': False,
                'error': 'Invalid user ID format. Please log in again.'
            }), 400
        
        project = Project.query.get(project_id)
        if not project:
            return jsonify({
                'success': False,
                'error': 'Project not found'
            }), 404
        
        # Check if user can manage project users
        if not can_manage_project_users(project_id, user_id):
            return jsonify({
                'success': False,
                'error': 'Only project owners and admins can update user roles'
            }), 403
        
        # Don't allow changing creator's role
        if target_user_id == project.created_by:
            return jsonify({
                'success': False,
                'error': 'Cannot change project creator\'s role'
            }), 400
        
        data = request.get_json() or {}
        role = data.get('role', '').strip().lower()
        
        if not role:
            return jsonify({
                'success': False,
                'error': 'Role is required'
            }), 400
        
        # Validate role
        if role not in ['admin', 'member', 'viewer']:
            return jsonify({
                'success': False,
                'error': 'Invalid role. Must be admin, member, or viewer'
            }), 400
        
        # Check if user is attached
        from sqlalchemy import select
        attachment = db.session.execute(
            select(project_users).where(
                (project_users.c.project_id == project_id) &
                (project_users.c.user_id == target_user_id)
            )
        ).first()
        
        if not attachment:
            return jsonify({
                'success': False,
                'error': 'User is not a member of this project'
            }), 404
        
        # Update role
        from sqlalchemy import update
        db.session.execute(
            update(project_users).where(
                (project_users.c.project_id == project_id) &
                (project_users.c.user_id == target_user_id)
            ).values(role=role)
        )
        db.session.commit()
        
        target_user = User.query.get(target_user_id)
        return jsonify({
            'success': True,
            'message': f'User role updated to {role}',
            'user': {
                'user_id': target_user.id,
                'username': target_user.username,
                'email': target_user.email,
                'name': target_user.name,
                'role': role
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc() if os.getenv('FLASK_DEBUG') == 'True' else None
        }), 500

@project_bp.route('/<project_id>/users/<target_user_id>', methods=['DELETE'])
def remove_project_user(project_id, target_user_id):
    """Remove a user from a project (only accessible by owner/admin)"""
    try:
        user_id = get_current_user_id(request)
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'User authentication required'
            }), 401
        
        # Validate user_id is a UUID
        if len(user_id) <= 10 or '-' not in user_id:
            return jsonify({
                'success': False,
                'error': 'Invalid user ID format. Please log in again.'
            }), 400
        
        project = Project.query.get(project_id)
        if not project:
            return jsonify({
                'success': False,
                'error': 'Project not found'
            }), 404
        
        # Check if user can manage project users
        if not can_manage_project_users(project_id, user_id):
            return jsonify({
                'success': False,
                'error': 'Only project owners and admins can remove users'
            }), 403
        
        # Don't allow removing the creator
        if target_user_id == project.created_by:
            return jsonify({
                'success': False,
                'error': 'Cannot remove project creator'
            }), 400
        
        # Check if user is attached
        from sqlalchemy import select
        attachment = db.session.execute(
            select(project_users).where(
                (project_users.c.project_id == project_id) &
                (project_users.c.user_id == target_user_id)
            )
        ).first()
        
        if not attachment:
            return jsonify({
                'success': False,
                'error': 'User is not a member of this project'
            }), 404
        
        # Remove user from project
        from sqlalchemy import delete
        db.session.execute(
            delete(project_users).where(
                (project_users.c.project_id == project_id) &
                (project_users.c.user_id == target_user_id)
            )
        )
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'User removed from project'
        }), 200
    except Exception as e:
        db.session.rollback()
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc() if os.getenv('FLASK_DEBUG') == 'True' else None
        }), 500
