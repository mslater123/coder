from flask import Blueprint, jsonify, request
from models import db, CodeEditorAgent, GPU, User, CodebaseAnalysis, ProjectFileCache
from datetime import datetime
import json
import requests
import os
import subprocess
from pathlib import Path
from services.codebase_analysis_service import (
    analyze_codebase, 
    calculate_directory_hash,
    detect_language_from_file
)
from services.auto_improvement_service import AutoImprovementService
from services.project_file_cache_service import (
    get_cached_file_tree,
    cache_file_tree,
    get_cached_file_content,
    cache_file_content,
    invalidate_file_cache,
    is_file_cached
)
from services.venv_service import (
    detect_venv,
    create_venv,
    install_package,
    install_requirements,
    list_packages,
    uninstall_package,
    get_venv_python_command,
    get_venv_activation_command
)

code_editor_bp = Blueprint('code_editor', __name__, url_prefix='/api/code-editor')

# Default code directory - use backend/code instead of data/code
CODE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'code')
os.makedirs(CODE_DIR, exist_ok=True)

def get_user_code_directory(user_id: str = None) -> str:
    """Get the code directory for a specific user: code/{user_uuid}/"""
    if not user_id:
        # If no user ID, return base CODE_DIR (for backward compatibility)
        return CODE_DIR
    
    # Validate user_id is a UUID (not an integer)
    if len(user_id) <= 10 or '-' not in user_id:
        # Invalid user ID format - use base CODE_DIR
        return CODE_DIR
    
    # Create user-specific directory: code/{user_uuid}/
    user_dir = os.path.join(CODE_DIR, user_id)
    try:
        os.makedirs(user_dir, exist_ok=True)
    except Exception as e:
        print(f"Error creating user code directory {user_dir}: {e}")
        raise
    return user_dir

def get_project_directory(project_id: str = None) -> str:
    """Get the project directory: code/{project_uuid}/ (shared by all project members)"""
    if not project_id:
        # If no project ID, return base CODE_DIR (for backward compatibility)
        return CODE_DIR
    
    # Validate project_id is a UUID (not an integer)
    if len(project_id) <= 10 or '-' not in project_id:
        # Invalid project ID format - use base CODE_DIR
        return CODE_DIR
    
    # Create project-specific directory: code/{project_uuid}/
    # This directory is shared by all users who have access to the project
    project_dir = os.path.join(CODE_DIR, project_id)
    try:
        os.makedirs(project_dir, exist_ok=True)
    except Exception as e:
        print(f"Error creating project directory {project_dir}: {e}")
        raise
    return project_dir

def get_current_user_id():
    """Get current user ID from request headers"""
    user_id = request.headers.get('X-User-Id')
    if user_id:
        user_id = str(user_id).strip()
        # Accept any non-empty user ID (UUID or other format)
        if user_id and len(user_id) > 0:
            return user_id
    # Fallback: try to get from JSON body (only for POST/PUT requests)
    if request.method in ['POST', 'PUT', 'PATCH']:
        try:
            data = request.get_json(silent=True) or {}
            user_id = data.get('current_user_id') or data.get('user_id')
            if user_id:
                user_id = str(user_id).strip()
                if user_id and len(user_id) > 0:
                    return user_id
        except Exception:
            pass
    return None

# Allowed base directories for security (users can work in these directories)
ALLOWED_BASE_DIRS = [
    CODE_DIR,
    os.path.expanduser('~'),  # User home directory
    os.path.expanduser('~/Documents'),
    os.path.expanduser('~/Projects'),
    os.path.expanduser('~/Code'),
]

def is_path_allowed(path: str, base_dir: str) -> bool:
    """Check if a path is within an allowed base directory"""
    abs_path = os.path.abspath(path)
    abs_base = os.path.abspath(base_dir)
    return abs_path.startswith(abs_base + os.sep) or abs_path == abs_base

def get_working_directory(user_path: str = None) -> str:
    """Get the working directory, defaulting to CODE_DIR if no path provided"""
    if not user_path:
        return CODE_DIR
    # Normalize the path
    user_path = os.path.expanduser(user_path)  # Expand ~ to home directory
    user_path = os.path.abspath(user_path)
    
    # Security: ensure the path is within an allowed base directory
    for base_dir in ALLOWED_BASE_DIRS:
        if is_path_allowed(user_path, base_dir):
            return user_path
    
    # If not in allowed dirs, default to CODE_DIR
    return CODE_DIR

def is_path_allowed(path: str, base_dir: str) -> bool:
    """Check if a path is within the allowed base directory"""
    try:
        abs_base = os.path.abspath(base_dir)
        abs_path = os.path.abspath(path)
        return abs_path.startswith(abs_base + os.sep) or abs_path == abs_base
    except:
        return False

