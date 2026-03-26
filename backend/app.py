from flask import Flask, jsonify, request
from flask_cors import CORS
from models import db
from routes.auth_routes import auth_bp
from routes.user_routes import user_bp
from routes.gpu_routes import gpu_bp
from routes.llm_routes import llm_bp
from routes.llm_manager_routes import llm_manager_bp
from routes.code_editor_routes import code_editor_bp
from routes.design_docs_routes import design_docs_bp
from routes.project_routes import project_bp
import hashlib
import time
import threading
from datetime import datetime
import os

def create_app():
    """Application factory pattern"""
    app = Flask(__name__)
    
    # Configuration
    # Use instance folder for database
    instance_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance')
    os.makedirs(instance_path, exist_ok=True)
    database_path = os.path.join(instance_path, 'coder.db')
    database_url = os.getenv('DATABASE_URL', f'sqlite:///{database_path}')
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads', 'profiles')
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
    
    # Create uploads directory if it doesn't exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Initialize extensions with CORS configuration
    # Allow all origins for development (restrict in production)
    CORS(app, 
         origins="*",
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-User-Id"],
         supports_credentials=False)
    db.init_app(app)
    
    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(gpu_bp)
    app.register_blueprint(llm_bp)
    app.register_blueprint(llm_manager_bp)
    app.register_blueprint(code_editor_bp)
    app.register_blueprint(design_docs_bp)
    app.register_blueprint(project_bp)
    
    # Initialize database
    with app.app_context():
        db.create_all()
        # Ensure new columns exist (for existing databases)
        try:
            from sqlalchemy import inspect, text
            inspector = inspect(db.engine)
            
            # Migrate users table
            try:
                user_columns = [col['name'] for col in inspector.get_columns('users')]
                id_column = next((col for col in inspector.get_columns('users') if col['name'] == 'id'), None)
                
                # Check if id column is INTEGER (old schema) - SQLite stores type info differently
                # We need to check the actual table schema
                with db.engine.connect() as conn:
                    # Get the actual CREATE TABLE statement to check column types
                    result = conn.execute(text("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'"))
                    create_sql = result.fetchone()
                    if create_sql and create_sql[0]:
                        sql_str = create_sql[0].upper()
                        # Check if id is INTEGER instead of VARCHAR/TEXT
                        if 'ID INTEGER' in sql_str or 'ID INT' in sql_str:
                            print("ERROR: users.id column is INTEGER but should be VARCHAR(36) for UUIDs.")
                            print("The users table needs to be recreated. Attempting to fix...")
                            # SQLite doesn't support ALTER COLUMN, so we need to recreate the table
                            # This is a destructive operation - backup first!
                            try:
                                # Get all existing users
                                existing_users = conn.execute(text("SELECT * FROM users")).fetchall()
                                print(f"Found {len(existing_users)} existing users to migrate")
                                
                                # Create new table with correct schema
                                conn.execute(text("""
                                    CREATE TABLE users_new (
                                        id VARCHAR(36) PRIMARY KEY,
                                        username VARCHAR(80) UNIQUE NOT NULL,
                                        email VARCHAR(120) UNIQUE,
                                        password_hash VARCHAR(255) NOT NULL,
                                        name VARCHAR(200),
                                        address TEXT,
                                        profile_image VARCHAR(500),
                                        is_active BOOLEAN NOT NULL DEFAULT 1,
                                        is_admin BOOLEAN NOT NULL DEFAULT 0,
                                        created_at DATETIME NOT NULL,
                                        last_login DATETIME
                                    )
                                """))
                                
                                # Migrate existing users - convert integer IDs to UUIDs
                                import uuid as uuid_module
                                for user_row in existing_users:
                                    old_id = user_row[0]  # Assuming first column is id
                                    # Generate new UUID for old integer IDs
                                    new_id = str(uuid_module.uuid4())
                                    # Insert with new UUID (adjust column order based on your schema)
                                    conn.execute(text("""
                                        INSERT INTO users_new (id, username, email, password_hash, name, address, 
                                                              profile_image, is_active, is_admin, created_at, last_login)
                                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                    """), (
                                        new_id,
                                        user_row[1] if len(user_row) > 1 else None,  # username
                                        user_row[2] if len(user_row) > 2 else None,  # email
                                        user_row[3] if len(user_row) > 3 else None,  # password_hash
                                        user_row[4] if len(user_row) > 4 else None,  # name
                                        user_row[5] if len(user_row) > 5 else None,  # address
                                        user_row[6] if len(user_row) > 6 else None,  # profile_image
                                        user_row[7] if len(user_row) > 7 else 1,  # is_active
                                        user_row[8] if len(user_row) > 8 else 0,  # is_admin
                                        user_row[9] if len(user_row) > 9 else datetime.utcnow(),  # created_at
                                        user_row[10] if len(user_row) > 10 else None  # last_login
                                    ))
                                
                                # Drop old table and rename new one
                                conn.execute(text("DROP TABLE users"))
                                conn.execute(text("ALTER TABLE users_new RENAME TO users"))
                                conn.commit()
                                print("Successfully migrated users table to use VARCHAR(36) for IDs")
                            except Exception as migrate_error:
                                conn.rollback()
                                print(f"Failed to migrate users table: {migrate_error}")
                                print("You may need to manually fix the database schema")
                    
                    if 'name' not in user_columns:
                        conn.execute(text('ALTER TABLE users ADD COLUMN name VARCHAR(200)'))
                        conn.commit()
                    if 'address' not in user_columns:
                        conn.execute(text('ALTER TABLE users ADD COLUMN address TEXT'))
                        conn.commit()
                    if 'profile_image' not in user_columns:
                        conn.execute(text('ALTER TABLE users ADD COLUMN profile_image VARCHAR(500)'))
                        conn.commit()
            except Exception as e:
                print(f"Note: Could not migrate users table: {e}")
            
            # Migrate user_settings table
            try:
                settings_columns = [col['name'] for col in inspector.get_columns('user_settings')]
                with db.engine.connect() as conn:
                    # SQLite uses INTEGER for booleans (0 or 1)
                    if 'ai_auto_apply' not in settings_columns:
                        conn.execute(text('ALTER TABLE user_settings ADD COLUMN ai_auto_apply INTEGER DEFAULT 1'))
                        conn.commit()
                    if 'selected_agent_id' not in settings_columns:
                        conn.execute(text('ALTER TABLE user_settings ADD COLUMN selected_agent_id INTEGER'))
                        conn.commit()
                    if 'git_use_git' not in settings_columns:
                        conn.execute(text('ALTER TABLE user_settings ADD COLUMN git_use_git INTEGER DEFAULT 0'))
                        conn.commit()
                    if 'git_repo_path' not in settings_columns:
                        conn.execute(text('ALTER TABLE user_settings ADD COLUMN git_repo_path VARCHAR(500)'))
                        conn.commit()
                    if 'git_repo_url' not in settings_columns:
                        conn.execute(text('ALTER TABLE user_settings ADD COLUMN git_repo_url VARCHAR(500)'))
                        conn.commit()
                    if 'git_auto_commit' not in settings_columns:
                        conn.execute(text('ALTER TABLE user_settings ADD COLUMN git_auto_commit INTEGER DEFAULT 0'))
                        conn.commit()
                    if 'use_file_system' not in settings_columns:
                        conn.execute(text('ALTER TABLE user_settings ADD COLUMN use_file_system INTEGER DEFAULT 1'))
                        conn.commit()
                    if 'additional_settings' not in settings_columns:
                        conn.execute(text('ALTER TABLE user_settings ADD COLUMN additional_settings TEXT'))
                        conn.commit()
            except Exception as e:
                print(f"Note: Could not migrate user_settings table: {e}")
                try:
                    db.session.rollback()
                except:
                    pass
            
            # Ensure project_users table exists (association table)
            # Note: db.create_all() should create this automatically, but we verify it exists
            try:
                tables = inspector.get_table_names()
                if 'project_users' not in tables:
                    print("Warning: project_users table does not exist. It should be created by db.create_all()")
                    # Try to create it manually
                    with db.engine.connect() as conn:
                        conn.execute(text("""
                            CREATE TABLE IF NOT EXISTS project_users (
                                project_id VARCHAR(36) NOT NULL,
                                user_id VARCHAR(36) NOT NULL,
                                role VARCHAR(50) DEFAULT 'member',
                                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                PRIMARY KEY (project_id, user_id),
                                FOREIGN KEY (project_id) REFERENCES projects(id),
                                FOREIGN KEY (user_id) REFERENCES users(id)
                            )
                        """))
                        conn.commit()
                    print("Created project_users table manually")
            except Exception as e:
                print(f"Note: Could not ensure project_users table exists: {e}")
                try:
                    db.session.rollback()
                except:
                    pass
        except Exception as e:
            # If migration fails, continue - columns might already exist
            print(f"Note: Could not migrate database schema: {e}")
            try:
                db.session.rollback()
            except:
                pass
    
    return app

