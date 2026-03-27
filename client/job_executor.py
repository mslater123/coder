#!/usr/bin/env python3
"""
Job Executor - Executes tasks on GPU or CPU
Supports AI training, AI inference, Ollama LLM, and general system tasks
"""

import subprocess
import threading
import time
import json
import os
import sys
from typing import Dict, Any, Optional
from datetime import datetime

class JobExecutor:
    """Executes jobs on GPU or CPU"""
    
    def __init__(self, gpu_id: int, task_id: int, task_type: str, config: Dict[str, Any], 
                 progress_callback=None, error_callback=None):
        self.gpu_id = gpu_id
        self.task_id = task_id
        self.task_type = task_type
        self.config = config or {}
        self.progress_callback = progress_callback
        self.error_callback = error_callback
        self.is_running = False
        self.process = None
        self.thread = None
        self.progress = 0.0
        
    def start(self):
        """Start executing the job"""
        if self.is_running:
            return False
        
        self.is_running = True
        self.thread = threading.Thread(target=self._execute, daemon=True)
        self.thread.start()
        return True
    
    def stop(self):
        """Stop the job execution"""
        self.is_running = False
        if self.process:
            try:
                self.process.terminate()
                self.process.wait(timeout=5)
            except:
                try:
                    self.process.kill()
                except:
                    pass
        return True
    
    def _execute(self):
        """Execute the job based on task type"""
        try:
            if self.task_type == 'ai_training':
                self._execute_ai_training()
            elif self.task_type == 'ai_inference':
                self._execute_ai_inference()
            elif self.task_type == 'system_task':
                self._execute_system_task()
            elif self.task_type == 'ollama_llm':
                self._execute_ollama_llm()
            else:
                raise ValueError(f"Unknown task type: {self.task_type}")
        except Exception as e:
            if self.error_callback:
                self.error_callback(self.task_id, str(e))
        finally:
            self.is_running = False
    
    def _execute_ai_training(self):
        """Execute AI model training"""
        print(f"[Task {self.task_id}] Starting AI training...")
        
        model_name = self.config.get('model', 'resnet50')
        epochs = self.config.get('epochs', 10)
        batch_size = self.config.get('batch_size', 32)
        
        try:
            import torch
            import torch.nn as nn
            import torch.optim as optim
            from torchvision import models, transforms
            
            device = torch.device('cuda' if torch.cuda.is_available() and self.gpu_id >= 0 else 'cpu')
            print(f"Using device: {device}")
            
            # Load model
            if model_name == 'resnet50':
                model = models.resnet50(pretrained=False)
            else:
                model = models.resnet18(pretrained=False)
            
            model = model.to(device)
            criterion = nn.CrossEntropyLoss()
            optimizer = optim.SGD(model.parameters(), lr=0.001, momentum=0.9)
            
            # Dummy data for training
            dummy_input = torch.randn(batch_size, 3, 224, 224).to(device)
            dummy_target = torch.randint(0, 1000, (batch_size,)).to(device)
            
            for epoch in range(epochs):
                if not self.is_running:
                    break
                
                optimizer.zero_grad()
                output = model(dummy_input)
                loss = criterion(output, dummy_target)
                loss.backward()
                optimizer.step()
                
                self.progress = ((epoch + 1) / epochs) * 100
                
                if self.progress_callback:
                    self.progress_callback(self.task_id, self.progress, {
                        'epoch': epoch + 1,
                        'loss': float(loss.item())
                    })
                
                print(f"Epoch {epoch + 1}/{epochs}, Loss: {loss.item():.4f}")
                time.sleep(0.5)
            
            print(f"[Task {self.task_id}] Training completed")
            
        except ImportError:
            # Simulate training if PyTorch not available
            print("PyTorch not available, simulating training...")
            for epoch in range(epochs):
                if not self.is_running:
                    break
                self.progress = ((epoch + 1) / epochs) * 100
                if self.progress_callback:
                    self.progress_callback(self.task_id, self.progress, {
                        'epoch': epoch + 1,
                        'loss': 0.5 - (epoch * 0.01)
                    })
                time.sleep(1)
        except Exception as e:
            raise Exception(f"AI training error: {e}")
    
    def _execute_ai_inference(self):
        """Execute AI model inference"""
        print(f"[Task {self.task_id}] Starting AI inference...")
        
        model_path = self.config.get('model_path', '')
        batch_size = self.config.get('batch_size', 32)
        num_batches = self.config.get('num_batches', 100)
        
        try:
            import torch
            import torch.nn as nn
            
            device = torch.device('cuda' if torch.cuda.is_available() and self.gpu_id >= 0 else 'cpu')
            
            # Load or create model
            if model_path and os.path.exists(model_path):
                model = torch.load(model_path)
            else:
                from torchvision import models
                model = models.resnet18(pretrained=True)
            
            model = model.to(device)
            model.eval()
            
            dummy_input = torch.randn(batch_size, 3, 224, 224).to(device)
            
            for batch_idx in range(num_batches):
                if not self.is_running:
                    break
                
                with torch.no_grad():
                    output = model(dummy_input)
                
                self.progress = ((batch_idx + 1) / num_batches) * 100
                
                if self.progress_callback:
                    self.progress_callback(self.task_id, self.progress, {
                        'batch': batch_idx + 1,
                        'throughput': batch_size / 0.1  # Estimated
                    })
                
                time.sleep(0.1)
            
            print(f"[Task {self.task_id}] Inference completed")
            
        except ImportError:
            # Simulate inference
            print("PyTorch not available, simulating inference...")
            for batch_idx in range(num_batches):
                if not self.is_running:
                    break
                self.progress = ((batch_idx + 1) / num_batches) * 100
                if self.progress_callback:
                    self.progress_callback(self.task_id, self.progress, {
                        'batch': batch_idx + 1
                    })
                time.sleep(0.1)
        except Exception as e:
            raise Exception(f"AI inference error: {e}")
    
    def _execute_system_task(self):
        """Execute general system task"""
        print(f"[Task {self.task_id}] Starting system task...")
        
        task_script = self.config.get('script', '')
        command = self.config.get('command', '')
        duration = self.config.get('duration', 60)  # seconds
        
        if task_script and os.path.exists(task_script):
            # Execute script
            self.process = subprocess.Popen(
                ['python', task_script],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            start_time = time.time()
            while self.is_running:
                if self.process.poll() is not None:
                    break
                
                elapsed = time.time() - start_time
                self.progress = min(100.0, (elapsed / duration) * 100)
                
                if self.progress_callback:
                    self.progress_callback(self.task_id, self.progress, {
                        'elapsed': elapsed
                    })
                
                time.sleep(1)
            
            if self.process.returncode != 0:
                stderr = self.process.stderr.read().decode() if self.process.stderr else ''
                raise Exception(f"Script failed: {stderr}")
                
        elif command:
            # Execute command
            self.process = subprocess.Popen(
                command.split(),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            start_time = time.time()
            while self.is_running:
                if self.process.poll() is not None:
                    break
                
                elapsed = time.time() - start_time
                self.progress = min(100.0, (elapsed / duration) * 100)
                
                if self.progress_callback:
                    self.progress_callback(self.task_id, self.progress, {
                        'elapsed': elapsed
                    })
                
                time.sleep(1)
        else:
            # Simulate generic CPU work
            print("No script/command provided, simulating CPU work...")
            start_time = time.time()
            iterations = 0
            
            while self.is_running and (time.time() - start_time) < duration:
                # CPU-intensive work
                _ = sum(range(10000))
                iterations += 1
                
                elapsed = time.time() - start_time
                self.progress = min(100.0, (elapsed / duration) * 100)
                
                if self.progress_callback:
                    self.progress_callback(self.task_id, self.progress, {
                        'iterations': iterations,
                        'elapsed': elapsed
                    })
                
                time.sleep(0.1)
    
    def _execute_ollama_llm(self):
        """Execute Ollama LLM inference"""
        print(f"[Task {self.task_id}] Starting Ollama LLM inference...")
        
        model_name = self.config.get('model', 'llama2')
        prompt = self.config.get('prompt', '')
        query_id = self.config.get('query_id')
        max_tokens = self.config.get('max_tokens', 512)
        temperature = self.config.get('temperature', 0.7)
        
        if not prompt:
            raise ValueError("Prompt is required for LLM inference")
        
        try:
            from ollama_manager import OllamaManager
            ollama = OllamaManager()
            
            # Check if Ollama is available
            if not ollama.is_available():
                print("Ollama not available, using fallback...")
                self._execute_ollama_fallback(prompt, query_id)
                return
            
            # Check if model is installed
            installed_models = ollama.get_installed_models()
            model_names = [m.get('name', '') for m in installed_models]
            
            if model_name not in model_names:
                print(f"Model {model_name} not installed, pulling...")
                self.progress = 10.0
                if self.progress_callback:
                    self.progress_callback(self.task_id, self.progress, {'status': 'pulling_model'})
                
                def pull_progress(data):
                    status = data.get('status', '')
                    if 'downloading' in status.lower():
                        completed = data.get('completed', 0)
                        total = data.get('total', 0)
                        if total > 0:
                            progress = 10 + (completed / total) * 40  # 10-50% for download
                            if self.progress_callback:
                                self.progress_callback(self.task_id, progress, {'status': status})
                
                if not ollama.pull_model(model_name, pull_progress):
                    raise Exception(f"Failed to pull model {model_name}")
            
            # Generate response
            print(f"Generating response with model {model_name}...")
            self.progress = 50.0
            if self.progress_callback:
                self.progress_callback(self.task_id, self.progress, {'status': 'generating'})
            
            response_text = ollama.generate(
                model=model_name,
                prompt=prompt,
                max_tokens=max_tokens,
                temperature=temperature
            )
            
            if not response_text:
                raise Exception("Failed to generate response")
            
            # Report progress and result
            self.progress = 100.0
            if self.progress_callback:
                self.progress_callback(self.task_id, self.progress, {
                    'response': response_text,
                    'query_id': query_id,
                    'model': model_name,
                    'done': True
                })
            
            print(f"[Task {self.task_id}] LLM inference completed")
            
        except ImportError:
            self._execute_ollama_fallback(prompt, query_id)
        except Exception as e:
            raise Exception(f"Ollama LLM error: {e}")
    
    def _execute_ollama_fallback(self, prompt, query_id):
        """Fallback LLM execution when Ollama is not available"""
        print("Using fallback LLM simulation...")
        
        # Simulate LLM response
        simulated_response = f"This is a simulated response to: {prompt[:50]}..."
        
        self.progress = 100.0
        if self.progress_callback:
            self.progress_callback(self.task_id, self.progress, {
                'response': simulated_response,
                'query_id': query_id,
                'model': 'simulated',
                'done': True,
                'note': 'Ollama not available, using simulation'
            })
