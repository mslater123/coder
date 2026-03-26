from flask import Blueprint, jsonify, request
from services.bitcoin_service import BitcoinService
from datetime import datetime

mining_bp = Blueprint('mining', __name__, url_prefix='/api/mining')

@mining_bp.route('/sessions', methods=['GET'])
def get_sessions():
    """Get all mining sessions"""
    limit = request.args.get('limit', 50, type=int)
    sessions = BitcoinService.get_all_mining_sessions(limit=limit)
    return jsonify([session.to_dict() for session in sessions])

@mining_bp.route('/sessions/<int:session_id>', methods=['GET'])
def get_session(session_id):
    """Get a specific mining session"""
    session = BitcoinService.get_mining_session(session_id)
    if not session:
        return jsonify({'error': 'Session not found'}), 404
    return jsonify(session.to_dict())

@mining_bp.route('/sessions', methods=['POST'])
def create_session():
    """Create a new mining session"""
    data = request.get_json() or {}
    difficulty = data.get('difficulty', 4)
    
    if not (1 <= difficulty <= 8):
        return jsonify({'error': 'Difficulty must be between 1 and 8'}), 400
    
    session = BitcoinService.create_mining_session(difficulty=difficulty)
    return jsonify(session.to_dict()), 201

@mining_bp.route('/sessions/<int:session_id>', methods=['PUT'])
def update_session(session_id):
    """Update a mining session"""
    data = request.get_json() or {}
    
    session = BitcoinService.update_mining_session(
        session_id,
        total_hashes=data.get('total_hashes'),
        blocks_found=data.get('blocks_found'),
        average_hash_rate=data.get('average_hash_rate'),
        status=data.get('status')
    )
    
    if not session:
        return jsonify({'error': 'Session not found'}), 404
    
    return jsonify(session.to_dict())

@mining_bp.route('/sessions/<int:session_id>/stats', methods=['GET'])
def get_session_stats(session_id):
    """Get statistics for a mining session"""
    limit = request.args.get('limit', 100, type=int)
    stats = BitcoinService.get_session_stats(session_id, limit=limit)
    return jsonify([stat.to_dict() for stat in stats])

@mining_bp.route('/sessions/<int:session_id>/stats', methods=['POST'])
def add_session_stat(session_id):
    """Add a statistics snapshot to a session"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    required_fields = ['hashes_per_second', 'total_hashes']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    stat = BitcoinService.add_mining_stat(
        session_id=session_id,
        hashes_per_second=data['hashes_per_second'],
        total_hashes=data['total_hashes'],
        blocks_found=data.get('blocks_found', 0),
        last_hash=data.get('last_hash')
    )
    
    return jsonify(stat.to_dict()), 201
