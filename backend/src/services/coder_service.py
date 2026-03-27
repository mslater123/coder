from datetime import datetime
from decimal import Decimal
from src.models import db, CoderPrice, Wallet, Transaction


class CoderService:
    """Service for optional legacy wallet/transaction/price samples (Coder platform)."""

    @staticmethod
    def add_price(price_usd, volume_24h=None, market_cap=None, source='manual'):
        """Add a new market price record"""
        price = CoderPrice(
            price_usd=Decimal(str(price_usd)),
            volume_24h=Decimal(str(volume_24h)) if volume_24h else None,
            market_cap=Decimal(str(market_cap)) if market_cap else None,
            source=source
        )
        db.session.add(price)
        db.session.commit()
        return price

    @staticmethod
    def get_latest_price():
        """Get the most recent stored price snapshot"""
        return CoderPrice.query.order_by(CoderPrice.timestamp.desc()).first()

    @staticmethod
    def get_price_history(start_date=None, end_date=None, limit=100):
        """Get price history"""
        query = CoderPrice.query

        if start_date:
            query = query.filter(CoderPrice.timestamp >= start_date)
        if end_date:
            query = query.filter(CoderPrice.timestamp <= end_date)

        return query.order_by(CoderPrice.timestamp.desc()).limit(limit).all()

    @staticmethod
    def create_wallet(address, label=None):
        """Create a new wallet to track"""
        wallet = Wallet(
            address=address,
            label=label,
            is_tracked=True
        )
        db.session.add(wallet)
        db.session.commit()
        return wallet

    @staticmethod
    def get_wallet(address):
        """Get wallet by address"""
        return Wallet.query.filter_by(address=address).first()

    @staticmethod
    def get_all_wallets():
        """Get all tracked wallets"""
        return Wallet.query.filter_by(is_tracked=True).all()

    @staticmethod
    def update_wallet_balance(address, balance_btc, balance_usd=None):
        """Update wallet balance"""
        wallet = Wallet.query.filter_by(address=address).first()
        if not wallet:
            return None

        wallet.balance_btc = Decimal(str(balance_btc))
        if balance_usd:
            wallet.balance_usd = Decimal(str(balance_usd))
        wallet.last_updated = datetime.utcnow()
        db.session.commit()
        return wallet

    @staticmethod
    def add_transaction(txid, wallet_id, amount_btc, transaction_type,
                       amount_usd=None, fee_btc=0, confirmations=0,
                       block_height=None):
        """Add a transaction record"""
        existing = Transaction.query.filter_by(txid=txid).first()
        if existing:
            return existing

        transaction = Transaction(
            txid=txid,
            wallet_id=wallet_id,
            amount_btc=Decimal(str(amount_btc)),
            amount_usd=Decimal(str(amount_usd)) if amount_usd else None,
            transaction_type=transaction_type,
            fee_btc=Decimal(str(fee_btc)),
            confirmations=confirmations,
            block_height=block_height
        )
        db.session.add(transaction)
        db.session.commit()
        return transaction

    @staticmethod
    def get_wallet_transactions(wallet_id, limit=50):
        """Get transactions for a wallet"""
        return Transaction.query.filter_by(
            wallet_id=wallet_id
        ).order_by(Transaction.timestamp.desc()).limit(limit).all()

    @staticmethod
    def get_all_transactions(limit=100):
        """Get all transactions"""
        return Transaction.query.order_by(
            Transaction.timestamp.desc()
        ).limit(limit).all()
