from flask import Blueprint, jsonify, request
from src.services.coder_service import CoderService
from src.utils.datetime_utils import parse_iso_datetime

price_bp = Blueprint('price', __name__, url_prefix='/api/price')

@price_bp.route('/latest', methods=['GET'])
def get_latest_price():
    """Get the latest Bitcoin price"""
    price = CoderService.get_latest_price()
    if not price:
        return jsonify({'error': 'No price data available'}), 404
    return jsonify(price.to_dict())

@price_bp.route('/history', methods=['GET'])
def get_price_history():
    """Get Bitcoin price history"""
    limit = request.args.get('limit', 100, type=int)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Parse dates if provided
    start = None
    end = None
    if start_date:
        start = parse_iso_datetime(start_date)
        if start is None:
            return jsonify({'error': 'Invalid start_date format'}), 400
    if end_date:
        end = parse_iso_datetime(end_date)
        if end is None:
            return jsonify({'error': 'Invalid end_date format'}), 400
    
    prices = CoderService.get_price_history(
        start_date=start,
        end_date=end,
        limit=limit
    )
    return jsonify([price.to_dict() for price in prices])

@price_bp.route('/', methods=['POST'])
def add_price():
    """Add a new Bitcoin price record"""
    data = request.get_json()
    
    if not data or 'price_usd' not in data:
        return jsonify({'error': 'price_usd is required'}), 400
    
    price = CoderService.add_price(
        price_usd=data['price_usd'],
        volume_24h=data.get('volume_24h'),
        market_cap=data.get('market_cap'),
        source=data.get('source', 'manual')
    )
    
    return jsonify(price.to_dict()), 201
