#!/usr/bin/env python3
"""
GPU Client — detects GPUs, registers with the Coder backend, and runs assigned
AI / system / Ollama-related tasks.
"""

import requests
import time
import json
import subprocess
import platform
import socket
from datetime import datetime
import os
import threading
from job_executor import JobExecutor
from ollama_manager import OllamaManager

BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5000')
CLIENT_ID = os.getenv('CLIENT_ID', socket.gethostname())
UPDATE_INTERVAL = 5  # seconds

class GPUClient:
    """Main GPU client class"""
    
    def __init__(self):
        self.gpus = []
        self.registered_gpus = []
        self.running_jobs = {}  # task_id -> JobExecutor
        self.running = True
        
    def detect_nvidia_gpus(self):
        """Detect NVIDIA GPUs using nvidia-smi"""
        gpus = []
        try:
            result = subprocess.run(
                ['nvidia-smi', '--query-gpu=index,name,memory.total,memory.used,memory.free,driver_version,temperature.gpu,power.draw,utilization.gpu', 
                 '--format=csv,noheader,nounits'],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                for line in lines:
                    parts = [p.strip() for p in line.split(',')]
                    if len(parts) >= 9:
                        gpus.append({
                            'device_id': f'nvidia_{parts[0]}',
                            'name': parts[1],
                            'vendor': 'NVIDIA',
                            'memory_total': int(parts[2]) * 1024 * 1024 * 1024 if parts[2].isdigit() else None,
                            'memory_used': int(parts[3]) * 1024 * 1024 * 1024 if parts[3].isdigit() else None,
                            'memory_free': int(parts[4]) * 1024 * 1024 * 1024 if parts[4].isdigit() else None,
                            'driver_version': parts[5],
                            'temperature': int(parts[6]) if parts[6].isdigit() else None,
                            'power_usage': float(parts[7]) if parts[7].replace('.', '').isdigit() else None,
                            'utilization': float(parts[8].replace('%', '')) if parts[8].replace('%', '').replace('.', '').isdigit() else None,
                        })
        except (subprocess.TimeoutExpired, FileNotFoundError, Exception) as e:
            print(f"nvidia-smi not available: {e}")
        
        return gpus
    
    def register_gpus(self, gpus):
        """Register detected GPUs with backend"""
        try:
            response = requests.post(
                f'{BACKEND_URL}/api/gpus/detect',
                json={'gpus': gpus, 'host_system': CLIENT_ID},
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                print(f"Registered {data.get('count', 0)} GPUs")
                return data.get('gpus', [])
        except Exception as e:
            print(f"Error registering GPUs: {e}")
        return []
    
    def update_gpu_status(self, gpu_id, status):
        """Update GPU status on backend"""
        try:
            response = requests.put(
                f'{BACKEND_URL}/api/gpus/{gpu_id}/status',
                json=status,
                timeout=5
            )
            return response.status_code == 200
        except Exception as e:
            print(f"Error updating GPU status: {e}")
        return False
    
    def get_gpu_tasks(self, gpu_id):
        """Get assigned tasks for GPU"""
        try:
            response = requests.get(
                f'{BACKEND_URL}/api/gpus/tasks?gpu_id={gpu_id}&status=running',
                timeout=5
            )
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            print(f"Error fetching tasks: {e}")
        return []
    
    def update_task_progress(self, task_id, progress, metadata=None):
        """Update task progress on backend"""
        try:
            # Convert metadata to JSON string if it's a dict
            metadata_json = None
            if metadata:
                if isinstance(metadata, dict):
                    metadata_json = json.dumps(metadata)
                else:
                    metadata_json = str(metadata)
            
            response = requests.put(
                f'{BACKEND_URL}/api/gpus/tasks/{task_id}/progress',
                json={
                    'progress': progress,
                    'metadata': metadata_json
                },
                timeout=5
            )
            return response.status_code == 200
        except Exception as e:
            print(f"Error updating task progress: {e}")
        return False
    
    def report_task_error(self, task_id, error_message):
        """Report task error to backend"""
        try:
            response = requests.put(
                f'{BACKEND_URL}/api/gpus/tasks/{task_id}/progress',
                json={
                    'progress': 0,
                    'error_message': error_message
                },
                timeout=5
            )
            return response.status_code == 200
        except Exception as e:
            print(f"Error reporting task error: {e}")
        return False
    
    def start_job(self, gpu_id, task):
        """Start executing a job"""
        task_id = task['id']
        task_type = task['task_type']
        config = json.loads(task.get('config', '{}')) if task.get('config') else {}
        
        # Check if job already running
        if task_id in self.running_jobs:
            print(f"Task {task_id} already running")
            return
        
        # Create job executor
        executor = JobExecutor(
            gpu_id=gpu_id,
            task_id=task_id,
            task_type=task_type,
            config=config,
            progress_callback=self.update_task_progress,
            error_callback=self.report_task_error
        )
        
        # Start job in background
        if executor.start():
            self.running_jobs[task_id] = executor
            print(f"Started task {task_id} ({task_type}) on GPU {gpu_id}")
        else:
            print(f"Failed to start task {task_id}")
    
    def stop_job(self, task_id):
        """Stop a running job"""
        if task_id in self.running_jobs:
            executor = self.running_jobs[task_id]
            executor.stop()
            del self.running_jobs[task_id]
            print(f"Stopped task {task_id}")
            return True
        return False
    
    def check_for_new_tasks(self):
        """Check backend for new tasks and start them"""
        for gpu in self.registered_gpus:
            gpu_id = gpu['id']
            tasks = self.get_gpu_tasks(gpu_id)
            
            for task in tasks:
                task_id = task['id']
                task_type = task.get('task_type', '')
                
                # Handle model installation tasks
                if task_type == 'install_model':
                    self.handle_model_installation(task)
                    continue
                
                # Start new tasks
                if task_id not in self.running_jobs:
                    self.start_job(gpu_id, task)
    
    def handle_model_installation(self, task):
        """Handle model installation task"""
        try:
            config = json.loads(task.get('config', '{}')) if task.get('config') else {}
            model_name = config.get('model_name')
            
            if not model_name:
                print("No model name in installation task")
                return
            
            print(f"Installing model: {model_name}")
            
            def progress_callback(data):
                status = data.get('status', '')
                if 'downloading' in status.lower():
                    completed = data.get('completed', 0)
                    total = data.get('total', 0)
                    if total > 0:
                        progress = (completed / total) * 100
                        self.update_task_progress(task['id'], progress, {'status': status})
            
            success = self.ollama_manager.pull_model(model_name, progress_callback)
            
            if success:
                self.update_task_progress(task['id'], 100, {'status': 'completed'})
                print(f"Model {model_name} installed successfully")
            else:
                self.report_task_error(task['id'], f"Failed to install model {model_name}")
        except Exception as e:
            print(f"Error installing model: {e}")
            self.report_task_error(task['id'], str(e))
    
    def check_for_stopped_tasks(self):
        """Check if any tasks were stopped on backend"""
        try:
            # Get all running tasks from backend
            response = requests.get(
                f'{BACKEND_URL}/api/gpus/tasks?status=running',
                timeout=5
            )
            if response.status_code == 200:
                backend_tasks = {t['id'] for t in response.json()}
                
                # Stop local jobs that are no longer running on backend
                local_tasks = set(self.running_jobs.keys())
                stopped_tasks = local_tasks - backend_tasks
                
                for task_id in stopped_tasks:
                    print(f"Task {task_id} was stopped on backend, stopping locally...")
                    self.stop_job(task_id)
        except Exception as e:
            print(f"Error checking stopped tasks: {e}")
    
    def update_gpu_statuses(self):
        """Update status of all GPUs"""
        current_gpus = self.detect_nvidia_gpus()
        
        for gpu_info in current_gpus:
            # Find matching registered GPU
            registered = next((g for g in self.registered_gpus if g['device_id'] == gpu_info['device_id']), None)
            if registered:
                # Update status
                self.update_gpu_status(registered['id'], {
                    'memory_used': gpu_info.get('memory_used'),
                    'memory_free': gpu_info.get('memory_free'),
                    'temperature': gpu_info.get('temperature'),
                    'power_usage': gpu_info.get('power_usage'),
                    'utilization': gpu_info.get('utilization')
                })
    
    def run(self):
        """Main client loop"""
        print(f"GPU Client starting...")
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Client ID: {CLIENT_ID}")
        
        # Initial GPU detection
        self.gpus = self.detect_nvidia_gpus()
        if not self.gpus:
            print("No GPUs detected. Will continue with CPU-only tasks.")
        else:
            print(f"Detected {len(self.gpus)} GPU(s)")
            self.registered_gpus = self.register_gpus(self.gpus)
            
            if not self.registered_gpus:
                print("Failed to register GPUs with backend")
        
        # Main loop
        iteration = 0
        while self.running:
            try:
                # Update GPU statuses every iteration
                if self.registered_gpus:
                    self.update_gpu_statuses()
                
                # Check for new tasks every iteration
                self.check_for_new_tasks()
                
                # Check for stopped tasks every 5 iterations (every 25 seconds)
                if iteration % 5 == 0:
                    self.check_for_stopped_tasks()
                
                iteration += 1
                time.sleep(UPDATE_INTERVAL)
                
            except KeyboardInterrupt:
                print("\nShutting down...")
                self.running = False
                break
            except Exception as e:
                print(f"Error in main loop: {e}")
                time.sleep(UPDATE_INTERVAL)
        
        # Stop all running jobs
        print("Stopping all jobs...")
        for task_id in list(self.running_jobs.keys()):
            self.stop_job(task_id)

def main():
    """Entry point"""
    client = GPUClient()
    try:
        client.run()
    except KeyboardInterrupt:
        print("\nShutting down...")
        client.running = False
        for task_id in list(client.running_jobs.keys()):
            client.stop_job(task_id)

if __name__ == '__main__':
    main()
