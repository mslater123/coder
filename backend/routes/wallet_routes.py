from flask import Blueprint, jsonify, request
from services.bitcoin_service import BitcoinService

wallet_bp = Blueprint('wallet', __name__, url_prefix='/api/wallets')

@wallet_bp.route('/', methods=['GET'])
def get_wallets():
    """Get all tracked wallets"""
    wallets = BitcoinService.get_all_wallets()
    return jsonify([wallet.to_dict() for wallet in wallets])

@wallet_bp.route('/<string:address>', methods=['GET'])
def get_wallet(address):
    """Get a specific wallet by address"""
    wallet = BitcoinService.get_wallet(address)
    if not wallet:
        return jsonify({'error': 'Wallet not found'}), 404
    return jsonify(wallet.to_dict())

@wallet_bp.route('/', methods=['POST'])
def create_wallet():
    """Create a new wallet to track"""
    data = request.get_json()
    
    if not data or 'address' not in data:
        return jsonify({'error': 'address is required'}), 400
    
    # Check if wallet already exists
    existing = BitcoinService.get_wallet(data['address'])
    if existing:
        return jsonify(existing.to_dict())
    
    wallet = BitcoinService.create_wallet(
        address=data['address'],
        label=data.get('label')
    )
    
    return jsonify(wallet.to_dict()), 201

@wallet_bp.route('/<string:address>', methods=['PUT'])
def update_wallet(address):
    """Update wallet information"""
    data = request.get_json() or {}
    
    wallet = BitcoinService.get_wallet(address)
    if not wallet:
        return jsonify({'error': 'Wallet not found'}), 404
    
    if 'balance_btc' in data:
        wallet = BitcoinService.update_wallet_balance(
            address=address,
            balance_btc=data['balance_btc'],
            balance_usd=data.get('balance_usd')
        )
    
    if 'label' in data:
        wallet.label = data['label']
        from models import db
        db.session.commit()
    
    if 'is_tracked' in data:
        wallet.is_tracked = data['is_tracked']
        from models import db
        db.session.commit()
    
    return jsonify(wallet.to_dict())

@wallet_bp.route('/<string:address>/transactions', methods=['GET'])
def get_wallet_transactions(address):
    """Get transactions for a wallet"""
    wallet = BitcoinService.get_wallet(address)
    if not wallet:
        return jsonify({'error': 'Wallet not found'}), 404
    
    limit = request.args.get('limit', 50, type=int)
    transactions = BitcoinService.get_wallet_transactions(wallet.id, limit=limit)
    return jsonify([tx.to_dict() for tx in transactions])
