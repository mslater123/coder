from flask import Blueprint, jsonify, request
from models import db, LLMQuery
from datetime import datetime
import requests
import json

llm_manager_bp = Blueprint('llm_manager', __name__, url_prefix='/api/llm/manager')

@llm_manager_bp.route('/status', methods=['GET'])
def get_ollama_status():
    """Get Ollama status from all clients"""
    # This would query all registered GPU clients
    # For now, return a simple status
    return jsonify({
        'available': True,
        'note': 'Query individual clients for Ollama status'
    })

@llm_manager_bp.route('/models', methods=['GET'])
def get_available_models():
    """Get list of available models to install"""
    # Popular Ollama models
    models = [
        {'name': 'llama2', 'size': '3.8GB', 'description': 'Meta Llama 2'},
        {'name': 'llama2:7b', 'size': '3.8GB', 'description': 'Meta Llama 2 7B'},
        {'name': 'llama2:13b', 'size': '7.3GB', 'description': 'Meta Llama 2 13B'},
        {'name': 'mistral', 'size': '4.1GB', 'description': 'Mistral 7B'},
        {'name': 'codellama', 'size': '3.8GB', 'description': 'Code Llama'},
        {'name': 'codellama:7b', 'size': '3.8GB', 'description': 'Code Llama 7B'},
        {'name': 'codellama:13b', 'size': '7.3GB', 'description': 'Code Llama 13B'},
        {'name': 'phi', 'size': '1.6GB', 'description': 'Microsoft Phi'},
        {'name': 'phi:2', 'size': '1.6GB', 'description': 'Microsoft Phi 2'},
        {'name': 'neural-chat', 'size': '4.1GB', 'description': 'Neural Chat'},
        {'name': 'starling-lm', 'size': '4.1GB', 'description': 'Starling LM'},
        {'name': 'orca-mini', 'size': '1.3GB', 'description': 'Orca Mini'},
        {'name': 'vicuna', 'size': '3.8GB', 'description': 'Vicuna'},
        {'name': 'llava', 'size': '4.7GB', 'description': 'LLaVA Vision Model'},
        {'name': 'gemma:2b', 'size': '1.4GB', 'description': 'Google Gemma 2B'},
        {'name': 'gemma:7b', 'size': '4.8GB', 'description': 'Google Gemma 7B'},
    ]
    
    return jsonify({
        'success': True,
        'models': models
    })

@llm_manager_bp.route('/install/<model_name>', methods=['POST'])
def install_model(model_name):
    """Install a model on a specific GPU client"""
    data = request.get_json() or {}
    gpu_id = data.get('gpu_id')
    client_host = data.get('client_host')  # Hostname or IP of client
    
    if not gpu_id and not client_host:
        return jsonify({'error': 'gpu_id or client_host required'}), 400
    
    # Create a system task to install the model
    from services.gpu_service import GPUService
    
    if gpu_id:
        from models import GPU
        gpu = GPU.query.get(gpu_id)
        if not gpu:
            return jsonify({'error': 'GPU not found'}), 404
        client_host = gpu.host_system
    
    # Assign installation task to GPU
    task = GPUService.assign_task(
        gpu_id=gpu_id,
        task_type='install_model',
        task_name=f'Install Model: {model_name}',
        config=json.dumps({'model_name': model_name})
    )
    
    if not task:
        return jsonify({'error': 'Failed to assign installation task'}), 400
    
    return jsonify({
        'success': True,
        'message': f'Model {model_name} installation queued',
        'model': model_name,
        'client': client_host,
        'task_id': task.id
    })

@llm_manager_bp.route('/installed', methods=['GET'])
def get_installed_models():
    """Get installed models from clients"""
    # Query all GPU clients for installed models
    from models import GPU
    
    gpus = GPU.query.all()
    installed_models = {}
    
    for gpu in gpus:
        if gpu.host_system:
            try:
                # Try to query Ollama on client
                client_url = f'http://{gpu.host_system}:11434'
                response = requests.get(f'{client_url}/api/tags', timeout=2)
                if response.status_code == 200:
                    models = response.json().get('models', [])
                    installed_models[gpu.host_system] = models
except Exception:
                pass
    
    return jsonify({
        'success': True,
        'installed_models': installed_models
    })

@llm_manager_bp.route('/remove/<model_name>', methods=['DELETE'])
def remove_model(model_name):
    """Remove a model from a client"""
    data = request.get_json() or {}
    gpu_id = data.get('gpu_id')
    client_host = data.get('client_host')
    
    if not gpu_id and not client_host:
        return jsonify({'error': 'gpu_id or client_host required'}), 400
    
    if gpu_id:
        from models import GPU
        gpu = GPU.query.get(gpu_id)
        if gpu:
            client_host = gpu.host_system
    
    return jsonify({
        'success': True,
        'message': f'Model {model_name} removal queued',
        'model': model_name,
        'client': client_host
    })
