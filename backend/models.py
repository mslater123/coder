from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy import Index, Text
from werkzeug.security import generate_password_hash, check_password_hash
import json
import uuid

db = SQLAlchemy()

class User(db.Model):
    """Model for user accounts"""
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(200), nullable=True)
    address = db.Column(db.Text, nullable=True)
    profile_image = db.Column(db.String(500), nullable=True)  # URL or path to profile image
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_login = db.Column(db.DateTime)
    
    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if password matches"""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """Convert user to dictionary, safely handling all fields"""
        try:
            return {
                'id': self.id,
                'username': self.username,
                'email': getattr(self, 'email', None),
                'name': getattr(self, 'name', None),
                'address': getattr(self, 'address', None),
                'profile_image': getattr(self, 'profile_image', None),
                'is_active': self.is_active,
                'is_admin': self.is_admin,
                'created_at': self.created_at.isoformat() if self.created_at else None,
                'last_login': self.last_login.isoformat() if self.last_login else None
            }
        except Exception as e:
            # Fallback if any attribute access fails
            import traceback
            print(f"Error in User.to_dict(): {e}")
            traceback.print_exc()
            return {
                'id': getattr(self, 'id', None),
                'username': getattr(self, 'username', ''),
                'email': getattr(self, 'email', None),
                'name': getattr(self, 'name', None),
                'address': getattr(self, 'address', None),
                'profile_image': getattr(self, 'profile_image', None),
                'is_active': getattr(self, 'is_active', True),
                'is_admin': getattr(self, 'is_admin', False),
                'created_at': self.created_at.isoformat() if hasattr(self, 'created_at') and self.created_at else None,
                'last_login': self.last_login.isoformat() if hasattr(self, 'last_login') and self.last_login else None
            }

class BitcoinPrice(db.Model):
    """Model for tracking Bitcoin prices over time"""
    __tablename__ = 'bitcoin_prices'
    
    id = db.Column(db.Integer, primary_key=True)
    price_usd = db.Column(db.Numeric(20, 2), nullable=False)
    price_btc = db.Column(db.Numeric(20, 8), default=1.0)
    volume_24h = db.Column(db.Numeric(20, 2))
    market_cap = db.Column(db.Numeric(20, 2))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    source = db.Column(db.String(50), default='manual')
    
    def to_dict(self):
        return {
            'id': self.id,
            'price_usd': float(self.price_usd),
            'price_btc': float(self.price_btc),
            'volume_24h': float(self.volume_24h) if self.volume_24h else None,
            'market_cap': float(self.market_cap) if self.market_cap else None,
            'timestamp': self.timestamp.isoformat(),
            'source': self.source
        }

class MiningSession(db.Model):
    """Model for tracking mining sessions"""
    __tablename__ = 'mining_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    start_time = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    end_time = db.Column(db.DateTime)
    total_hashes = db.Column(db.BigInteger, default=0)
    blocks_found = db.Column(db.Integer, default=0)
    average_hash_rate = db.Column(db.Numeric(20, 2))
    difficulty = db.Column(db.Integer, default=4)
    status = db.Column(db.String(20), default='running')  # running, completed, stopped
    
    user = db.relationship('User', backref=db.backref('mining_sessions', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'start_time': self.start_time.isoformat(),
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'total_hashes': self.total_hashes,
            'blocks_found': self.blocks_found,
            'average_hash_rate': float(self.average_hash_rate) if self.average_hash_rate else None,
            'difficulty': self.difficulty,
            'status': self.status,
            'duration_seconds': (self.end_time - self.start_time).total_seconds() if self.end_time else None
        }

class MiningStat(db.Model):
    """Model for tracking mining statistics at specific points in time"""
    __tablename__ = 'mining_stats'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('mining_sessions.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    hashes_per_second = db.Column(db.Numeric(20, 2), nullable=False)
    total_hashes = db.Column(db.BigInteger, nullable=False)
    blocks_found = db.Column(db.Integer, default=0)
    last_hash = db.Column(db.String(64))
    
    session = db.relationship('MiningSession', backref=db.backref('stats', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'session_id': self.session_id,
            'timestamp': self.timestamp.isoformat(),
            'hashes_per_second': float(self.hashes_per_second),
            'total_hashes': self.total_hashes,
            'blocks_found': self.blocks_found,
            'last_hash': self.last_hash
        }

class Wallet(db.Model):
    """Model for tracking Bitcoin wallets"""
    __tablename__ = 'wallets'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    address = db.Column(db.String(64), unique=True, nullable=False, index=True)
    label = db.Column(db.String(100))
    balance_btc = db.Column(db.Numeric(20, 8), default=0)
    balance_usd = db.Column(db.Numeric(20, 2), default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_tracked = db.Column(db.Boolean, default=True)
    
    user = db.relationship('User', backref=db.backref('wallets', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'address': self.address,
            'label': self.label,
            'balance_btc': float(self.balance_btc),
            'balance_usd': float(self.balance_usd),
            'created_at': self.created_at.isoformat(),
            'last_updated': self.last_updated.isoformat(),
            'is_tracked': self.is_tracked
        }

class Transaction(db.Model):
    """Model for tracking Bitcoin transactions"""
    __tablename__ = 'transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    txid = db.Column(db.String(64), unique=True, nullable=False, index=True)
    wallet_id = db.Column(db.Integer, db.ForeignKey('wallets.id'), nullable=False)
    amount_btc = db.Column(db.Numeric(20, 8), nullable=False)
    amount_usd = db.Column(db.Numeric(20, 2))
    transaction_type = db.Column(db.String(20), nullable=False)  # send, receive
    fee_btc = db.Column(db.Numeric(20, 8), default=0)
    confirmations = db.Column(db.Integer, default=0)
    block_height = db.Column(db.Integer)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    wallet = db.relationship('Wallet', backref=db.backref('transactions', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'txid': self.txid,
            'wallet_id': self.wallet_id,
            'amount_btc': float(self.amount_btc),
            'amount_usd': float(self.amount_usd) if self.amount_usd else None,
            'transaction_type': self.transaction_type,
            'fee_btc': float(self.fee_btc),
            'confirmations': self.confirmations,
            'block_height': self.block_height,
            'timestamp': self.timestamp.isoformat()
        }

class GPU(db.Model):
    """Model for tracking GPU devices"""
    __tablename__ = 'gpus'
    
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    vendor = db.Column(db.String(50))
    memory_total = db.Column(db.BigInteger)
    memory_used = db.Column(db.BigInteger, default=0)
    memory_free = db.Column(db.BigInteger)
    compute_capability = db.Column(db.String(20))
    driver_version = db.Column(db.String(50))
    temperature = db.Column(db.Integer)
    power_usage = db.Column(db.Numeric(10, 2))
    utilization = db.Column(db.Numeric(5, 2))
    is_available = db.Column(db.Boolean, default=True)
    current_task = db.Column(db.String(50))
    host_system = db.Column(db.String(200))
    last_seen = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'device_id': self.device_id,
            'name': self.name,
            'vendor': self.vendor,
            'memory_total': self.memory_total,
            'memory_used': self.memory_used,
            'memory_free': self.memory_free,
            'compute_capability': self.compute_capability,
            'driver_version': self.driver_version,
            'temperature': self.temperature,
            'power_usage': float(self.power_usage) if self.power_usage else None,
            'utilization': float(self.utilization) if self.utilization else None,
            'is_available': self.is_available,
            'current_task': self.current_task,
            'host_system': self.host_system,
            'last_seen': self.last_seen.isoformat() if self.last_seen else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class GPUTask(db.Model):
    """Model for tracking GPU tasks"""
    __tablename__ = 'gpu_tasks'
    
    id = db.Column(db.Integer, primary_key=True)
    gpu_id = db.Column(db.Integer, db.ForeignKey('gpus.id'), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    task_type = db.Column(db.String(50), nullable=False)
    task_name = db.Column(db.String(200))
    status = db.Column(db.String(50), default='running')
    start_time = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    end_time = db.Column(db.DateTime)
    config = db.Column(db.Text)
    progress = db.Column(db.Numeric(5, 2), default=0)
    error_message = db.Column(db.Text)
    result = db.Column(db.Text)
    
    gpu = db.relationship('GPU', backref=db.backref('tasks', lazy=True))
    user = db.relationship('User', backref=db.backref('gpu_tasks', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'gpu_id': self.gpu_id,
            'user_id': self.user_id,
            'task_type': self.task_type,
            'task_name': self.task_name,
            'status': self.status,
            'start_time': self.start_time.isoformat(),
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'config': self.config,
            'progress': float(self.progress) if self.progress else None,
            'error_message': self.error_message,
            'result': self.result
        }

class LLMQuery(db.Model):
    """Model for tracking LLM queries and responses"""
    __tablename__ = 'llm_queries'
    
    id = db.Column(db.Integer, primary_key=True)
    query_id = db.Column(db.String(100), unique=True, nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    prompt = db.Column(db.Text, nullable=False)
    model = db.Column(db.String(100), nullable=False)
    response = db.Column(db.Text)
    gpu_id = db.Column(db.Integer, db.ForeignKey('gpus.id'), nullable=True)
    task_id = db.Column(db.Integer, db.ForeignKey('gpu_tasks.id'), nullable=True)
    status = db.Column(db.String(50), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    completed_at = db.Column(db.DateTime)
    
    user = db.relationship('User', backref=db.backref('llm_queries', lazy=True))
    gpu = db.relationship('GPU', backref=db.backref('llm_queries', lazy=True))
    task = db.relationship('GPUTask', backref=db.backref('llm_query', uselist=False))
    
    def to_dict(self):
        return {
            'id': self.id,
            'query_id': self.query_id,
            'user_id': self.user_id,
            'prompt': self.prompt,
            'model': self.model,
            'response': self.response,
            'gpu_id': self.gpu_id,
            'task_id': self.task_id,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }

class CodeEditorAgent(db.Model):
    """Model for code editor AI agents connected to GPUs"""
    __tablename__ = 'code_editor_agents'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    agent_type = db.Column(db.String(50), nullable=False)  # local, remote, cloud, client
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    gpu_id = db.Column(db.Integer, db.ForeignKey('gpus.id'), nullable=True)
    
    # Connection details
    host = db.Column(db.String(255))  # For remote/cloud agents
    port = db.Column(db.Integer)  # For remote/cloud agents
    api_key = db.Column(db.String(255))  # For cloud agents
    endpoint = db.Column(db.String(500))  # Full endpoint URL
    
    # Agent configuration
    model = db.Column(db.String(100), default='codellama')
    max_tokens = db.Column(db.Integer, default=2048)
    temperature = db.Column(db.Numeric(3, 2), default=0.3)
    config = db.Column(db.Text)  # JSON config for additional settings
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    is_available = db.Column(db.Boolean, default=True)
    last_used = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('code_editor_agents', lazy=True))
    gpu = db.relationship('GPU', backref=db.backref('code_editor_agents', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'agent_type': self.agent_type,
            'user_id': self.user_id,
            'gpu_id': self.gpu_id,
            'host': self.host,
            'port': self.port,
            'endpoint': self.endpoint,
            'model': self.model,
            'max_tokens': self.max_tokens,
            'temperature': float(self.temperature) if self.temperature else None,
            'config': self.config,
            'is_active': self.is_active,
            'is_available': self.is_available,
            'last_used': self.last_used.isoformat() if self.last_used else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'gpu': self.gpu.to_dict() if self.gpu else None
        }

# Create indexes for better query performance
Index('idx_price_timestamp', BitcoinPrice.timestamp)
Index('idx_mining_stat_timestamp', MiningStat.timestamp)
Index('idx_transaction_timestamp', Transaction.timestamp)
Index('idx_wallet_address', Wallet.address)
Index('idx_user_username', User.username)
Index('idx_gpu_device_id', GPU.device_id)
Index('idx_gpu_task_gpu_id', GPUTask.gpu_id)
Index('idx_gpu_task_status', GPUTask.status)
Index('idx_llm_query_id', LLMQuery.query_id)
Index('idx_agent_type', CodeEditorAgent.agent_type)
Index('idx_agent_gpu_id', CodeEditorAgent.gpu_id)

class UserSettings(db.Model):
    """Model for storing user preferences and settings"""
    __tablename__ = 'user_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, unique=True)
    
    # Code Editor Settings
    editor_theme = db.Column(db.String(50), default='vs-dark')
    editor_font_size = db.Column(db.Integer, default=14)
    editor_font_family = db.Column(db.String(100), default='Consolas, "Courier New", monospace')
    editor_tab_size = db.Column(db.Integer, default=2)
    editor_word_wrap = db.Column(db.String(20), default='on')
    editor_minimap = db.Column(db.Boolean, default=True)
    editor_line_numbers = db.Column(db.String(20), default='on')
    
    # AI Settings
    ai_default_model = db.Column(db.String(100), default='codellama')
    ai_temperature = db.Column(db.Numeric(3, 2), default=0.3)
    ai_max_tokens = db.Column(db.Integer, default=2048)
    ai_auto_apply = db.Column(db.Boolean, default=True)
    selected_agent_id = db.Column(db.Integer, nullable=True)  # Store selected agent ID
    
    # Git Settings
    git_use_git = db.Column(db.Boolean, default=False)
    git_repo_path = db.Column(db.String(500))
    git_repo_url = db.Column(db.String(500))
    git_auto_commit = db.Column(db.Boolean, default=False)
    
    # File System Settings
    use_file_system = db.Column(db.Boolean, default=True)
    
    # Additional settings as JSON
    additional_settings = db.Column(db.Text)  # JSON string for extensibility
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('settings', uselist=False))
    
    def to_dict(self):
        import json
        return {
            'id': self.id,
            'user_id': self.user_id,
            'editor_theme': self.editor_theme,
            'editor_font_size': self.editor_font_size,
            'editor_font_family': self.editor_font_family,
            'editor_tab_size': self.editor_tab_size,
            'editor_word_wrap': self.editor_word_wrap,
            'editor_minimap': self.editor_minimap,
            'editor_line_numbers': self.editor_line_numbers,
            'ai_default_model': self.ai_default_model,
            'ai_temperature': float(self.ai_temperature) if self.ai_temperature else 0.3,
            'ai_max_tokens': self.ai_max_tokens,
            'ai_auto_apply': self.ai_auto_apply if self.ai_auto_apply is not None else True,
            'selected_agent_id': self.selected_agent_id,
            'git_use_git': self.git_use_git,
            'git_repo_path': self.git_repo_path,
            'git_repo_url': self.git_repo_url,
            'git_auto_commit': self.git_auto_commit,
            'use_file_system': self.use_file_system,
            'additional_settings': json.loads(self.additional_settings) if self.additional_settings else {},
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

Index('idx_user_settings_user', UserSettings.user_id)

class CodebaseAnalysis(db.Model):
    """Model for caching codebase analysis results"""
    __tablename__ = 'codebase_analysis'
    
    id = db.Column(db.Integer, primary_key=True)
    project_path = db.Column(db.String(500), nullable=False, index=True)
    working_dir = db.Column(db.String(500), nullable=False)
    analysis_hash = db.Column(db.String(64), nullable=False, index=True)  # Hash of file structure for cache invalidation
    analysis_data = db.Column(Text, nullable=False)  # JSON string of analysis results
    file_count = db.Column(db.Integer, default=0)
    language_breakdown = db.Column(Text)  # JSON string
    dependencies = db.Column(Text)  # JSON string
    functions = db.Column(Text)  # JSON string
    classes = db.Column(Text)  # JSON string
    imports = db.Column(Text)  # JSON string
    structure_summary = db.Column(Text)  # Text summary
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'project_path': self.project_path,
            'working_dir': self.working_dir,
            'analysis_hash': self.analysis_hash,
            'analysis_data': json.loads(self.analysis_data) if self.analysis_data else {},
            'file_count': self.file_count,
            'language_breakdown': json.loads(self.language_breakdown) if self.language_breakdown else {},
            'dependencies': json.loads(self.dependencies) if self.dependencies else {},
            'functions': json.loads(self.functions) if self.functions else {},
            'classes': json.loads(self.classes) if self.classes else {},
            'imports': json.loads(self.imports) if self.imports else {},
            'structure_summary': self.structure_summary,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

Index('idx_codebase_analysis_path', CodebaseAnalysis.project_path)
Index('idx_codebase_analysis_hash', CodebaseAnalysis.analysis_hash)

class ProjectFileCache(db.Model):
    """Model for caching project file structure and contents"""
    __tablename__ = 'project_file_cache'
    
    id = db.Column(db.Integer, primary_key=True)
    project_path = db.Column(db.String(500), nullable=False, index=True)
    working_dir = db.Column(db.String(500), nullable=False, index=True)
    file_path = db.Column(db.String(1000), nullable=False)  # Relative path from working_dir
    file_content = db.Column(db.Text)  # File content (can be None for directories)
    file_size = db.Column(db.Integer, default=0)
    file_mtime = db.Column(db.Float)  # Modification time as timestamp
    is_directory = db.Column(db.Boolean, default=False)
    file_hash = db.Column(db.String(64))  # Hash of file content for quick change detection

# Association table for many-to-many relationship between users and projects
project_users = db.Table('project_users',
    db.Column('project_id', db.String(36), db.ForeignKey('projects.id'), primary_key=True),
    db.Column('user_id', db.String(36), db.ForeignKey('users.id'), primary_key=True),
    db.Column('role', db.String(50), default='member'),  # owner, admin, member, viewer
    db.Column('joined_at', db.DateTime, default=datetime.utcnow)
)

class Project(db.Model):
    """Model for projects - projects have UUIDs and users are attached to them"""
    __tablename__ = 'projects'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(Text, nullable=True)
    settings = db.Column(Text)  # JSON string for project settings
    created_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)  # Original creator
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Many-to-many relationship with users
    users = db.relationship('User', secondary=project_users, backref=db.backref('projects', lazy='dynamic'))
    creator = db.relationship('User', foreign_keys=[created_by], backref=db.backref('created_projects', lazy=True))
    
    def to_dict(self):
        settings_dict = {}
        if self.settings:
            try:
                settings_dict = json.loads(self.settings)
            except:
                pass
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'settings': settings_dict,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'user_ids': [user.id for user in self.users]  # List of attached user IDs
        }

class DesignDoc(db.Model):
    """Model for design documents (Confluence-style documentation)"""
    __tablename__ = 'design_docs'
    
    id = db.Column(db.String(100), primary_key=True)  # UUID string
    title = db.Column(db.String(500), nullable=False)
    content = db.Column(Text, nullable=False, default='')
    project_id = db.Column(db.String(100), nullable=True, index=True)  # Link to project
    tags = db.Column(db.String(500), default='')  # Comma-separated tags
    author_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    author = db.Column(db.String(100), nullable=False, default='Unknown')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    user = db.relationship('User', backref=db.backref('design_docs', lazy=True))
    
    def to_dict(self):
        # Get project name if project_id exists
        project_name = None
        if self.project_id:
            # Try to get project name from code editor projects (would need to query)
            # For now, just use project_id
            project_name = self.project_id
        
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'projectId': self.project_id,
            'projectName': project_name,
            'tags': self.tags.split(',') if self.tags else [],
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat(),
            'author': self.author
        }

Index('idx_project_file_cache_path', ProjectFileCache.project_path)
Index('idx_project_file_cache_working_dir', ProjectFileCache.working_dir)
Index('idx_project_file_cache_file_path', ProjectFileCache.file_path)