@code_editor_bp.route('/agents', methods=['GET'])
def get_agents():
    """Get all code editor agents"""
    try:
        user_id = request.args.get('user_id')
        agent_type = request.args.get('type')  # local, remote, cloud, client
        
        query = CodeEditorAgent.query
        
        if user_id:
            query = query.filter_by(user_id=user_id)
        if agent_type:
            query = query.filter_by(agent_type=agent_type)
        
        agents = query.all()
        return jsonify({
            'success': True,
            'agents': [agent.to_dict() for agent in agents]
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@code_editor_bp.route('/agents', methods=['POST'])
def create_agent():
    """Create a new code editor agent"""
    try:
        data = request.get_json()
        
        agent_type = data.get('agent_type')  # local, remote, cloud, client
        if agent_type not in ['local', 'remote', 'cloud', 'client']:
            return jsonify({
                'success': False,
                'error': 'Invalid agent_type. Must be: local, remote, cloud, or client'
            }), 400
        
        # Validate required fields based on agent type
        if agent_type == 'local':
            # Local agent uses local GPU (optional - can be set later)
            gpu_id = data.get('gpu_id')
            # Allow creating without GPU initially
        elif agent_type == 'client':
            # Client agent needs GPU
            gpu_id = data.get('gpu_id')
            # Allow creating without GPU initially - will be required when executing
        elif agent_type == 'remote':
            # Remote agent needs host and port
            host = data.get('host')
            port = data.get('port')
            if not host or not port:
                return jsonify({
                    'success': False,
                    'error': 'host and port are required for remote agents'
                }), 400
        elif agent_type == 'cloud':
            # Cloud agent needs endpoint
            endpoint = data.get('endpoint')
            if not endpoint:
                return jsonify({
                    'success': False,
                    'error': 'endpoint is required for cloud agents'
                }), 400
        
        # Create agent
        agent = CodeEditorAgent(
            name=data.get('name'),
            agent_type=agent_type,
            user_id=data.get('user_id'),
            gpu_id=gpu_id if agent_type in ['local', 'client'] else None,
            host=host if agent_type == 'remote' else None,
            port=port if agent_type == 'remote' else None,
            endpoint=endpoint if agent_type == 'cloud' else None,
            api_key=data.get('api_key') if agent_type == 'cloud' else None,
            model=data.get('model', 'codellama'),
            max_tokens=data.get('max_tokens', 2048),
            temperature=data.get('temperature', 0.3),
            config=json.dumps(data.get('config', {})) if data.get('config') else None,
            is_active=data.get('is_active', True),
            is_available=data.get('is_available', True)
        )
        
        db.session.add(agent)
        try:
            db.session.commit()
        except Exception as commit_error:
            db.session.rollback()
            raise commit_error
        
        return jsonify({
            'success': True,
            'agent': agent.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@code_editor_bp.route('/agents/<int:agent_id>', methods=['GET'])
def get_agent(agent_id):
    """Get a specific agent"""
    try:
        agent = CodeEditorAgent.query.get(agent_id)
        if not agent:
            return jsonify({
                'success': False,
                'error': 'Agent not found'
            }), 404
        
        return jsonify({
            'success': True,
            'agent': agent.to_dict()
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@code_editor_bp.route('/agents/<int:agent_id>', methods=['PUT'])
def update_agent(agent_id):
    """Update an agent"""
    try:
        agent = CodeEditorAgent.query.get(agent_id)
        if not agent:
            return jsonify({
                'success': False,
                'error': 'Agent not found'
            }), 404
        
        data = request.get_json()
        
        # Update fields
        if 'name' in data:
            agent.name = data['name']
        if 'gpu_id' in data and agent.agent_type in ['local', 'client']:
            agent.gpu_id = data['gpu_id']
        if 'host' in data and agent.agent_type == 'remote':
            agent.host = data['host']
        if 'port' in data and agent.agent_type == 'remote':
            agent.port = data['port']
        if 'endpoint' in data and agent.agent_type == 'cloud':
            agent.endpoint = data['endpoint']
        if 'api_key' in data and agent.agent_type == 'cloud':
            agent.api_key = data['api_key']
        if 'model' in data:
            agent.model = data['model']
        if 'max_tokens' in data:
            agent.max_tokens = data['max_tokens']
        if 'temperature' in data:
            agent.temperature = data['temperature']
        if 'config' in data:
            agent.config = json.dumps(data['config']) if data['config'] else None
        if 'is_active' in data:
            agent.is_active = data['is_active']
        if 'is_available' in data:
            agent.is_available = data['is_available']
        
        agent.updated_at = datetime.utcnow()
        try:
            db.session.commit()
        except Exception as commit_error:
            db.session.rollback()
            raise commit_error
        
        return jsonify({
            'success': True,
            'agent': agent.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@code_editor_bp.route('/agents/<int:agent_id>', methods=['DELETE'])
def delete_agent(agent_id):
    """Delete an agent"""
    try:
        agent = CodeEditorAgent.query.get(agent_id)
        if not agent:
            return jsonify({
                'success': False,
                'error': 'Agent not found'
            }), 404
        
        db.session.delete(agent)
        try:
            db.session.commit()
        except Exception as commit_error:
            db.session.rollback()
            raise commit_error
        
        return jsonify({
            'success': True,
            'message': 'Agent deleted successfully'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@code_editor_bp.route('/agents/<int:agent_id>/test', methods=['POST'])
def test_agent(agent_id):
    """Test agent connection/availability"""
    try:
        agent = CodeEditorAgent.query.get(agent_id)
        if not agent:
            return jsonify({
                'success': False,
                'error': 'Agent not found'
            }), 404
        
        # Test based on agent type
        if agent.agent_type == 'local':
            # Check if GPU is available
            if agent.gpu_id:
                gpu = GPU.query.get(agent.gpu_id)
                if not gpu or not gpu.is_available:
                    return jsonify({
                        'success': False,
                        'error': 'GPU not available'
                    }), 400
            return jsonify({
                'success': True,
                'message': 'Local agent is available'
            }), 200
        
        elif agent.agent_type == 'remote':
            # Test remote connection
            if not agent.host or not agent.port:
                return jsonify({
                    'success': False,
                    'error': 'Remote agent not configured'
                }), 400
            
            try:
                response = requests.get(f"http://{agent.host}:{agent.port}/api/health", timeout=5)
                if response.status_code == 200:
                    return jsonify({
                        'success': True,
                        'message': 'Remote agent is available'
                    }), 200
                else:
                    return jsonify({
                        'success': False,
                        'error': f'Remote agent returned status {response.status_code}'
                    }), 400
            except requests.exceptions.RequestException as e:
                return jsonify({
                    'success': False,
                    'error': f'Failed to connect to remote agent: {str(e)}'
                }), 400
        
        elif agent.agent_type == 'cloud':
            # Test cloud endpoint
            if not agent.endpoint:
                return jsonify({
                    'success': False,
                    'error': 'Cloud agent not configured'
                }), 400
            
            headers = {'Content-Type': 'application/json'}
            if agent.api_key:
                headers['Authorization'] = f'Bearer {agent.api_key}'
            
            try:
                response = requests.get(agent.endpoint.replace('/v1/chat', '/health') if '/v1/chat' in agent.endpoint else agent.endpoint, headers=headers, timeout=5)
                return jsonify({
                    'success': True,
                    'message': 'Cloud agent endpoint is reachable'
                }), 200
            except requests.exceptions.RequestException as e:
                return jsonify({
                    'success': False,
                    'error': f'Failed to connect to cloud agent: {str(e)}'
                }), 400
        
        elif agent.agent_type == 'client':
            # Check if GPU is available
            if agent.gpu_id:
                gpu = GPU.query.get(agent.gpu_id)
                if not gpu or not gpu.is_available:
                    return jsonify({
                        'success': False,
                        'error': 'GPU not available'
                    }), 400
            return jsonify({
                'success': True,
                'message': 'Client agent is available'
            }), 200
        
        return jsonify({
            'success': False,
            'error': 'Unknown agent type'
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@code_editor_bp.route('/agents/available-gpus', methods=['GET'])
def get_available_gpus():
    """Get available GPUs for agent assignment"""
    try:
        gpu_type = request.args.get('type')  # local, client, all
        
        query = GPU.query.filter_by(is_available=True)
        
        if gpu_type == 'local':
            query = query.filter_by(gpu_type='local')
        elif gpu_type == 'client':
            query = query.filter_by(gpu_type='client')
        # If 'all' or not specified, return all available GPUs
        
        gpus = query.all()
        return jsonify({
            'success': True,
            'gpus': [gpu.to_dict() for gpu in gpus]
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@code_editor_bp.route('/agents/<int:agent_id>/execute', methods=['POST'])
def execute_with_agent(agent_id):
    """Execute an AI request using the specified agent"""
    try:
        agent = CodeEditorAgent.query.get(agent_id)
        if not agent:
            return jsonify({
                'success': False,
                'error': 'Agent not found'
            }), 404
        
        if not agent.is_active:
            return jsonify({
                'success': False,
                'error': 'Agent is not active'
            }), 400
        
        data = request.get_json()
        
        # Handle Cursor-style payload with messages and context
        if 'messages' in data:
            # Extract prompt from messages (last user message)
            messages = data.get('messages', [])
            user_messages = [m for m in messages if m.get('role') == 'user']
            if not user_messages:
                return jsonify({
                    'success': False,
                    'error': 'No user message found in messages array'
                }), 400
            
            # Build comprehensive prompt with context (Cursor style)
            context = data.get('context', {})
            current_file = context.get('currentFile', {})
            codebase = context.get('codebase', [])
            
            # Build context string
            context_parts = []
            if current_file.get('path'):
                context_parts.append(f"Current file: {current_file.get('path')}")
                if current_file.get('content'):
                    context_parts.append(f"\n```{current_file.get('language', '')}\n{current_file.get('content')}\n```")
            
            if codebase:
                context_parts.append(f"\nCodebase context ({len(codebase)} files):")
                for file_info in codebase[:10]:  # Limit to 10 files
                    if file_info.get('path') != current_file.get('path'):
                        context_parts.append(f"\n{file_info.get('path')}:")
                        if file_info.get('content'):
                            content_preview = file_info.get('content', '')[:500]  # Limit content preview
                            context_parts.append(f"```{file_info.get('language', '')}\n{content_preview}\n```")
            
            # Build final prompt
            # Handle multimodal content (can be string or list of content parts)
            last_user_message = user_messages[-1]
            content = last_user_message.get('content', '')
            
            # If content is a list (multimodal format), extract text parts
            if isinstance(content, list):
                text_parts = []
                for part in content:
                    if isinstance(part, dict):
                        # Handle OpenAI/Anthropic format: {"type": "text", "text": "..."}
                        if part.get('type') == 'text' and 'text' in part:
                            text_parts.append(str(part['text']))
                        # Handle image parts (we'll skip them for prompt extraction)
                        elif part.get('type') in ['image_url', 'image']:
                            # Images are included in the payload but we extract text for prompt
                            continue
                    elif isinstance(part, str):
                        text_parts.append(part)
                user_prompt = ' '.join(text_parts).strip()
            else:
                # Content is a string
                user_prompt = str(content).strip() if content else ''
            
            if not user_prompt:
                return jsonify({
                    'success': False,
                    'error': 'User message content is required and cannot be empty'
                }), 400
            
            if context_parts:
                prompt = f"{user_prompt}\n\nContext:\n{''.join(context_parts)}"
            else:
                prompt = user_prompt
            
            # Use model settings from payload if provided
            model = data.get('model', agent.model)
            max_tokens = data.get('max_tokens', agent.max_tokens)
            temperature = data.get('temperature', float(agent.temperature) if agent.temperature else 0.3)
        else:
            # Legacy format - just prompt
            prompt = data.get('prompt', '').strip()
            model = agent.model
            max_tokens = agent.max_tokens
            temperature = float(agent.temperature) if agent.temperature else 0.3
        
        if not prompt:
            return jsonify({
                'success': False,
                'error': 'Prompt is required and cannot be empty'
            }), 400
        
        # Route to appropriate handler based on agent type
        if agent.agent_type in ['local', 'client']:
            # Use LLM API with GPU - use GPUService to assign task
            from services.gpu_service import GPUService
            from models import LLMQuery
            import uuid
            
            if not agent.gpu_id:
                return jsonify({
                    'success': False,
                    'error': 'No GPU assigned to agent'
                }), 400
            
            # Create LLM query
            query_id = str(uuid.uuid4())
            query = LLMQuery(
                query_id=query_id,
                user_id=agent.user_id,
                prompt=prompt,
                model=model,
                gpu_id=agent.gpu_id,
                status='pending'
            )
            db.session.add(query)
            db.session.flush()
            
            # Assign task to GPU using GPUService
            task = GPUService.assign_task(
                gpu_id=agent.gpu_id,
                task_type='ollama_llm',
                user_id=agent.user_id,
                task_name=f'Code Editor: {agent.name}',
                config=json.dumps({
                    'prompt': prompt,
                    'model': model,
                    'query_id': query_id,
                    'max_tokens': max_tokens,
                    'temperature': temperature
                })
            )
            
            if not task:
                db.session.rollback()
                return jsonify({
                    'success': False,
                    'error': 'Failed to assign task to GPU'
                }), 400
            
            # Link task to query
            query.task_id = task.id
            query.status = 'running'
            db.session.commit()
            
            # Update last_used
            agent.last_used = datetime.utcnow()
            db.session.commit()
            
            return jsonify({
                'success': True,
                'query_id': query_id,
                'query': query.to_dict(),
                'task': task.to_dict()
            }), 201
        
        elif agent.agent_type == 'remote':
            # Forward to remote endpoint
            if not agent.host or not agent.port:
                return jsonify({
                    'success': False,
                    'error': 'Remote agent not configured'
                }), 400
            
            endpoint = f"http://{agent.host}:{agent.port}/api/llm/query"
            # Send Cursor-style payload if available, otherwise legacy format
            if 'messages' in data:
                response = requests.post(endpoint, json=data, timeout=60)
            else:
                response = requests.post(endpoint, json={
                    'prompt': prompt,
                    'model': model,
                    'max_tokens': max_tokens,
                    'temperature': temperature
                }, timeout=60)
            
            if response.status_code == 200:
                # Update last_used timestamp
                agent.last_used = datetime.utcnow()
                try:
                    db.session.commit()
                except Exception:
                    db.session.rollback()
                
                remote_data = response.json()
                # Normalize response format - if it has a response field, return it directly
                if 'response' in remote_data:
                    return jsonify({
                        'success': True,
                        'response': remote_data.get('response'),
                        'query_id': remote_data.get('query_id'),
                        'query': remote_data.get('query')
                    }), 200
                return jsonify(remote_data), 200
            else:
                return jsonify({
                    'success': False,
                    'error': f'Remote agent error: {response.text}'
                }), response.status_code
        
        elif agent.agent_type == 'cloud':
            # Forward to cloud API
            if not agent.endpoint:
                return jsonify({
                    'success': False,
                    'error': 'Cloud agent not configured'
                }), 400
            
            # Validate endpoint URL
            if not agent.endpoint.startswith(('http://', 'https://')):
                return jsonify({
                    'success': False,
                    'error': f'Invalid endpoint URL. Must start with http:// or https://. Got: {agent.endpoint}'
                }), 400
            
            # Auto-detect and fix LM Studio / OpenAI-compatible endpoints
            endpoint_url = agent.endpoint
            # If endpoint doesn't end with /v1/chat/completions, try to append it
            # This handles cases where user enters just the base URL (e.g., http://localhost:1234)
            if '/v1/chat/completions' not in endpoint_url and '/v1' not in endpoint_url:
                # Remove trailing slash if present
                endpoint_url = endpoint_url.rstrip('/')
                # Append OpenAI-compatible endpoint
                endpoint_url = endpoint_url + '/v1/chat/completions'
            elif endpoint_url.endswith('/v1'):
                # If it ends with /v1, append /chat/completions
                endpoint_url = endpoint_url + '/chat/completions'
            
            headers = {'Content-Type': 'application/json'}
            if agent.api_key:
                headers['Authorization'] = f'Bearer {agent.api_key}'
            
            try:
                # Send Cursor-style payload for cloud agents (OpenAI/Anthropic format)
                if 'messages' in data:
                    # For OpenAI-compatible APIs (LM Studio, OpenAI, etc.), use standard format
                    cloud_payload = {
                        'model': model,
                        'messages': data.get('messages', []),
                        'temperature': temperature,
                        'max_tokens': max_tokens,
                        'stream': False  # Disable streaming for now
                    }
                    response = requests.post(endpoint_url, json=cloud_payload, headers=headers, timeout=60)
                else:
                    # Legacy format - convert prompt to messages format for OpenAI compatibility
                    cloud_payload = {
                        'model': model,
                        'messages': [
                            {'role': 'user', 'content': prompt}
                        ],
                        'temperature': temperature,
                        'max_tokens': max_tokens,
                        'stream': False
                    }
                    response = requests.post(endpoint_url, json=cloud_payload, headers=headers, timeout=60)
            except requests.exceptions.RequestException as e:
                return jsonify({
                    'success': False,
                    'error': f'Failed to connect to cloud agent: {str(e)}'
                }), 500
            
            if response.status_code in [200, 201]:
                try:
                    cloud_data = response.json()
                except ValueError:
                    return jsonify({
                        'success': False,
                        'error': f'Invalid JSON response from cloud agent: {response.text[:200]}'
                    }), 500
                
                # Normalize response format - OpenAI-compatible APIs return choices array
                cloud_response = None
                if 'choices' in cloud_data and cloud_data.get('choices'):
                    # OpenAI format: choices[0].message.content
                    cloud_response = cloud_data.get('choices', [{}])[0].get('message', {}).get('content', '')
                elif 'response' in cloud_data:
                    cloud_response = cloud_data.get('response')
                elif 'content' in cloud_data:
                    cloud_response = cloud_data.get('content')
                elif 'text' in cloud_data:
                    cloud_response = cloud_data.get('text')
                
                if cloud_response:
                    # Update last_used timestamp
                    agent.last_used = datetime.utcnow()
                    try:
                        db.session.commit()
                    except Exception:
                        db.session.rollback()
                    
                    return jsonify({
                        'success': True,
                        'response': cloud_response,
                        'query_id': cloud_data.get('id') or cloud_data.get('query_id'),
                        'query': cloud_data.get('query')
                    }), 200
                return jsonify({
                    'success': False,
                    'error': f'Unexpected response format from cloud agent: {json.dumps(cloud_data)[:200]}'
                }), 500
            else:
                error_text = response.text[:500] if response.text else 'No error message'
                return jsonify({
                    'success': False,
                    'error': f'Cloud agent error (HTTP {response.status_code}): {error_text}'
                }), response.status_code
        
        # Update last_used
        agent.last_used = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': False,
            'error': 'Unknown agent type'
        }), 400
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@code_editor_bp.route('/files', methods=['GET'])
def list_files():
    """List files in the user's project directory"""
    try:
        # Get user ID from headers
        user_id = get_current_user_id()
        
        # Get project ID from query params (project UUID)
        project_id = request.args.get('project_id', '')
        
        # CRITICAL: ALWAYS require valid user_id for file operations
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'User authentication required. Please log in.'
            }), 401
        
        # Verify user exists
        from models import User
        user = User.query.get(user_id)
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found. Please log in again.'
            }), 404
        
        # CRITICAL: ALWAYS require project_id for file operations
        # Structure: code/{project_uuid}/
        if not project_id:
            return jsonify({
                'success': False,
                'error': 'Project ID is required. Please select a project.'
            }), 400
        
        # Validate project_id format (should be UUID)
        if len(project_id) <= 10 or '-' not in project_id:
            return jsonify({
                'success': False,
                'error': 'Invalid project ID format. Please select a valid project.'
            }), 400
        
        # Verify user has access to this project
        from models import Project, project_users
        project = Project.query.get(project_id)
        if not project:
            return jsonify({
                'success': False,
                'error': 'Project not found'
            }), 404
        
        # Check if user is attached to the project
        user_attached = db.session.query(project_users).filter_by(
            project_id=project_id, 
            user_id=user_id
        ).first()
        
        if not user_attached and project.created_by != user_id:
            return jsonify({
                'success': False,
                'error': 'You do not have access to this project'
            }), 403
        
        # Get project directory: code/{project_uuid}/ (shared by all project members)
        working_dir = get_project_directory(project_id)
        
        # Get working directory from query params (for backward compatibility)
        # BUT: If project_id is provided, DO NOT allow working_dir_param to override
        # This ensures project isolation - each project only sees its own files
        working_dir_param = request.args.get('working_dir', '')
        if working_dir_param and not project_id:
            # Only allow working_dir override if no project is specified
            working_dir_param = get_working_directory(working_dir_param)
            # Security: ensure it's within allowed directories
            if is_path_allowed(working_dir_param, CODE_DIR):
                working_dir = working_dir_param
        
        # Ensure CODE_DIR exists
        if not os.path.exists(CODE_DIR):
            os.makedirs(CODE_DIR, exist_ok=True)
        
        # Ensure working_dir exists
        if not os.path.exists(working_dir):
            os.makedirs(working_dir, exist_ok=True)
        
        path = request.args.get('path', '')
        
        # If path is provided, resolve it relative to working directory
        if path:
            # Normalize path - remove leading slash and prevent directory traversal
            path = path.lstrip('/')
            
            # Security: prevent directory traversal
            if '..' in path or os.path.isabs(path):
                return jsonify({
                    'success': False,
                    'error': 'Invalid path'
                }), 400
            full_path = os.path.join(working_dir, path)
        else:
            full_path = working_dir
        
        # Ensure the full path is within working directory (security check)
        if not is_path_allowed(full_path, working_dir):
            return jsonify({
                'success': False,
                'error': 'Invalid path'
            }), 400
        
        if not os.path.exists(full_path):
            return jsonify({
                'success': False,
                'error': 'Path does not exist'
            }), 404
        
        if not os.path.isdir(full_path):
            return jsonify({
                'success': False,
                'error': 'Path is not a directory'
            }), 400
        
        # Cache disabled - always read from disk
        cached_files = None
        
        # Skip cache check
        if False and cached_files:
            return jsonify({
                'success': True,
                'files': cached_files,
                'cached': True
            }), 200
        
        # Otherwise, scan directory
        files = []
        
        def scan_directory(current_path: str, base_path: str = working_dir):
            """Recursively scan directory and add all files and folders"""
            try:
                for item in sorted(os.listdir(current_path)):
                    # Skip hidden files like .gitkeep
                    if item.startswith('.') and item != '.':
                        continue
                    
                    item_path = os.path.join(current_path, item)
                    rel_path = os.path.relpath(item_path, base_path)
                    
                    # Normalize path to use forward slashes
                    # Paths should be relative to the project directory (base_path)
                    normalized_path = '/' + rel_path.replace(os.sep, '/')
                    
                    files.append({
                        'name': item,
                        'path': normalized_path,
                        'type': 'folder' if os.path.isdir(item_path) else 'file',
                        'size': os.path.getsize(item_path) if os.path.isfile(item_path) else 0
                    })
                    
                    # Recursively scan subdirectories
                    if os.path.isdir(item_path):
                        scan_directory(item_path, base_path)
            except PermissionError:
                pass
            except Exception:
                pass
        
        # Start scanning from the full_path (which is already the project directory)
        scan_directory(full_path, working_dir)
        
        # Cache disabled - don't cache file tree
        
        return jsonify({
            'success': True,
            'files': files,
            'cached': False
        }), 200
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error in list_files: {str(e)}")
        print(f"Traceback: {error_traceback}")
        print(f"User ID received: {get_current_user_id()}")
        print(f"Project name: {request.args.get('project_name', '')}")
        # Return error as JSON with proper content type
        response = jsonify({
            'success': False,
            'error': str(e),
            'traceback': error_traceback if os.getenv('FLASK_DEBUG') == 'True' else None
        })
        response.headers['Content-Type'] = 'application/json'
        return response, 500

@code_editor_bp.route('/files/read', methods=['GET'])
def read_file():
    """Read a file from the user's project directory"""
    try:
        # Get user ID from headers
        user_id = get_current_user_id()
        
        # CRITICAL: ALWAYS require valid user_id for file operations
        if not user_id or len(user_id) <= 10 or '-' not in user_id:
            return jsonify({
                'success': False,
                'error': 'User authentication required. Please log in.'
            }), 401
        
        # Get project ID from query params (project UUID)
        project_id = request.args.get('project_id', '')
        
        # CRITICAL: ALWAYS require project_id for file operations
        if not project_id or len(project_id) <= 10 or '-' not in project_id:
            return jsonify({
                'success': False,
                'error': 'Project ID is required. Please select a project.'
            }), 400
        
        # Verify user has access to this project
        from models import Project, project_users
        project = Project.query.get(project_id)
        if not project:
            return jsonify({
                'success': False,
                'error': 'Project not found'
            }), 404
        
        # Check if user is attached to the project
        user_attached = db.session.query(project_users).filter_by(
            project_id=project_id, 
            user_id=user_id
        ).first()
        
        if not user_attached and project.created_by != user_id:
            return jsonify({
                'success': False,
                'error': 'You do not have access to this project'
            }), 403
        
        # Get project directory: code/{project_uuid}/ (shared by all project members)
        working_dir = get_project_directory(project_id)
        
        # Get working directory from query params (for backward compatibility)
        working_dir_param = request.args.get('working_dir', '')
        if working_dir_param:
            working_dir_param = get_working_directory(working_dir_param)
            # Security: ensure it's within allowed directories
            if is_path_allowed(working_dir_param, CODE_DIR) or (user_id and len(user_id) > 10 and '-' in user_id and is_path_allowed(working_dir_param, get_user_code_directory(user_id))):
                working_dir = working_dir_param
        
        path = request.args.get('path', '')
        if not path:
            return jsonify({
                'success': False,
                'error': 'Path is required'
            }), 400
        
        # Normalize path - remove leading slash and prevent directory traversal
        path = path.lstrip('/')
        
        # Paths are relative to project directory, no need to remove project name
        
        # Security: prevent directory traversal
        if '..' in path or os.path.isabs(path):
            return jsonify({
                'success': False,
                'error': 'Invalid path'
            }), 400
        
        full_path = os.path.join(working_dir, path)
        
        # Ensure the full path is within working directory (security check)
        if not is_path_allowed(full_path, working_dir):
            return jsonify({
                'success': False,
                'error': 'Invalid path'
            }), 400
        
        if not os.path.exists(full_path):
            return jsonify({
                'success': False,
                'error': 'File does not exist'
            }), 404
        
        if not os.path.isfile(full_path):
            return jsonify({
                'success': False,
                'error': 'Path is not a file'
            }), 400
        
        # Always read from disk - cache disabled
        try:
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
        except UnicodeDecodeError:
            # Binary file or encoding issue - return empty
            return jsonify({
                'success': False,
                'error': 'File is binary or cannot be decoded as text'
            }), 400
        
        return jsonify({
            'success': True,
            'content': content,
            'path': '/' + path,  # Return normalized path with leading slash
            'cached': False
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@code_editor_bp.route('/files/write', methods=['POST'])
def write_file():
    """Write a file to the user's project directory"""
    try:
        # Get user ID from headers
        user_id = get_current_user_id()
        
        # CRITICAL: ALWAYS require valid user_id for file operations
        if not user_id or len(user_id) <= 10 or '-' not in user_id:
            return jsonify({
                'success': False,
                'error': 'User authentication required. Please log in.'
            }), 401
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request body is required'
            }), 400
        
        # Get project ID from request (project UUID)
        project_id = data.get('project_id', '')
        
        # CRITICAL: ALWAYS require project_id for file operations
        if not project_id or len(project_id) <= 10 or '-' not in project_id:
            return jsonify({
                'success': False,
                'error': 'Project ID is required. Please select a project.'
            }), 400
        
        # Verify user has access to this project
        from models import Project, project_users
        project = Project.query.get(project_id)
        if not project:
            return jsonify({
                'success': False,
                'error': 'Project not found'
            }), 404
        
        # Check if user is attached to the project
        user_attached = db.session.query(project_users).filter_by(
            project_id=project_id, 
            user_id=user_id
        ).first()
        
        if not user_attached and project.created_by != user_id:
            return jsonify({
                'success': False,
                'error': 'You do not have access to this project'
            }), 403
        
        # Get project directory: code/{project_uuid}/ (shared by all project members)
        working_dir = get_project_directory(project_id)
        
        # Get working directory from request (for backward compatibility)
        # BUT: If project_id is provided, DO NOT allow working_dir_param to override
        # This ensures project isolation - files go to the correct project folder
        working_dir_param = data.get('working_dir', '')
        if working_dir_param and not project_id:
            # Only allow working_dir override if no project is specified
            working_dir_param = get_working_directory(working_dir_param)
            # Security: ensure it's within allowed directories
            if is_path_allowed(working_dir_param, CODE_DIR):
                working_dir = working_dir_param
        
        path = data.get('path', '')
        content = data.get('content', '')
        encoding = data.get('encoding', 'text')  # 'text' or 'base64'
        
        if not path:
            return jsonify({
                'success': False,
                'error': 'Path is required'
            }), 400
        
        # Normalize path - trim whitespace, remove leading slash
        original_path = path
        path = path.strip().lstrip('/')
        
        # Paths are relative to project directory, no need to remove project name
        
        # Check if path is empty after normalization
        if not path:
            return jsonify({
                'success': False,
                'error': f'Path cannot be empty. Original: "{original_path}"'
            }), 400
        
        # Remove any trailing slashes (files shouldn't end with /)
        path = path.rstrip('/')
        
        if not path:
            return jsonify({
                'success': False,
                'error': f'Path cannot be empty after normalization. Original: "{original_path}"'
            }), 400
        
        # Security: prevent directory traversal - this is the most important check
        if '..' in path or os.path.isabs(path):
            return jsonify({
                'success': False,
                'error': 'Invalid path'
            }), 400
        
        # Build full path and validate it's within working directory
        # Use normpath to handle any path normalization issues
        full_path = os.path.normpath(os.path.join(working_dir, path))
        
        # Ensure the full path is within working directory (security check)
        abs_working_dir = os.path.abspath(working_dir)
        abs_full_path = os.path.abspath(full_path)
        
        # Use realpath to resolve any symlinks
        try:
            real_working_dir = os.path.realpath(abs_working_dir)
            real_full_path = os.path.realpath(abs_full_path)
            
            if not real_full_path.startswith(real_working_dir + os.sep) and real_full_path != real_working_dir:
                return jsonify({
                    'success': False,
                    'error': f'Path outside working directory. Working dir: {real_working_dir}, Full path: {real_full_path}'
                }), 400
        except OSError:
            # If realpath fails, fall back to abspath check
            if not abs_full_path.startswith(abs_working_dir + os.sep) and abs_full_path != abs_working_dir:
                return jsonify({
                    'success': False,
                    'error': f'Path outside working directory. Working dir: {abs_working_dir}, Full path: {abs_full_path}'
                }), 400
        
        # Create directory if it doesn't exist
        # Handle case where file is at root (dirname might be empty or just working_dir)
        dir_path = os.path.dirname(full_path)
        abs_dir_path = os.path.abspath(dir_path) if dir_path else abs_working_dir
        
        # Only create directory if it's different from working directory and not empty
        if dir_path and abs_dir_path != abs_working_dir:
            try:
                # Check if the directory path already exists as a file (not a directory)
                if os.path.exists(dir_path) and not os.path.isdir(dir_path):
                    return jsonify({
                        'success': False,
                        'error': f'Path exists but is not a directory: {os.path.basename(dir_path)}'
                    }), 400
                # Create directory (exist_ok=True handles if it already exists)
                os.makedirs(dir_path, exist_ok=True)
            except OSError as e:
                # If the error is that the path exists as a file, return a clearer error
                if e.errno == 17:  # EEXIST - file/directory exists
                    if os.path.exists(dir_path) and not os.path.isdir(dir_path):
                        return jsonify({
                            'success': False,
                            'error': f'Cannot create directory: path exists as a file: {os.path.basename(dir_path)}'
                        }), 400
                    # If it exists as a directory, that's fine, continue
                else:
                    return jsonify({
                        'success': False,
                        'error': f'Failed to create directory: {str(e)}'
                    }), 500
        
        try:
            if encoding == 'base64':
                # Handle binary files - decode base64 and write as binary
                import base64
                try:
                    binary_content = base64.b64decode(content)
                    with open(full_path, 'wb') as f:
                        f.write(binary_content)
                except Exception as decode_error:
                    return jsonify({
                        'success': False,
                        'error': f'Failed to decode base64 content: {str(decode_error)}'
                    }), 400
            else:
                # Handle text files - write as UTF-8
                with open(full_path, 'w', encoding='utf-8') as f:
                    f.write(content)
        except OSError as e:
            return jsonify({
                'success': False,
                'error': f'Failed to write file: {str(e)}'
            }), 500
        
        # Cache disabled - don't update cache
        
        return jsonify({
            'success': True,
            'path': '/' + path  # Return normalized path with leading slash
        }), 200
    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'error': f'Unexpected error: {str(e)}',
            'traceback': traceback.format_exc() if os.getenv('FLASK_DEBUG') == 'True' else None
        }), 500

@code_editor_bp.route('/files', methods=['DELETE'])
def delete_file():
    """Delete a file or directory from the user's project directory"""
    try:
        # Get user ID from headers
        user_id = get_current_user_id()
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
        
        # Get project ID from query params (project UUID)
        project_id = request.args.get('project_id', '')
        
        # If project_id is provided, use project directory
        if project_id and len(project_id) > 10 and '-' in project_id:
            # Verify user has access to this project
            from models import Project, project_users
            project = Project.query.get(project_id)
            if project:
                # Check if user is attached to the project
                user_attached = db.session.query(project_users).filter_by(
                    project_id=project_id, 
                    user_id=user_id
                ).first()
                
                if user_attached or project.created_by == user_id:
                    # Get project directory: code/{user_uuid}/{project_name}/
                    working_dir = get_project_directory(user_id, project.name)
                else:
                    return jsonify({
                        'success': False,
                        'error': 'You do not have access to this project'
                    }), 403
            else:
                # Project not found, fall back to user directory
                working_dir = get_user_code_directory(user_id)
        else:
            # No project_id, use user's code directory
            working_dir = get_user_code_directory(user_id)
        
        # Get working directory from query params (for backward compatibility)
        working_dir_param = request.args.get('working_dir', '')
        if working_dir_param:
            working_dir_param = get_working_directory(working_dir_param)
            # Security: ensure it's within user's directory
            user_code_dir = get_user_code_directory(user_id)
            if not is_path_allowed(working_dir_param, user_code_dir):
                working_dir = user_code_dir
            else:
                working_dir = working_dir_param
        
        path = request.args.get('path', '')
        if not path:
            return jsonify({
                'success': False,
                'error': 'Path is required'
            }), 400
        
        # Normalize path - remove leading slash and prevent directory traversal
        path = path.lstrip('/')
        
        # Security: prevent directory traversal
        if '..' in path or os.path.isabs(path):
            return jsonify({
                'success': False,
                'error': 'Invalid path'
            }), 400
        
        full_path = os.path.join(working_dir, path)
        
        # Ensure the full path is within working directory (security check)
        if not is_path_allowed(full_path, working_dir):
            return jsonify({
                'success': False,
                'error': 'Invalid path'
            }), 400
        
        if not os.path.exists(full_path):
            return jsonify({
                'success': False,
                'error': 'Path does not exist'
            }), 404
        
        if os.path.isdir(full_path):
            import shutil
            shutil.rmtree(full_path)
            # Invalidate cache for entire directory tree
            invalidate_file_cache(working_dir, None, working_dir)
        else:
            os.remove(full_path)
            # Invalidate cache for this specific file
            invalidate_file_cache(working_dir, path, working_dir)
        
        return jsonify({
            'success': True
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@code_editor_bp.route('/git/status', methods=['GET'])
def git_status():
    """Get git status for the code directory or specified working directory"""
    try:
        repo_path = request.args.get('path', '')
        if not repo_path:
            repo_path = CODE_DIR
        else:
            repo_path = get_working_directory(repo_path)
        
        # Security: ensure path is within allowed directories
        if not any(is_path_allowed(repo_path, base_dir) for base_dir in ALLOWED_BASE_DIRS):
            return jsonify({
                'success': False,
                'error': 'Invalid repository path'
            }), 400
        
        if not os.path.exists(os.path.join(repo_path, '.git')):
            return jsonify({
                'success': False,
                'is_git_repo': False,
                'message': 'Not a git repository'
            }), 200
        
        result = subprocess.run(
            ['git', 'status', '--porcelain'],
            cwd=repo_path,
            capture_output=True,
            text=True,
            timeout=5
        )
        
        status_lines = result.stdout.strip().split('\n') if result.stdout.strip() else []
        
        return jsonify({
            'success': True,
            'is_git_repo': True,
            'status': status_lines,
            'has_changes': len(status_lines) > 0
        }), 200
    except subprocess.TimeoutExpired:
        return jsonify({
            'success': False,
            'error': 'Git command timed out'
        }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@code_editor_bp.route('/git/init', methods=['POST'])
def git_init():
    """Initialize a git repository"""
    try:
        data = request.get_json()
        repo_path = data.get('path', '')
        if not repo_path:
            repo_path = CODE_DIR
        else:
            repo_path = get_working_directory(repo_path)
        
        # Security: ensure path is within allowed directories
        if not any(is_path_allowed(repo_path, base_dir) for base_dir in ALLOWED_BASE_DIRS):
            return jsonify({
                'success': False,
                'error': 'Invalid repository path'
            }), 400
        
        result = subprocess.run(
            ['git', 'init'],
            cwd=repo_path,
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode != 0:
            return jsonify({
                'success': False,
                'error': result.stderr
            }), 500
        
        return jsonify({
            'success': True,
            'message': 'Git repository initialized'
        }), 200
    except subprocess.TimeoutExpired:
        return jsonify({
            'success': False,
            'error': 'Git command timed out'
        }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@code_editor_bp.route('/git/clone', methods=['POST'])
def git_clone():
    """Clone a git repository"""
    try:
        data = request.get_json()
        repo_url = data.get('url', '')
        target_path = data.get('path', '')
        
        if not repo_url:
            return jsonify({
                'success': False,
                'error': 'Repository URL is required'
            }), 400
        
        if not target_path:
            target_path = os.path.join(CODE_DIR, os.path.basename(repo_url).replace('.git', ''))
        else:
            # Normalize target path
            target_path = get_working_directory(target_path)
            # If it's a directory, append the repo name
            if os.path.isdir(target_path):
                repo_name = os.path.basename(repo_url).replace('.git', '')
                target_path = os.path.join(target_path, repo_name)
        
        # Security: ensure target path is within allowed directories
        if not any(is_path_allowed(target_path, base_dir) for base_dir in ALLOWED_BASE_DIRS):
            return jsonify({
                'success': False,
                'error': 'Invalid target path'
            }), 400
        
        result = subprocess.run(
            ['git', 'clone', repo_url, target_path],
            cwd=CODE_DIR,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode != 0:
            return jsonify({
                'success': False,
                'error': result.stderr
            }), 500
        
        return jsonify({
            'success': True,
            'path': target_path,
            'message': 'Repository cloned successfully'
        }), 200
    except subprocess.TimeoutExpired:
        return jsonify({
            'success': False,
            'error': 'Git clone timed out'
        }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@code_editor_bp.route('/git/push', methods=['POST'])
def git_push():
    """Push changes to remote repository"""
    try:
        data = request.get_json()
        repo_path = data.get('path', '')
        remote = data.get('remote', 'origin')
        branch = data.get('branch', '')
        
        if not repo_path:
            repo_path = CODE_DIR
        else:
            repo_path = get_working_directory(repo_path)
        
        # Security: ensure path is within allowed directories
        if not any(is_path_allowed(repo_path, base_dir) for base_dir in ALLOWED_BASE_DIRS):
            return jsonify({
                'success': False,
                'error': 'Invalid repository path'
            }), 400
        
        if not os.path.exists(os.path.join(repo_path, '.git')):
            return jsonify({
                'success': False,
                'error': 'Not a git repository'
            }), 400
        
        # Build git push command
        cmd = ['git', 'push']
        if remote:
            cmd.append(remote)
        if branch:
            cmd.append(branch)
        
        result = subprocess.run(
            cmd,
            cwd=repo_path,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode != 0:
            return jsonify({
                'success': False,
                'error': result.stderr or result.stdout
            }), 500
        
        return jsonify({
            'success': True,
            'message': 'Code pushed successfully'
        }), 200
    except subprocess.TimeoutExpired:
        return jsonify({
            'success': False,
            'error': 'Git push timed out'
        }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@code_editor_bp.route('/git/commit', methods=['POST'])
def git_commit():
    """Commit changes to repository"""
    try:
        data = request.get_json()
        repo_path = data.get('path', '')
        message = data.get('message', 'Update files')
        files = data.get('files', [])
        
        if not repo_path:
            repo_path = CODE_DIR
        else:
            repo_path = get_working_directory(repo_path)
        
        # Security: ensure path is within allowed directories
        if not any(is_path_allowed(repo_path, base_dir) for base_dir in ALLOWED_BASE_DIRS):
            return jsonify({
                'success': False,
                'error': 'Invalid repository path'
            }), 400
        
        if not os.path.exists(os.path.join(repo_path, '.git')):
            return jsonify({
                'success': False,
                'error': 'Not a git repository'
            }), 400
        
        # Stage files (or all if no files specified)
        if files:
            for file in files:
                file_path = os.path.join(repo_path, file)
                if os.path.exists(file_path):
                    subprocess.run(
                        ['git', 'add', file],
                        cwd=repo_path,
                        capture_output=True,
                        text=True,
                        timeout=5
                    )
        else:
            # Stage all changes
            subprocess.run(
                ['git', 'add', '-A'],
                cwd=repo_path,
                capture_output=True,
                text=True,
                timeout=5
            )
        
        # Commit
        result = subprocess.run(
            ['git', 'commit', '-m', message],
            cwd=repo_path,
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode != 0:
            # Check if there are no changes to commit
            if 'nothing to commit' in result.stdout.lower() or 'nothing to commit' in result.stderr.lower():
                return jsonify({
                    'success': True,
                    'message': 'No changes to commit'
                }), 200
            return jsonify({
                'success': False,
                'error': result.stderr or result.stdout
            }), 500
        
        return jsonify({
            'success': True,
            'message': 'Changes committed successfully'
        }), 200
    except subprocess.TimeoutExpired:
        return jsonify({
            'success': False,
            'error': 'Git commit timed out'
        }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def analyze_codebase(working_dir: str, max_files: int = 50) -> dict:
    """Analyze codebase structure and provide summary"""
    try:
        analysis = {
            'total_files': 0,
            'total_dirs': 0,
            'file_types': {},
            'files_by_language': {},
            'largest_files': [],
            'recent_files': [],
            'structure': {}
        }
        
        def scan_directory(path: str, relative_path: str = '', depth: int = 0, max_depth: int = 5):
            """Recursively scan directory"""
            if depth > max_depth:
                return
            
            try:
                items = os.listdir(path)
                for item in items:
                    if item.startswith('.'):
                        continue
                    
                    item_path = os.path.join(path, item)
                    rel_item_path = os.path.join(relative_path, item) if relative_path else item
                    
                    if os.path.isdir(item_path):
                        analysis['total_dirs'] += 1
                        scan_directory(item_path, rel_item_path, depth + 1, max_depth)
                    elif os.path.isfile(item_path):
                        analysis['total_files'] += 1
                        
                        # Get file extension
                        ext = os.path.splitext(item)[1].lstrip('.')
                        if ext:
                            analysis['file_types'][ext] = analysis['file_types'].get(ext, 0) + 1
                        
                        # Detect language
                        language_map = {
                            'py': 'Python', 'js': 'JavaScript', 'ts': 'TypeScript',
                            'jsx': 'JavaScript', 'tsx': 'TypeScript', 'java': 'Java',
                            'cpp': 'C++', 'c': 'C', 'go': 'Go', 'rs': 'Rust',
                            'php': 'PHP', 'rb': 'Ruby', 'swift': 'Swift',
                            'kt': 'Kotlin', 'scala': 'Scala', 'html': 'HTML',
                            'css': 'CSS', 'json': 'JSON', 'xml': 'XML',
                            'md': 'Markdown', 'yaml': 'YAML', 'yml': 'YAML',
                            'sql': 'SQL', 'sh': 'Shell', 'bash': 'Bash'
                        }
                        language = language_map.get(ext.lower(), 'Other')
                        analysis['files_by_language'][language] = analysis['files_by_language'].get(language, 0) + 1
                        
                        # Track file size
                        try:
                            size = os.path.getsize(item_path)
                            analysis['largest_files'].append({
                                'path': '/' + rel_item_path.replace(os.sep, '/'),
                                'name': item,
                                'size': size,
                                'language': language
                            })
                        except:
                            pass
                        
                        # Track modification time
                        try:
                            mtime = os.path.getmtime(item_path)
                            analysis['recent_files'].append({
                                'path': '/' + rel_item_path.replace(os.sep, '/'),
                                'name': item,
                                'mtime': mtime,
                                'language': language
                            })
                        except:
                            pass
                        
                        if analysis['total_files'] >= max_files:
                            return
            except PermissionError:
                pass
            except Exception:
                pass
        
        scan_directory(working_dir)
        
        # Sort largest files
        analysis['largest_files'].sort(key=lambda x: x['size'], reverse=True)
        analysis['largest_files'] = analysis['largest_files'][:10]
        
        # Sort recent files
        analysis['recent_files'].sort(key=lambda x: x['mtime'], reverse=True)
        analysis['recent_files'] = analysis['recent_files'][:10]
        
        return analysis
    except Exception as e:
        return {'error': str(e)}

@code_editor_bp.route('/analyze', methods=['GET', 'POST'])
def analyze_codebase_endpoint():
    """Analyze codebase structure and provide summary with caching"""
    try:
        # Get user ID from headers
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'User authentication required'
            }), 401
        
        # Get user-specific code directory
        user_code_dir = get_user_code_directory(user_id)
        
        if request.method == 'POST':
            data = request.get_json() or {}
            working_dir = data.get('working_dir', '')
            force_refresh = data.get('force_refresh', False)
        else:
            working_dir = request.args.get('working_dir', '')
            force_refresh = request.args.get('force_refresh', 'false').lower() == 'true'
        
        if working_dir:
            working_dir = get_working_directory(working_dir)
            # Security: ensure it's within user's directory
            if not is_path_allowed(working_dir, user_code_dir):
                working_dir = user_code_dir
        else:
            working_dir = user_code_dir
        
        # Default to analyzing ALL files (None = no limit)
        if request.method == 'POST' and request.is_json:
            data = request.get_json() or {}
            max_files = data.get('max_files')  # None means analyze all
            include_content = data.get('include_content', True)
        else:
            max_files_arg = request.args.get('max_files')
            max_files = int(max_files_arg) if max_files_arg else None
            include_content = request.args.get('include_content', 'true').lower() == 'true'
        
        # Security: ensure path is within allowed directories
        if not any(is_path_allowed(working_dir, base_dir) for base_dir in ALLOWED_BASE_DIRS):
            return jsonify({
                'success': False,
                'error': 'Invalid working directory'
            }), 400
        
        if not os.path.exists(working_dir):
            return jsonify({
                'success': False,
                'error': 'Working directory does not exist'
            }), 404
        
        # Calculate hash for cache lookup (use higher limit for hash to catch all changes)
        analysis_hash = calculate_directory_hash(working_dir, max_files or 10000)
        project_path = os.path.relpath(working_dir, CODE_DIR) if working_dir.startswith(CODE_DIR) else working_dir
        
        # Check cache
        cached_analysis = None
        if not force_refresh:
            cached_analysis = CodebaseAnalysis.query.filter_by(
                project_path=project_path,
                analysis_hash=analysis_hash
            ).first()
        
        if cached_analysis:
            return jsonify({
                'success': True,
                'analysis': cached_analysis.to_dict()['analysis_data'],
                'cached': True,
                'cache_id': cached_analysis.id,
                'updated_at': cached_analysis.updated_at.isoformat()
            }), 200
        
        # Perform comprehensive analysis using the service (analyzes ALL files with content)
        # Import the service function explicitly to avoid conflict with local function
        from services.codebase_analysis_service import analyze_codebase as analyze_codebase_service
        analysis = analyze_codebase_service(working_dir, max_files=max_files, include_content=include_content)
        
        if 'error' in analysis:
            return jsonify({
                'success': False,
                'error': analysis['error']
            }), 500
        
        # Store in cache
        try:
            # Check if existing cache entry exists
            existing = CodebaseAnalysis.query.filter_by(project_path=project_path).first()
            
            if existing:
                # Update existing cache
                existing.analysis_hash = analysis_hash
                existing.analysis_data = json.dumps(analysis)
                existing.file_count = analysis.get('total_files', 0)
                existing.language_breakdown = json.dumps(analysis.get('files_by_language', {}))
                existing.dependencies = json.dumps(analysis.get('dependencies', {}))
                existing.functions = json.dumps(analysis.get('functions', []))
                existing.classes = json.dumps(analysis.get('classes', []))
                existing.imports = json.dumps(analysis.get('imports', []))
                existing.structure_summary = analysis.get('structure_summary', '')
                existing.updated_at = datetime.utcnow()
            else:
                # Create new cache entry
                new_cache = CodebaseAnalysis(
                    project_path=project_path,
                    working_dir=working_dir,
                    analysis_hash=analysis_hash,
                    analysis_data=json.dumps(analysis),
                    file_count=analysis.get('total_files', 0),
                    language_breakdown=json.dumps(analysis.get('files_by_language', {})),
                    dependencies=json.dumps(analysis.get('dependencies', {})),
                    functions=json.dumps(analysis.get('functions', [])),
                    classes=json.dumps(analysis.get('classes', [])),
                    imports=json.dumps(analysis.get('imports', [])),
                    structure_summary=analysis.get('structure_summary', '')
                )
                db.session.add(new_cache)
            
            db.session.commit()
        except Exception as e:
            # If cache fails, still return analysis
            print(f"Failed to cache analysis: {e}")
            db.session.rollback()
        
        return jsonify({
            'success': True,
            'analysis': analysis,
            'cached': False
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@code_editor_bp.route('/analysis/cache', methods=['GET'])
def get_cached_analysis():
    """Get cached analysis for a project"""
    try:
        working_dir = request.args.get('working_dir', '')
        if working_dir:
            working_dir = get_working_directory(working_dir)
        else:
            working_dir = CODE_DIR
        
        project_path = os.path.relpath(working_dir, CODE_DIR) if working_dir.startswith(CODE_DIR) else working_dir
        
        cached_analysis = CodebaseAnalysis.query.filter_by(project_path=project_path).first()
        
        if not cached_analysis:
            return jsonify({
                'success': False,
                'error': 'No cached analysis found'
            }), 404
        
        return jsonify({
            'success': True,
            'analysis': cached_analysis.to_dict()
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@code_editor_bp.route('/analysis/cache', methods=['DELETE'])
def clear_cached_analysis():
    """Clear cached analysis for a project"""
    try:
        working_dir = request.args.get('working_dir', '')
        if working_dir:
            working_dir = get_working_directory(working_dir)
        else:
            working_dir = CODE_DIR
        
        project_path = os.path.relpath(working_dir, CODE_DIR) if working_dir.startswith(CODE_DIR) else working_dir
        
        cached_analysis = CodebaseAnalysis.query.filter_by(project_path=project_path).first()
        
        if cached_analysis:
            db.session.delete(cached_analysis)
            db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Cache cleared'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@code_editor_bp.route('/analysis/summary', methods=['GET'])
def get_analysis_summary():
    """Get a concise summary of the codebase for AI context"""
    try:
        # Get user ID from headers (optional for this endpoint, but preferred)
        user_id = get_current_user_id()
        
        # Get project ID from query params if provided
        project_id = request.args.get('project_id')
        
        working_dir = request.args.get('working_dir', '')
        if working_dir:
            working_dir = get_working_directory(working_dir)
        elif project_id:
            # Use project directory if project_id is provided
            working_dir = get_project_directory(project_id)
        elif user_id:
            # Use user directory if user_id is available
            working_dir = get_user_code_directory(user_id)
        else:
            working_dir = CODE_DIR
        
        # Calculate project_path for cache lookup
        # Try multiple path formats to find cached analysis
        project_path = os.path.relpath(working_dir, CODE_DIR) if working_dir.startswith(CODE_DIR) else working_dir
        
        # Also try with project_id as path if provided
        search_paths = [project_path]
        if project_id:
            search_paths.append(project_id)
            # Also try project_id as a subdirectory
            search_paths.append(os.path.join(project_id, ''))
        
        cached_analysis = None
        for search_path in search_paths:
            cached_analysis = CodebaseAnalysis.query.filter_by(project_path=search_path).first()
            if cached_analysis:
                break
        
        if not cached_analysis:
            # Return 200 with success: false instead of 404 to allow graceful handling
            return jsonify({
                'success': False,
                'summary': None,
                'error': 'No analysis found. Please run analysis first.'
            }), 200
        
        analysis_data = cached_analysis.to_dict()
        
        # Parse the full analysis data
        analysis_json = json.loads(cached_analysis.analysis_data) if isinstance(cached_analysis.analysis_data, str) else cached_analysis.analysis_data
        
        # Get all files with their content for AI context
        files_with_content = []
        if 'files' in analysis_json:
            for file_info in analysis_json['files']:
                # Include file content if available (for code files and config files)
                file_entry = {
                    'path': file_info.get('path'),
                    'name': file_info.get('name'),
                    'language': file_info.get('language'),
                    'size': file_info.get('size'),
                    'functions': file_info.get('functions', []),
                    'classes': file_info.get('classes', []),
                    'imports': file_info.get('imports', [])
                }
                # Include content if available (helps AI understand the full codebase)
                if 'content' in file_info:
                    file_entry['content'] = file_info['content']
                files_with_content.append(file_entry)
        
        # Create comprehensive summary for AI with full file information
        summary = {
            'structure': analysis_json.get('structure_summary', analysis_data.get('structure_summary', '')),
            'languages': analysis_json.get('files_by_language', analysis_data.get('language_breakdown', {})),
            'file_count': analysis_json.get('total_files', analysis_data.get('file_count', 0)),
            'total_dirs': analysis_json.get('total_dirs', 0),
            'all_files': files_with_content,  # Include all files with content for full context
            'functions': analysis_json.get('functions', analysis_data.get('functions', []))[:100],  # Top 100 functions
            'classes': analysis_json.get('classes', analysis_data.get('classes', []))[:100],  # Top 100 classes
            'dependencies': analysis_json.get('dependencies', {}),
            'key_dependencies': {}
        }
        
        # Extract key dependencies
        deps = analysis_json.get('dependencies', analysis_data.get('dependencies', {}))
        if deps:
            all_deps = set()
            for file_deps in deps.values():
                if isinstance(file_deps, list):
                    all_deps.update(file_deps)
            summary['key_dependencies'] = sorted(list(all_deps))[:50]  # Top 50 dependencies
        
        return jsonify({
            'success': True,
            'summary': summary
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@code_editor_bp.route('/improvements/analyze', methods=['POST'])
def analyze_improvements():
    """Analyze codebase for potential improvements"""
    try:
        # Get user ID from headers
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'User authentication required'
            }), 401
        
        # Get user-specific code directory
        user_code_dir = get_user_code_directory(user_id)
        
        data = request.get_json() or {}
        working_dir = data.get('working_dir', '')
        max_files = data.get('max_files', 100)
        
        if working_dir:
            working_dir = get_working_directory(working_dir)
            # Security: ensure it's within user's directory
            if not is_path_allowed(working_dir, user_code_dir):
                working_dir = user_code_dir
        else:
            working_dir = user_code_dir
        project_name = data.get('project_name', '')
        
        if working_dir:
            working_dir = get_working_directory(working_dir)
        else:
            working_dir = CODE_DIR
        
        # If project_name is provided, look for project directory
        if project_name:
            # Try to find project in CODE_DIR
            project_path = os.path.join(CODE_DIR, project_name)
            if os.path.exists(project_path):
                working_dir = project_path
            # Also check if working_dir contains the project
            elif working_dir and project_name in working_dir:
                # working_dir already contains project, use it
                pass
            else:
                # Try to find project in working_dir
                potential_project_path = os.path.join(working_dir, project_name)
                if os.path.exists(potential_project_path):
                    working_dir = potential_project_path
        
        # Security: ensure path is within allowed directories
        if not any(is_path_allowed(working_dir, base_dir) for base_dir in ALLOWED_BASE_DIRS):
            return jsonify({
                'success': False,
                'error': 'Invalid working directory'
            }), 400
        
        if not os.path.exists(working_dir):
            return jsonify({
                'success': False,
                'error': 'Working directory does not exist'
            }), 404
        
        service = AutoImprovementService()
        analysis = service.analyze_codebase(working_dir, max_files, project_name)
        
        return jsonify({
            'success': True,
            'analysis': analysis
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@code_editor_bp.route('/improvements/apply', methods=['POST'])
def apply_improvements():
    """Apply auto-improvements to codebase"""
    try:
        # Get user ID from headers
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'User authentication required'
            }), 401
        
        # Get user-specific code directory
        user_code_dir = get_user_code_directory(user_id)
        
        data = request.get_json() or {}
        working_dir = data.get('working_dir', '')
        
        if working_dir:
            working_dir = get_working_directory(working_dir)
            # Security: ensure it's within user's directory
            if not is_path_allowed(working_dir, user_code_dir):
                working_dir = user_code_dir
        else:
            working_dir = user_code_dir
        improvements = data.get('improvements', [])
        auto_apply_all = data.get('auto_apply_all', False)
        
        if working_dir:
            working_dir = get_working_directory(working_dir)
        else:
            working_dir = CODE_DIR
        
        # Security: ensure path is within allowed directories
        if not any(is_path_allowed(working_dir, base_dir) for base_dir in ALLOWED_BASE_DIRS):
            return jsonify({
                'success': False,
                'error': 'Invalid working directory'
            }), 400
        
        if not os.path.exists(working_dir):
            return jsonify({
                'success': False,
                'error': 'Working directory does not exist'
            }), 404
        
        service = AutoImprovementService()
        
        if auto_apply_all:
            # Analyze and apply all auto-applicable improvements
            analysis = service.analyze_codebase(working_dir, 100)
            auto_improvements = [imp for imp in analysis['improvements'] if imp['auto_apply']]
            results = service.apply_auto_improvements(auto_improvements, working_dir)
        else:
            # Apply specific improvements
            results = service.apply_auto_improvements(improvements, working_dir)
        
        return jsonify({
            'success': True,
            'results': results
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@code_editor_bp.route('/improvements/auto', methods=['POST'])
def auto_improve_codebase():
    """Automatically analyze and apply improvements continuously"""
    try:
        # Get user ID from headers
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'User authentication required'
            }), 401
        
        # Get user-specific code directory
        user_code_dir = get_user_code_directory(user_id)
        
        data = request.get_json() or {}
        working_dir = data.get('working_dir', '')
        
        if working_dir:
            working_dir = get_working_directory(working_dir)
            # Security: ensure it's within user's directory
            if not is_path_allowed(working_dir, user_code_dir):
                working_dir = user_code_dir
        else:
            working_dir = user_code_dir
        max_files = data.get('max_files', 50)
        max_improvements = data.get('max_improvements', 10)
        project_name = data.get('project_name', '')
        
        if working_dir:
            working_dir = get_working_directory(working_dir)
        else:
            working_dir = CODE_DIR
        
        # If project_name is provided, look for project directory
        if project_name:
            # Try to find project in CODE_DIR
            project_path = os.path.join(CODE_DIR, project_name)
            if os.path.exists(project_path):
                working_dir = project_path
            # Also check if working_dir contains the project
            elif working_dir and project_name in working_dir:
                # working_dir already contains project, use it
                pass
            else:
                # Try to find project in working_dir
                potential_project_path = os.path.join(working_dir, project_name)
                if os.path.exists(potential_project_path):
                    working_dir = potential_project_path
        
        # Security: ensure path is within allowed directories
        if not any(is_path_allowed(working_dir, base_dir) for base_dir in ALLOWED_BASE_DIRS):
            return jsonify({
                'success': False,
                'error': 'Invalid working directory'
            }), 400
        
        if not os.path.exists(working_dir):
            return jsonify({
                'success': False,
                'error': 'Working directory does not exist'
            }), 404
        
        service = AutoImprovementService()
        
        # Analyze for improvements
        analysis = service.analyze_codebase(working_dir, max_files, project_name)
        
        # Get auto-applicable improvements, sorted by priority
        auto_improvements = [imp for imp in analysis['improvements'] if imp['auto_apply']]
        auto_improvements.sort(key=lambda x: (x['priority'], x['confidence']), reverse=True)
        
        # Apply top improvements
        improvements_to_apply = auto_improvements[:max_improvements]
        results = service.apply_auto_improvements(improvements_to_apply, working_dir, project_name)
        
        return jsonify({
            'success': True,
            'analysis': analysis,
            'results': results,
            'message': f"Applied {results['applied']} improvements to {len(results['files_modified'])} files"
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Virtual Environment Management Routes
@code_editor_bp.route('/venv/detect', methods=['GET'])
def detect_virtual_environment():
    """Detect virtual environment in the project"""
    try:
        working_dir = request.args.get('working_dir', '')
        if working_dir:
            working_dir = get_working_directory(working_dir)
        else:
            working_dir = CODE_DIR
        
        # Security: ensure path is within allowed directories
        if not any(is_path_allowed(working_dir, base_dir) for base_dir in ALLOWED_BASE_DIRS):
            return jsonify({
                'success': False,
                'error': 'Invalid working directory'
            }), 400
        
        venv_info = detect_venv(working_dir)
        
        if venv_info:
            return jsonify({
                'success': True,
                'venv': venv_info
            }), 200
        else:
            return jsonify({
                'success': True,
                'venv': None,
                'message': 'No virtual environment detected'
            }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@code_editor_bp.route('/venv/create', methods=['POST'])
def create_virtual_environment():
    """Create a new virtual environment"""
    try:
        data = request.get_json() or {}
        working_dir = data.get('working_dir', '')
        if working_dir:
            working_dir = get_working_directory(working_dir)
        else:
            working_dir = CODE_DIR
        
        venv_name = data.get('name', 'venv')
        python_version = data.get('python_version')
        
        # Security: ensure path is within allowed directories
        if not any(is_path_allowed(working_dir, base_dir) for base_dir in ALLOWED_BASE_DIRS):
            return jsonify({
                'success': False,
                'error': 'Invalid working directory'
            }), 400
        
        result = create_venv(working_dir, venv_name, python_version)
        
        if result['success']:
            return jsonify({
                'success': True,
                'venv': {
                    'path': result['path'],
                    'name': result['name'],
                    'python_path': result['python_path']
                },
                'message': result['message']
            }), 201
        else:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@code_editor_bp.route('/venv/packages', methods=['GET'])
def list_venv_packages():
    """List packages installed in the virtual environment"""
    try:
        working_dir = request.args.get('working_dir', '')
        venv_path = request.args.get('venv_path', '')
        
        if not venv_path:
            if working_dir:
                working_dir = get_working_directory(working_dir)
            else:
                working_dir = CODE_DIR
            
            venv_info = detect_venv(working_dir)
            if not venv_info:
                return jsonify({
                    'success': False,
                    'error': 'No virtual environment found'
                }), 404
            venv_path = venv_info['path']
        else:
            # Security: ensure venv path is within allowed directories
            if not any(is_path_allowed(venv_path, base_dir) for base_dir in ALLOWED_BASE_DIRS):
                return jsonify({
                    'success': False,
                    'error': 'Invalid virtual environment path'
                }), 400
        
        result = list_packages(venv_path)
        
        if result['success']:
            return jsonify({
                'success': True,
                'packages': result['packages']
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@code_editor_bp.route('/venv/install', methods=['POST'])
def install_venv_package():
    """Install a package in the virtual environment"""
    try:
        data = request.get_json() or {}
        working_dir = data.get('working_dir', '')
        venv_path = data.get('venv_path', '')
        package = data.get('package', '')
        upgrade = data.get('upgrade', False)
        
        if not package:
            return jsonify({
                'success': False,
                'error': 'Package name is required'
            }), 400
        
        if not venv_path:
            if working_dir:
                working_dir = get_working_directory(working_dir)
            else:
                working_dir = CODE_DIR
            
            venv_info = detect_venv(working_dir)
            if not venv_info:
                return jsonify({
                    'success': False,
                    'error': 'No virtual environment found'
                }), 404
            venv_path = venv_info['path']
        else:
            # Security: ensure venv path is within allowed directories
            if not any(is_path_allowed(venv_path, base_dir) for base_dir in ALLOWED_BASE_DIRS):
                return jsonify({
                    'success': False,
                    'error': 'Invalid virtual environment path'
                }), 400
        
        result = install_package(venv_path, package, upgrade)
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': result['message'],
                'output': result.get('output', '')
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': result['error'],
                'output': result.get('output', '')
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@code_editor_bp.route('/venv/install-requirements', methods=['POST'])
def install_venv_requirements():
    """Install packages from requirements.txt"""
    try:
        data = request.get_json() or {}
        working_dir = data.get('working_dir', '')
        venv_path = data.get('venv_path', '')
        requirements_file = data.get('requirements_file', '')
        
        if not requirements_file:
            # Default to requirements.txt in working directory
            if working_dir:
                working_dir = get_working_directory(working_dir)
            else:
                working_dir = CODE_DIR
            requirements_file = os.path.join(working_dir, 'requirements.txt')
        else:
            # Security: ensure requirements file is within allowed directories
            if not any(is_path_allowed(requirements_file, base_dir) for base_dir in ALLOWED_BASE_DIRS):
                return jsonify({
                    'success': False,
                    'error': 'Invalid requirements file path'
                }), 400
        
        if not venv_path:
            if working_dir:
                working_dir = get_working_directory(working_dir)
            else:
                working_dir = CODE_DIR
            
            venv_info = detect_venv(working_dir)
            if not venv_info:
                return jsonify({
                    'success': False,
                    'error': 'No virtual environment found'
                }), 404
            venv_path = venv_info['path']
        
        result = install_requirements(venv_path, requirements_file)
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': result['message'],
                'output': result.get('output', '')
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': result['error'],
                'output': result.get('output', '')
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@code_editor_bp.route('/venv/uninstall', methods=['POST'])
def uninstall_venv_package():
    """Uninstall a package from the virtual environment"""
    try:
        data = request.get_json() or {}
        working_dir = data.get('working_dir', '')
        venv_path = data.get('venv_path', '')
        package = data.get('package', '')
        
        if not package:
            return jsonify({
                'success': False,
                'error': 'Package name is required'
            }), 400
        
        if not venv_path:
            if working_dir:
                working_dir = get_working_directory(working_dir)
            else:
                working_dir = CODE_DIR
            
            venv_info = detect_venv(working_dir)
            if not venv_info:
                return jsonify({
                    'success': False,
                    'error': 'No virtual environment found'
                }), 404
            venv_path = venv_info['path']
        else:
            # Security: ensure venv path is within allowed directories
            if not any(is_path_allowed(venv_path, base_dir) for base_dir in ALLOWED_BASE_DIRS):
                return jsonify({
                    'success': False,
                    'error': 'Invalid virtual environment path'
                }), 400
        
        result = uninstall_package(venv_path, package)
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': result['message'],
                'output': result.get('output', '')
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@code_editor_bp.route('/venv/python-path', methods=['GET'])
def get_venv_python_path():
    """Get the Python executable path from the virtual environment"""
    try:
        working_dir = request.args.get('working_dir', '')
        venv_path = request.args.get('venv_path', '')
        
        if not venv_path:
            if working_dir:
                working_dir = get_working_directory(working_dir)
            else:
                working_dir = CODE_DIR
            
            venv_info = detect_venv(working_dir)
            if not venv_info:
                return jsonify({
                    'success': False,
                    'error': 'No virtual environment found'
                }), 404
            venv_path = venv_info['path']
        else:
            # Security: ensure venv path is within allowed directories
            if not any(is_path_allowed(venv_path, base_dir) for base_dir in ALLOWED_BASE_DIRS):
                return jsonify({
                    'success': False,
                    'error': 'Invalid virtual environment path'
                }), 400
        
        python_path = get_venv_python_command(venv_path)
        
        if python_path:
            return jsonify({
                'success': True,
                'python_path': python_path,
                'activation_command': get_venv_activation_command(venv_path)
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Could not find Python executable in virtual environment'
            }), 404
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
