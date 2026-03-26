from datetime import datetime
from decimal import Decimal
from models import db, GPU, GPUTask
import json

class GPUService:
    """Service for managing GPU operations"""
    
    @staticmethod
    def detect_gpus():
        """Detect available GPUs on the system"""
        gpus = []
        try:
            import subprocess
            import platform
            
            # Try to detect NVIDIA GPUs using nvidia-smi
            if platform.system() != 'Windows':
                try:
                    result = subprocess.run(
                        ['nvidia-smi', '--query-gpu=index,name,memory.total,driver_version,temperature.gpu,power.draw,utilization.gpu', 
                         '--format=csv,noheader,nounits'],
                        capture_output=True,
                        text=True,
                        timeout=5
                    )
                    
                    if result.returncode == 0:
                        lines = result.stdout.strip().split('\n')
                        for idx, line in enumerate(lines):
                            parts = [p.strip() for p in line.split(',')]
                            if len(parts) >= 7:
                                gpu_info = {
                                    'device_id': f'nvidia_{idx}',
                                    'name': parts[1],
                                    'vendor': 'NVIDIA',
                                    'memory_total': int(parts[2]) * 1024 * 1024 * 1024 if parts[2].isdigit() else None,
                                    'driver_version': parts[3],
                                    'temperature': int(parts[4]) if parts[4].isdigit() else None,
                                    'power_usage': float(parts[5]) if parts[5].replace('.', '').isdigit() else None,
                                    'utilization': float(parts[6].replace('%', '')) if parts[6].replace('%', '').replace('.', '').isdigit() else None,
                                }
                                gpus.append(gpu_info)
                except (subprocess.TimeoutExpired, FileNotFoundError, Exception) as e:
                    print(f"nvidia-smi not available: {e}")
            
            # Fallback: Create mock GPU for development
            if not gpus:
                gpus = [
                    {
                        'device_id': 'mock_gpu_0',
                        'name': 'Mock GPU (Development)',
                        'vendor': 'NVIDIA',
                        'memory_total': 8192 * 1024 * 1024,  # 8GB
                        'driver_version': '550.54.15',
                        'temperature': 45,
                        'power_usage': 120.5,
                        'utilization': 0.0,
                    }
                ]
        except Exception as e:
            print(f"Error detecting GPUs: {e}")
            # Return empty list on error
        
        return gpus
    
    @staticmethod
    def register_gpu(device_id, name, vendor=None, memory_total=None, 
                    compute_capability=None, driver_version=None, host_system=None):
        """Register or update a GPU in the database"""
        gpu = GPU.query.filter_by(device_id=device_id).first()
        
        if gpu:
            # Update existing GPU
            gpu.name = name
            if vendor:
                gpu.vendor = vendor
            if memory_total:
                gpu.memory_total = memory_total
            if compute_capability:
                gpu.compute_capability = compute_capability
            if driver_version:
                gpu.driver_version = driver_version
            if host_system:
                gpu.host_system = host_system
            gpu.last_seen = datetime.utcnow()
        else:
            # Create new GPU
            gpu = GPU(
                device_id=device_id,
                name=name,
                vendor=vendor,
                memory_total=memory_total,
                compute_capability=compute_capability,
                driver_version=driver_version,
                host_system=host_system,
                current_task='idle'
            )
            db.session.add(gpu)
        
        db.session.commit()
        return gpu
    
    @staticmethod
    def update_gpu_status(device_id, memory_used=None, memory_free=None,
                        temperature=None, power_usage=None, utilization=None):
        """Update GPU status information"""
        gpu = GPU.query.filter_by(device_id=device_id).first()
        if not gpu:
            return None
        
        if memory_used is not None:
            gpu.memory_used = memory_used
        if memory_free is not None:
            gpu.memory_free = memory_free
        if temperature is not None:
            gpu.temperature = temperature
        if power_usage is not None:
            gpu.power_usage = Decimal(str(power_usage))
        if utilization is not None:
            gpu.utilization = Decimal(str(utilization))
        
        gpu.last_seen = datetime.utcnow()
        db.session.commit()
        return gpu
    
    @staticmethod
    def get_all_gpus():
        """Get all registered GPUs"""
        return GPU.query.all()
    
    @staticmethod
    def get_gpu(device_id):
        """Get GPU by device ID"""
        return GPU.query.filter_by(device_id=device_id).first()
    
    @staticmethod
    def get_available_gpus():
        """Get all available GPUs (not currently in use)"""
        return GPU.query.filter_by(is_available=True, current_task='idle').all()
    
    @staticmethod
    def assign_task(gpu_id, task_type, user_id=None, task_name=None, config=None):
        """Assign a task to a GPU"""
        gpu = GPU.query.get(gpu_id)
        if not gpu:
            return None
        
        if not gpu.is_available or gpu.current_task != 'idle':
            return None
        
        # Create task record
        task = GPUTask(
            gpu_id=gpu_id,
            user_id=user_id,
            task_type=task_type,
            task_name=task_name,
            config=json.dumps(config) if config else None,
            status='running'
        )
        db.session.add(task)
        
        # Update GPU status
        gpu.current_task = task_type
        gpu.is_available = False
        
        db.session.commit()
        return task
    
    @staticmethod
    def stop_task(task_id):
        """Stop a running GPU task"""
        task = GPUTask.query.get(task_id)
        if not task:
            return None
        
        task.status = 'stopped'
        task.end_time = datetime.utcnow()
        
        # Update GPU status
        gpu = task.gpu
        gpu.current_task = 'idle'
        gpu.is_available = True
        
        db.session.commit()
        return task
    
    @staticmethod
    def get_gpu_tasks(gpu_id=None, status=None):
        """Get GPU tasks"""
        query = GPUTask.query
        
        if gpu_id:
            query = query.filter_by(gpu_id=gpu_id)
        if status:
            query = query.filter_by(status=status)
        
        return query.order_by(GPUTask.start_time.desc()).all()
    
    @staticmethod
    def update_task_progress(task_id, progress, error_message=None, result=None):
        """Update task progress"""
        task = GPUTask.query.get(task_id)
        if not task:
            return None
        
        task.progress = Decimal(str(progress))
        if error_message:
            task.error_message = error_message
            task.status = 'failed'
        if result:
            task.result = result
            if progress >= 100:
                task.status = 'completed'
                from datetime import datetime
                task.end_time = datetime.utcnow()
        
        db.session.commit()
        return task
