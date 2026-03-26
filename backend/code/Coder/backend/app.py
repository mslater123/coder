from flask import Flask, jsonify, request
from flask_cors import CORS
from models import db
from routes.mining_routes import mining_bp
from routes.price_routes import price_bp
from routes.wallet_routes import wallet_bp
from routes.transaction_routes import transaction_bp
from routes.auth_routes import auth_bp
from routes.user_routes import user_bp
from routes.gpu_routes import gpu_bp
from routes.llm_routes import llm_bp
from routes.llm_manager_routes import llm_manager_bp
from routes.code_editor_routes import code_editor_bp
import hashlib
import time
import threading
from datetime import datetime
import os

def create_app():
    """Application factory pattern"""
    app = Flask(__name__)
    
    # Configuration
    database_url = os.getenv('DATABASE_URL', 'sqlite:///coder.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize extensions with CORS configuration
    # Allow all origins for development (restrict in production)
    CORS(app, 
         origins="*",
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
         supports_credentials=False)
    db.init_app(app)
    
    # Register blueprints
    app.register_blueprint(mining_bp)
    app.register_blueprint(price_bp)
    app.register_blueprint(wallet_bp)
    app.register_blueprint(transaction_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(gpu_bp)
    app.register_blueprint(llm_bp)
    app.register_blueprint(llm_manager_bp)
    app.register_blueprint(code_editor_bp)
    
    # Initialize database
    with app.app_context():
        db.create_all()
    
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