app = create_app()

# Legacy mining endpoints for backward compatibility
class BitcoinMiner:
    def __init__(self):
        self.is_mining = False
        self.mining_thread = None
        self.current_session_id = None
        self.stats = {
            'hashes_per_second': 0,
            'total_hashes': 0,
            'blocks_found': 0,
            'start_time': None,
            'current_difficulty': 4,
            'last_hash': None
        }
        self.target_prefix = '0' * self.stats['current_difficulty']
        
    def calculate_hash(self, block_data, nonce):
        """Calculate SHA-256 hash of block data with nonce"""
        data = f"{block_data}{nonce}".encode()
        return hashlib.sha256(data).hexdigest()
    
    def mine_block(self):
        """Mine a single block"""
        from services.bitcoin_service import BitcoinService
        
        block_data = f"block_{int(time.time())}"
        nonce = 0
        start_time = time.time()
        hash_count = 0
        last_stat_save = time.time()
        
        while self.is_mining:
            hash_result = self.calculate_hash(block_data, nonce)
            hash_count += 1
            self.stats['total_hashes'] += 1
            
            # Update hashes per second every second
            elapsed = time.time() - start_time
            if elapsed >= 1.0:
                self.stats['hashes_per_second'] = hash_count / elapsed
                hash_count = 0
                start_time = time.time()
            
            # Save stats to database every 5 seconds
            if time.time() - last_stat_save >= 5 and self.current_session_id:
                try:
                    BitcoinService.add_mining_stat(
                        session_id=self.current_session_id,
                        hashes_per_second=self.stats['hashes_per_second'],
                        total_hashes=self.stats['total_hashes'],
                        blocks_found=self.stats['blocks_found'],
                        last_hash=self.stats['last_hash']
                    )
                    BitcoinService.update_mining_session(
                        session_id=self.current_session_id,
                        total_hashes=self.stats['total_hashes'],
                        blocks_found=self.stats['blocks_found'],
                        average_hash_rate=self.stats['hashes_per_second']
                    )
                    last_stat_save = time.time()
                except Exception as e:
                    print(f"Error saving stats: {e}")
            
            # Check if hash meets difficulty requirement
            if hash_result.startswith(self.target_prefix):
                self.stats['blocks_found'] += 1
                self.stats['last_hash'] = hash_result
                block_data = f"block_{int(time.time())}"
                nonce = 0
            else:
                nonce += 1
    
    def start_mining(self):
        """Start mining in a separate thread"""
        from services.bitcoin_service import BitcoinService
        
        if not self.is_mining:
            self.is_mining = True
            self.stats['start_time'] = datetime.now().isoformat()
            
            # Create a new mining session
            session = BitcoinService.create_mining_session(
                difficulty=self.stats['current_difficulty']
            )
            self.current_session_id = session.id
            
            self.mining_thread = threading.Thread(target=self.mine_block, daemon=True)
            self.mining_thread.start()
            return True
        return False
    
    def stop_mining(self):
        """Stop mining"""
        from services.bitcoin_service import BitcoinService
        
        if self.is_mining:
            self.is_mining = False
            if self.mining_thread:
                self.mining_thread.join(timeout=1)
            
            # Update session status
            if self.current_session_id:
                BitcoinService.update_mining_session(
                    session_id=self.current_session_id,
                    total_hashes=self.stats['total_hashes'],
                    blocks_found=self.stats['blocks_found'],
                    average_hash_rate=self.stats['hashes_per_second'],
                    status='stopped'
                )
                self.current_session_id = None
            
            return True
        return False
    
    def get_stats(self):
        """Get current mining statistics"""
        stats = self.stats.copy()
        stats['is_mining'] = self.is_mining
        stats['session_id'] = self.current_session_id
        if stats['start_time']:
            elapsed = (datetime.now() - datetime.fromisoformat(stats['start_time'])).total_seconds()
            stats['elapsed_time'] = int(elapsed)
        else:
            stats['elapsed_time'] = 0
        return stats

