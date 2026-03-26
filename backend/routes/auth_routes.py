from flask import Blueprint, jsonify, request
from models import db, User
from datetime import datetime
from sqlalchemy import func
import re

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

def validate_email(email):
    """Simple email validation"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        username = data.get('username', '').strip()
        password = data.get('password', '')
        email = data.get('email', '').strip() if data.get('email') else None
        
        # Validation
        if not username or len(username) < 3:
            return jsonify({'success': False, 'error': 'Username must be at least 3 characters'}), 400
        
        if not password or len(password) < 6:
            return jsonify({'success': False, 'error': 'Password must be at least 6 characters'}), 400
        
        if email and not validate_email(email):
            return jsonify({'success': False, 'error': 'Invalid email format'}), 400
        
        # Check if user exists - try exact match first, then case-insensitive
        existing_user = User.query.filter_by(username=username).first()
        if not existing_user:
            # Try case-insensitive check for SQLite
            existing_user = User.query.filter(func.lower(User.username) == func.lower(username)).first()
        
        if existing_user:
            # Log for debugging
            print(f"Registration blocked: username '{username}' conflicts with existing user '{existing_user.username}' (ID: {existing_user.id})")
            # Return more helpful error with the actual username found
            return jsonify({
                'success': False, 
                'error': f'Username already exists'
            }), 400
        
        if email:
            existing_email = User.query.filter_by(email=email).first()
            if not existing_email:
                # Try case-insensitive check
                existing_email = User.query.filter(func.lower(User.email) == func.lower(email)).first()
            if existing_email:
                return jsonify({'success': False, 'error': 'Email already registered'}), 400
        
        # Create user - explicitly set UUID to ensure it's a string
        import uuid as uuid_module
        user_id = str(uuid_module.uuid4())
        
        user = User(
            id=user_id,
            username=username,
            email=email,
            is_active=True,
            is_admin=False
        )
        user.set_password(password)
        
        # Ensure created_at is set
        if not hasattr(user, 'created_at') or user.created_at is None:
            user.created_at = datetime.utcnow()
        
        db.session.add(user)
        try:
            db.session.flush()  # Flush to check for constraint violations before commit
            db.session.commit()
        except Exception as commit_error:
            db.session.rollback()
            # Check if it's a constraint error and provide more details
            error_str = str(commit_error)
            if 'UNIQUE constraint' in error_str or 'IntegrityError' in error_str:
                if 'username' in error_str.lower() or 'users.username' in error_str:
                    # Return 400 instead of 500 for duplicate username
                    return jsonify({'success': False, 'error': 'Username already exists'}), 400
                elif 'email' in error_str.lower() or 'users.email' in error_str:
                    # Return 400 instead of 500 for duplicate email
                    return jsonify({'success': False, 'error': 'Email already registered'}), 400
                else:
                    return jsonify({'success': False, 'error': f'Database constraint violation: {error_str}'}), 400
            elif 'no such column' in error_str.lower():
                return jsonify({'success': False, 'error': f'Database schema error: {error_str}. Please restart the backend to run migrations.'}), 500
            # Re-raise for other errors
            raise Exception(f"Failed to create user in database: {error_str}") from commit_error
        
        # Refresh to get the user with all fields populated
        db.session.refresh(user)
        
        # Get user dict
        user_dict = user.to_dict()
        
        return jsonify({
            'success': True,
            'message': 'User registered successfully',
            'user': user_dict
        }), 201
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error in register route: {e}")
        print(f"Traceback: {error_traceback}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Registration failed: {str(e)}',
            'traceback': error_traceback
        }), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({'success': False, 'error': 'Username and password required'}), 400
        
        # Find user (case-insensitive for SQLite)
        user = User.query.filter(func.lower(User.username) == func.lower(username)).first()
        
        if not user:
            return jsonify({'success': False, 'error': 'Invalid username or password'}), 401
        
        if not user.check_password(password):
            return jsonify({'success': False, 'error': 'Invalid username or password'}), 401
        
        if not user.is_active:
            return jsonify({'success': False, 'error': 'Account is inactive'}), 403
        
        # Update last login
        try:
            user.last_login = datetime.utcnow()
            db.session.commit()
        except Exception as commit_error:
            db.session.rollback()
            # Continue even if commit fails - login should still work
        
        # Get user dict
        user_dict = user.to_dict()
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': user_dict
        })
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        error_msg = str(e)
        print(f"Error in login route: {error_msg}")
        print(f"Traceback: {error_traceback}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Login failed: {error_msg}',
            'traceback': error_traceback
        }), 500

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Logout user (client-side session management)"""
    return jsonify({'success': True, 'message': 'Logout successful'})

@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    """Get current user info (requires authentication token in production)"""
    # In production, this would verify JWT token or session
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'User ID required'}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify(user.to_dict())

@auth_bp.route('/check-username', methods=['POST'])
def check_username():
    """Check if a username is available (for debugging)"""
    try:
        data = request.get_json() or {}
        username = data.get('username', '').strip()
        
        if not username:
            return jsonify({'available': False, 'error': 'Username required'}), 400
        
        # Check exact match
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            return jsonify({
                'available': False,
                'error': 'Username already exists',
                'found_username': existing_user.username,
                'found_id': existing_user.id
            }), 200
        
        # Check case-insensitive
        existing_user = User.query.filter(func.lower(User.username) == func.lower(username)).first()
        if existing_user:
            return jsonify({
                'available': False,
                'error': 'Username already exists (case-insensitive match)',
                'found_username': existing_user.username,
                'found_id': existing_user.id
            }), 200
        
        return jsonify({'available': True}), 200
    except Exception as e:
        return jsonify({'available': False, 'error': str(e)}), 500
