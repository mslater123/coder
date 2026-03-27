"""Service for managing Python virtual environments"""
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple


def detect_venv(project_path: str) -> Optional[Dict]:
    """Detect if a virtual environment exists in the project"""
    venv_paths = [
        os.path.join(project_path, 'venv'),
        os.path.join(project_path, '.venv'),
        os.path.join(project_path, 'env'),
        os.path.join(project_path, '.env'),
        os.path.join(project_path, 'virtualenv'),
    ]
    
    for venv_path in venv_paths:
        if os.path.exists(venv_path):
            # Check if it's a valid virtual environment
            if _is_valid_venv(venv_path):
                python_path = _get_venv_python(venv_path)
                return {
                    'path': venv_path,
                    'name': os.path.basename(venv_path),
                    'python_path': python_path,
                    'exists': True,
                    'active': False  # Can't determine if active from backend
                }
    
    return None


def _is_valid_venv(venv_path: str) -> bool:
    """Check if a directory is a valid virtual environment"""
    # Check for common venv indicators
    indicators = [
        'pyvenv.cfg',
        'bin/activate',  # Unix
        'Scripts/activate',  # Windows
        'bin/python',  # Unix
        'Scripts/python.exe',  # Windows
    ]
    
    for indicator in indicators:
        if os.path.exists(os.path.join(venv_path, indicator)):
            return True
    
    return False


def _get_venv_python(venv_path: str) -> Optional[str]:
    """Get the Python executable path from a virtual environment"""
    # Try Unix path first
    python_path = os.path.join(venv_path, 'bin', 'python')
    if os.path.exists(python_path):
        return python_path
    
    # Try Windows path
    python_path = os.path.join(venv_path, 'Scripts', 'python.exe')
    if os.path.exists(python_path):
        return python_path
    
    # Try python3
    python_path = os.path.join(venv_path, 'bin', 'python3')
    if os.path.exists(python_path):
        return python_path
    
    return None


def create_venv(project_path: str, venv_name: str = 'venv', python_version: Optional[str] = None) -> Dict:
    """Create a new virtual environment"""
    venv_path = os.path.join(project_path, venv_name)
    
    if os.path.exists(venv_path):
        return {
            'success': False,
            'error': f'Virtual environment already exists at {venv_path}'
        }
    
    try:
        # Determine Python command
        python_cmd = 'python3'
        if python_version:
            python_cmd = f'python{python_version}'
        elif sys.platform == 'win32':
            python_cmd = 'python'
        
        # Create virtual environment
        result = subprocess.run(
            [python_cmd, '-m', 'venv', venv_path],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode != 0:
            return {
                'success': False,
                'error': result.stderr or 'Failed to create virtual environment'
            }
        
        python_path = _get_venv_python(venv_path)
        
        return {
            'success': True,
            'path': venv_path,
            'name': venv_name,
            'python_path': python_path,
            'message': f'Virtual environment created successfully at {venv_path}'
        }
    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'error': 'Virtual environment creation timed out'
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def install_package(venv_path: str, package: str, upgrade: bool = False) -> Dict:
    """Install a package in the virtual environment"""
    if not _is_valid_venv(venv_path):
        return {
            'success': False,
            'error': 'Invalid virtual environment'
        }
    
    pip_path = _get_venv_pip(venv_path)
    if not pip_path:
        return {
            'success': False,
            'error': 'Could not find pip in virtual environment'
        }
    
    try:
        cmd = [pip_path, 'install', package]
        if upgrade:
            cmd.append('--upgrade')
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 minutes for package installation
        )
        
        if result.returncode != 0:
            return {
                'success': False,
                'error': result.stderr or 'Failed to install package',
                'output': result.stdout
            }
        
        return {
            'success': True,
            'message': f'Package {package} installed successfully',
            'output': result.stdout
        }
    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'error': 'Package installation timed out'
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def install_requirements(venv_path: str, requirements_file: str) -> Dict:
    """Install packages from requirements.txt"""
    if not _is_valid_venv(venv_path):
        return {
            'success': False,
            'error': 'Invalid virtual environment'
        }
    
    if not os.path.exists(requirements_file):
        return {
            'success': False,
            'error': f'Requirements file not found: {requirements_file}'
        }
    
    pip_path = _get_venv_pip(venv_path)
    if not pip_path:
        return {
            'success': False,
            'error': 'Could not find pip in virtual environment'
        }
    
    try:
        result = subprocess.run(
            [pip_path, 'install', '-r', requirements_file],
            capture_output=True,
            text=True,
            timeout=600  # 10 minutes for requirements installation
        )
        
        if result.returncode != 0:
            return {
                'success': False,
                'error': result.stderr or 'Failed to install requirements',
                'output': result.stdout
            }
        
        return {
            'success': True,
            'message': 'Requirements installed successfully',
            'output': result.stdout
        }
    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'error': 'Requirements installation timed out'
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def list_packages(venv_path: str) -> Dict:
    """List installed packages in the virtual environment"""
    if not _is_valid_venv(venv_path):
        return {
            'success': False,
            'error': 'Invalid virtual environment'
        }
    
    pip_path = _get_venv_pip(venv_path)
    if not pip_path:
        return {
            'success': False,
            'error': 'Could not find pip in virtual environment'
        }
    
    try:
        result = subprocess.run(
            [pip_path, 'list', '--format=json'],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode != 0:
            return {
                'success': False,
                'error': result.stderr or 'Failed to list packages'
            }
        
        import json
        packages = json.loads(result.stdout) if result.stdout else []
        
        return {
            'success': True,
            'packages': packages
        }
    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'error': 'Package listing timed out'
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def uninstall_package(venv_path: str, package: str) -> Dict:
    """Uninstall a package from the virtual environment"""
    if not _is_valid_venv(venv_path):
        return {
            'success': False,
            'error': 'Invalid virtual environment'
        }
    
    pip_path = _get_venv_pip(venv_path)
    if not pip_path:
        return {
            'success': False,
            'error': 'Could not find pip in virtual environment'
        }
    
    try:
        result = subprocess.run(
            [pip_path, 'uninstall', '-y', package],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode != 0:
            return {
                'success': False,
                'error': result.stderr or 'Failed to uninstall package'
            }
        
        return {
            'success': True,
            'message': f'Package {package} uninstalled successfully',
            'output': result.stdout
        }
    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'error': 'Package uninstallation timed out'
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def _get_venv_pip(venv_path: str) -> Optional[str]:
    """Get the pip executable path from a virtual environment"""
    # Try Unix path first
    pip_path = os.path.join(venv_path, 'bin', 'pip')
    if os.path.exists(pip_path):
        return pip_path
    
    # Try Windows path
    pip_path = os.path.join(venv_path, 'Scripts', 'pip.exe')
    if os.path.exists(pip_path):
        return pip_path
    
    # Try pip3
    pip_path = os.path.join(venv_path, 'bin', 'pip3')
    if os.path.exists(pip_path):
        return pip_path
    
    return None


def get_venv_activation_command(venv_path: str) -> str:
    """Get the command to activate the virtual environment"""
    if sys.platform == 'win32':
        return f'{os.path.join(venv_path, "Scripts", "activate")}'
    else:
        return f'source {os.path.join(venv_path, "bin", "activate")}'


def get_venv_python_command(venv_path: str) -> Optional[str]:
    """Get the Python command that uses the virtual environment"""
    python_path = _get_venv_python(venv_path)
    if python_path:
        return python_path
    return None