miner = BitcoinMiner()

@app.route('/api/status', methods=['GET'])
def get_status():
    """Get current mining status (legacy endpoint)"""
    return jsonify(miner.get_stats())

@app.route('/api/start', methods=['POST'])
def start_mining():
    """Start mining (legacy endpoint)"""
    if miner.start_mining():
        return jsonify({'success': True, 'message': 'Mining started'})
    return jsonify({'success': False, 'message': 'Mining already in progress'}), 400

@app.route('/api/stop', methods=['POST'])
def stop_mining():
    """Stop mining (legacy endpoint)"""
    if miner.stop_mining():
        return jsonify({'success': True, 'message': 'Mining stopped'})
    return jsonify({'success': False, 'message': 'Mining not in progress'}), 400

@app.route('/api/difficulty', methods=['POST'])
def set_difficulty():
    """Set mining difficulty (legacy endpoint)"""
    data = request.get_json()
    difficulty = data.get('difficulty', 4)
    if 1 <= difficulty <= 8:
        miner.stats['current_difficulty'] = difficulty
        miner.target_prefix = '0' * difficulty
        return jsonify({'success': True, 'difficulty': difficulty})
    return jsonify({'success': False, 'message': 'Difficulty must be between 1 and 8'}), 400

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'coder-api'})

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(debug=os.getenv('FLASK_DEBUG', 'False').lower() == 'true', 
            port=port, host='0.0.0.0')
