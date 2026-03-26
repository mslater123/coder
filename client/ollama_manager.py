#!/usr/bin/env python3
"""
Ollama Manager - Manages Ollama model installation and operations
"""

import requests
import subprocess
import time
import json
import os
from typing import List, Dict, Optional

OLLAMA_HOST = os.getenv('OLLAMA_HOST', 'localhost:11434')
OLLAMA_BASE_URL = f'http://{OLLAMA_HOST}'

class OllamaManager:
    """Manages Ollama models and operations"""
    
    def __init__(self):
        self.base_url = OLLAMA_BASE_URL
        self.timeout = 300  # 5 minutes for model pulls
    
    def is_available(self) -> bool:
        """Check if Ollama is available"""
        try:
            response = requests.get(f'{self.base_url}/api/tags', timeout=2)
            return response.status_code == 200
        except:
            return False
    
    def get_installed_models(self) -> List[Dict]:
        """Get list of installed models"""
        try:
            response = requests.get(f'{self.base_url}/api/tags', timeout=5)
            if response.status_code == 200:
                data = response.json()
                return data.get('models', [])
        except Exception as e:
            print(f"Error getting installed models: {e}")
        return []
    
    def pull_model(self, model_name: str, progress_callback=None) -> bool:
        """Pull/download a model"""
        try:
            print(f"Pulling model: {model_name}")
            response = requests.post(
                f'{self.base_url}/api/pull',
                json={'name': model_name},
                timeout=self.timeout,
                stream=True
            )
            
            if response.status_code != 200:
                print(f"Failed to pull model: {response.text}")
                return False
            
            # Stream progress
            for line in response.iter_lines():
                if line:
                    try:
                        data = json.loads(line)
                        status = data.get('status', '')
                        
                        if progress_callback:
                            progress_callback(data)
                        
                        if 'pulling' in status.lower():
                            print(f"Pulling: {status}")
                        elif 'downloading' in status.lower():
                            digest = data.get('digest', '')
                            completed = data.get('completed', 0)
                            total = data.get('total', 0)
                            if total > 0:
                                percent = (completed / total) * 100
                                print(f"Downloading: {percent:.1f}% ({completed}/{total} bytes)")
                        elif 'verifying' in status.lower():
                            print(f"Verifying: {status}")
                        elif 'success' in status.lower() or 'complete' in status.lower():
                            print(f"Model {model_name} pulled successfully!")
                            return True
                    except json.JSONDecodeError:
                        continue
            
            return True
        except Exception as e:
            print(f"Error pulling model: {e}")
            return False
    
    def remove_model(self, model_name: str) -> bool:
        """Remove a model"""
        try:
            response = requests.delete(
                f'{self.base_url}/api/delete',
                json={'name': model_name},
                timeout=30
            )
            return response.status_code == 200
        except Exception as e:
            print(f"Error removing model: {e}")
            return False
    
    def generate(self, model: str, prompt: str, stream: bool = False, 
                 max_tokens: int = 512, temperature: float = 0.7) -> Optional[str]:
        """Generate text using a model"""
        try:
            response = requests.post(
                f'{self.base_url}/api/generate',
                json={
                    'model': model,
                    'prompt': prompt,
                    'stream': stream,
                    'options': {
                        'num_predict': max_tokens,
                        'temperature': temperature
                    }
                },
                timeout=300
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get('response', '')
        except Exception as e:
            print(f"Error generating text: {e}")
        return None
    
    def get_model_info(self, model_name: str) -> Optional[Dict]:
        """Get information about a model"""
        try:
            response = requests.post(
                f'{self.base_url}/api/show',
                json={'name': model_name},
                timeout=10
            )
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            print(f"Error getting model info: {e}")
        return None
    
    def list_available_models(self) -> List[str]:
        """Get list of popular/available models"""
        # Common Ollama models
        return [
            'llama2',
            'llama2:7b',
            'llama2:13b',
            'llama2:70b',
            'mistral',
            'mistral:7b',
            'codellama',
            'codellama:7b',
            'codellama:13b',
            'phi',
            'phi:2',
            'neural-chat',
            'starling-lm',
            'orca-mini',
            'vicuna',
            'llava',
            'gemma:2b',
            'gemma:7b',
        ]
