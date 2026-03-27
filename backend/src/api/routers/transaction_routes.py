from flask import Blueprint, jsonify, request
from src.services.coder_service import CoderService

transaction_bp = Blueprint('transaction', __name__, url_prefix='/api/transactions')

@transaction_bp.route('/', methods=['GET'])
def get_transactions():
    """Get all transactions"""
    limit = request.args.get('limit', 100, type=int)
    transactions = CoderService.get_all_transactions(limit=limit)
    return jsonify([tx.to_dict() for tx in transactions])

@transaction_bp.route('/', methods=['POST'])
def create_transaction():
    """Add a new transaction"""
    data = request.get_json()
    
    required_fields = ['txid', 'wallet_id', 'amount_btc', 'transaction_type']
    if not data or not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    if data['transaction_type'] not in ['send', 'receive']:
        return jsonify({'error': 'transaction_type must be "send" or "receive"'}), 400
    
    transaction = CoderService.add_transaction(
        txid=data['txid'],
        wallet_id=data['wallet_id'],
        amount_btc=data['amount_btc'],
        transaction_type=data['transaction_type'],
        amount_usd=data.get('amount_usd'),
        fee_btc=data.get('fee_btc', 0),
        confirmations=data.get('confirmations', 0),
        block_height=data.get('block_height')
    )
    
    return jsonify(transaction.to_dict()), 201

@transaction_bp.route('/<string:txid>', methods=['GET'])
def get_transaction(txid):
    """Get a specific transaction by txid"""
    from src.models import Transaction
    transaction = Transaction.query.filter_by(txid=txid).first()
    if not transaction:
        return jsonify({'error': 'Transaction not found'}), 404
    return jsonify(transaction.to_dict())
