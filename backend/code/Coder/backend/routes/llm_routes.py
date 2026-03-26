from flask import Blueprint, jsonify, request
from models import db, LLMQuery, GPU, GPUTask
from services.gpu_service import GPUService
from datetime import datetime
import json
import uuid

llm_bp = Blueprint('llm', __name__, url_prefix='/api/llm')

@llm_bp.route('/models', methods=['GET'])
def get_available_models():
    """Get list of available Ollama models"""
    try:
        import requests
        response = requests.get('http://localhost:11434/api/tags', timeout=5)
        if response.status_code == 200:
            models = response.json().get('models', [])
            return jsonify({
                'success': True,
                'models': [{'name': m['name'], 'size': m.get('size', 0)} for m in models]
            })
except Exception:
        pass
    
    # Return default models if Ollama not available
    return jsonify({
        'success': False,
        'models': [
            {'name': 'llama2', 'size': 0},
            {'name': 'mistral', 'size': 0},
            {'name': 'codellama', 'size': 0},
            {'name': 'phi', 'size': 0}
        ],
        'note': 'Ollama not available, showing default models'
    })

@llm_bp.route('/query', methods=['POST'])
def create_query():
    """Create a new LLM query"""
    data = request.get_json()
    
    if not data or 'prompt' not in data:
        return jsonify({'error': 'prompt is required'}), 400
    
    prompt = data['prompt']
    model = data.get('model', 'llama2')
    user_id = data.get('user_id')
    gpu_id = data.get('gpu_id')
    
    # Generate unique query ID
    query_id = str(uuid.uuid4())
    
    # Find available GPU if not specified
    if not gpu_id:
        available_gpus = GPUService.get_available_gpus()
        if available_gpus:
            gpu_id = available_gpus[0].id
        else:
            return jsonify({'error': 'No available GPUs'}), 400
    
    # Create query record
    query = LLMQuery(
        query_id=query_id,
        user_id=user_id,
        prompt=prompt,
        model=model,
        gpu_id=gpu_id,
        status='pending'
    )
    db.session.add(query)
    db.session.flush()
    
    # Assign task to GPU
    task = GPUService.assign_task(
        gpu_id=gpu_id,
        task_type='ollama_llm',
        user_id=user_id,
        task_name=f'LLM Query: {prompt[:50]}...',
        config=json.dumps({
            'model': model,
            'prompt': prompt,
            'query_id': query_id,
            'max_tokens': data.get('max_tokens', 512),
            'temperature': data.get('temperature', 0.7)
        })
    )
    
    if not task:
        db.session.rollback()
        return jsonify({'error': 'Failed to assign task to GPU'}), 400
    
    # Link task to query
    query.task_id = task.id
    query.status = 'running'
    db.session.commit()
    
    return jsonify({
        'success': True,
        'query_id': query_id,
        'query': query.to_dict(),
        'task': task.to_dict()
    }), 201

@llm_bp.route('/query/<query_id>', methods=['GET'])
def get_query(query_id):
    """Get LLM query by ID"""
    query = LLMQuery.query.filter_by(query_id=query_id).first()
    if not query:
        return jsonify({'error': 'Query not found'}), 404
    
    result = query.to_dict()
    
    # Include task progress if available
    if query.task_id:
        task = GPUTask.query.get(query.task_id)
        if task:
            result['task_progress'] = float(task.progress) if task.progress else 0
            result['task_status'] = task.status
    
    return jsonify(result)

@llm_bp.route('/queries', methods=['GET'])
def get_queries():
    """Get all LLM queries"""
    user_id = request.args.get('user_id', type=int)
    status = request.args.get('status')
    limit = request.args.get('limit', type=int, default=50)
    
    query = LLMQuery.query
    
    if user_id:
        query = query.filter_by(user_id=user_id)
    if status:
        query = query.filter_by(status=status)
    
    queries = query.order_by(LLMQuery.created_at.desc()).limit(limit).all()
    return jsonify([q.to_dict() for q in queries])

@llm_bp.route('/query/<query_id>/response', methods=['POST'])
def update_query_response(query_id):
    """Update query with response (called by client)"""
    data = request.get_json()
    
    query = LLMQuery.query.filter_by(query_id=query_id).first()
    if not query:
        return jsonify({'error': 'Query not found'}), 404
    
    query.response = data.get('response', '')
    query.status = 'completed'
    query.completed_at = datetime.utcnow()
    
    # Update task result
    if query.task_id:
        task = GPUTask.query.get(query.task_id)
        if task:
            task.result = data.get('response', '')
            task.status = 'completed'
            task.end_time = datetime.utcnow()
            task.progress = 100.0
    
    db.session.commit()
    
    return jsonify(query.to_dict())

@llm_bp.route('/query/<query_id>', methods=['DELETE'])
def delete_query(query_id):
    """Delete an LLM query"""
    query = LLMQuery.query.filter_by(query_id=query_id).first()
    if not query:
        return jsonify({'error': 'Query not found'}), 404
    
    # Stop associated task if running
    if query.task_id:
        task = GPUTask.query.get(query.task_id)
        if task and task.status == 'running':
            GPUService.stop_task(query.task_id)
    
    models_db.session.delete(query)
    db.session.commit()
    
    return jsonify({'success': True})
