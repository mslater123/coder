from flask import Blueprint, jsonify, request
from src.models import db, User, DesignDoc
from datetime import datetime
import uuid

design_docs_bp = Blueprint('design_docs', __name__, url_prefix='/api/design-docs')

@design_docs_bp.route('', methods=['GET'])
def list_docs():
    """List all design documents, optionally filtered by project"""
    try:
        project_id = request.args.get('project_id')
        user_id = request.args.get('user_id')
        
        query = DesignDoc.query
        
        if project_id:
            # Support both project_id (UUID) and project_name (string)
            # Try exact match first, then try as project name
            query = query.filter(
                (DesignDoc.project_id == project_id) | 
                (DesignDoc.project_id.like(f'%{project_id}%'))
            )
        if user_id:
            query = query.filter_by(author_id=user_id)
        
        docs = query.order_by(DesignDoc.updated_at.desc()).all()
        
        return jsonify({
            'success': True,
            'docs': [doc.to_dict() for doc in docs]
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@design_docs_bp.route('/<doc_id>', methods=['GET'])
def get_doc(doc_id):
    """Get a specific design document"""
    try:
        doc = DesignDoc.query.get(doc_id)
        if not doc:
            return jsonify({
                'success': False,
                'error': 'Design document not found'
            }), 404
        
        return jsonify({
            'success': True,
            'doc': doc.to_dict()
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@design_docs_bp.route('', methods=['POST'])
def create_doc():
    """Create a new design document"""
    try:
        data = request.get_json() or {}
        
        # Get current user from session or request
        user_id = data.get('user_id') or request.headers.get('X-User-Id')
        if not user_id:
            # Try to get from auth token or default to 1
            user_id = 1
        
        # Get user to get username
        user = User.query.get(user_id)
        author = user.username if user else 'Unknown'
        
        # Handle tags - can be array or comma-separated string
        tags_data = data.get('tags', [])
        if isinstance(tags_data, list):
            tags_str = ','.join(tags_data)
        else:
            tags_str = str(tags_data) if tags_data else ''
        
        doc = DesignDoc(
            id=str(uuid.uuid4()),
            title=data.get('title', 'Untitled Document'),
            content=data.get('content', ''),
            project_id=data.get('projectId') or data.get('project_id'),
            tags=tags_str,
            author_id=user_id,
            author=author
        )
        
        db.session.add(doc)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'doc': doc.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@design_docs_bp.route('/<doc_id>', methods=['PUT'])
def update_doc(doc_id):
    """Update an existing design document"""
    try:
        doc = DesignDoc.query.get(doc_id)
        if not doc:
            return jsonify({
                'success': False,
                'error': 'Design document not found'
            }), 404
        
        data = request.get_json() or {}
        
        if 'title' in data:
            doc.title = data['title']
        if 'content' in data:
            doc.content = data['content']
        if 'projectId' in data:
            doc.project_id = data['projectId']
        elif 'project_id' in data:
            doc.project_id = data['project_id']
        if 'tags' in data:
            tags_data = data['tags']
            if isinstance(tags_data, list):
                doc.tags = ','.join(tags_data)
            else:
                doc.tags = str(tags_data) if tags_data else ''
        
        doc.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'doc': doc.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@design_docs_bp.route('/<doc_id>', methods=['DELETE'])
def delete_doc(doc_id):
    """Delete a design document"""
    try:
        doc = DesignDoc.query.get(doc_id)
        if not doc:
            return jsonify({
                'success': False,
                'error': 'Design document not found'
            }), 404
        
        db.session.delete(doc)
        db.session.commit()
        
        return jsonify({
            'success': True
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
