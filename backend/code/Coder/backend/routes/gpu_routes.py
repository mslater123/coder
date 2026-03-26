from flask import Blueprint, jsonify, request
from services.gpu_service import GPUService
from datetime import datetime
import json

gpu_bp = Blueprint('gpu', __name__, url_prefix='/api/gpus')

@gpu_bp.route('/detect', methods=['POST'])
def detect_gpus():
    """Detect GPUs on the system"""
    try:
        # Get GPUs from request body (from client) or detect locally
        data = request.get_json() or {}
        gpus_data = data.get('gpus', [])
        
        if not gpus_data:
            # Try to detect locally
            gpus_data = GPUService.detect_gpus()
        
        # Register detected GPUs
        registered = []
        host_system = data.get('host_system') or request.remote_addr or 'localhost'
        
        for gpu_info in gpus_data:
            gpu = GPUService.register_gpu(
                device_id=gpu_info['device_id'],
                name=gpu_info['name'],
                vendor=gpu_info.get('vendor'),
                memory_total=gpu_info.get('memory_total'),
                driver_version=gpu_info.get('driver_version'),
                host_system=host_system
            )
            # Update status if provided
            if 'memory_used' in gpu_info or 'temperature' in gpu_info:
                GPUService.update_gpu_status(
                    gpu.device_id,
                    memory_used=gpu_info.get('memory_used'),
                    memory_free=gpu_info.get('memory_free'),
                    temperature=gpu_info.get('temperature'),
                    power_usage=gpu_info.get('power_usage'),
                    utilization=gpu_info.get('utilization')
                )
                # Refresh GPU data
                from models import GPU
                gpu = GPU.query.get(gpu.id)
            
            registered.append(gpu.to_dict())
        
        return jsonify({
            'success': True,
            'gpus': registered,
            'count': len(registered)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@gpu_bp.route('/', methods=['GET'])
def get_gpus():
    """Get all registered GPUs"""
    gpus = GPUService.get_all_gpus()
    return jsonify([gpu.to_dict() for gpu in gpus])

@gpu_bp.route('/available', methods=['GET'])
def get_available_gpus():
    """Get available GPUs"""
    gpus = GPUService.get_available_gpus()
    return jsonify([gpu.to_dict() for gpu in gpus])

@gpu_bp.route('/<int:gpu_id>', methods=['GET'])
def get_gpu(gpu_id):
    """Get specific GPU"""
    from backend.models import GPU
    gpu = GPU.query.get(gpu_id)
    if not gpu:
        return jsonify({'error': 'GPU not found'}), 404
    return jsonify(gpu.to_dict())

@gpu_bp.route('/<int:gpu_id>/status', methods=['PUT'])
def update_gpu_status(gpu_id):
    """Update GPU status"""
    data = request.get_json() or {}
    
    from backend.models import GPU
    gpu = GPU.query.get(gpu_id)
    if not gpu:
        return jsonify({'error': 'GPU not found'}), 404
    
    gpu = GPUService.update_gpu_status(
        gpu.device_id,
        memory_used=data.get('memory_used'),
        memory_free=data.get('memory_free'),
        temperature=data.get('temperature'),
        power_usage=data.get('power_usage'),
        utilization=data.get('utilization')
    )
    
    return jsonify(gpu.to_dict())

@gpu_bp.route('/<int:gpu_id>/assign', methods=['POST'])
def assign_task(gpu_id):
    """Assign a task to a GPU"""
    data = request.get_json()
    
    if not data or 'task_type' not in data:
        return jsonify({'error': 'task_type is required'}), 400
    
    task_type = data['task_type']
    if task_type not in ['mining', 'ai_training', 'ai_inference', 'system_task', 'ollama_llm', 'install_model']:
        return jsonify({'error': 'Invalid task_type'}), 400
    
    # Convert config to JSON string if it's a dict
    config = data.get('config')
    if config and isinstance(config, dict):
        config = json.dumps(config)
    
    task = GPUService.assign_task(
        gpu_id=gpu_id,
        task_type=task_type,
        user_id=data.get('user_id'),
        task_name=data.get('task_name'),
        config=config
    )
    
    if not task:
        return jsonify({'error': 'GPU not available or not found'}), 400
    
    return jsonify(task.to_dict()), 201

@gpu_bp.route('/tasks', methods=['GET'])
def get_tasks():
    """Get all GPU tasks"""
    gpu_id = request.args.get('gpu_id', type=int)
    status = request.args.get('status')
    
    tasks = GPUService.get_gpu_tasks(gpu_id=gpu_id, status=status)
    return jsonify([task.to_dict() for task in tasks])

@gpu_bp.route('/tasks/<int:task_id>', methods=['GET'])
def get_task(task_id):
    """Get specific task"""
    from models import GPUTask
    task = GPUTask.query.get(task_id)
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    return jsonify(task.to_dict())

@gpu_bp.route('/tasks/<int:task_id>/stop', methods=['POST'])
def stop_task(task_id):
    """Stop a GPU task"""
    task = GPUService.stop_task(task_id)
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    return jsonify(task.to_dict())

@gpu_bp.route('/tasks/<int:task_id>/progress', methods=['PUT'])
def update_task_progress(task_id):
    """Update task progress"""
    data = request.get_json() or {}
    
    if 'progress' not in data:
        return jsonify({'error': 'progress is required'}), 400
    
    # Store metadata if provided
    metadata = data.get('metadata')
    if metadata and isinstance(metadata, str):
        try:
            metadata = json.loads(metadata)
except Exception:
            metadata = None
    
    # Handle LLM response
    result_text = None
    if metadata and metadata.get('response'):
        result_text = metadata.get('response')
        # Update LLM query if this is an LLM task
        from models import LLMQuery
        query = LLMQuery.query.filter_by(query_id=metadata.get('query_id')).first()
        if query:
            query.response = result_text
            query.status = 'completed'
            from datetime import datetime
            query.completed_at = datetime.utcnow()
            db.session.commit()
    
    task = GPUService.update_task_progress(
        task_id,
        progress=data['progress'],
        error_message=data.get('error_message'),
        result=result_text
    )
    
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    
    result = task.to_dict()
    if metadata:
        result['metadata'] = metadata
    
    return jsonify(result)
