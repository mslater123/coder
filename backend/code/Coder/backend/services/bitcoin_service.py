from datetime import datetime, timedelta
from decimal import Decimal
from models import db, BitcoinPrice, MiningSession, MiningStat, Wallet, Transaction

class BitcoinService:
    """Service for managing Bitcoin-related operations"""
    
    @staticmethod
    def add_price(price_usd, volume_24h=None, market_cap=None, source='manual'):
        """Add a new Bitcoin price record"""
        price = BitcoinPrice(
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
        """Get the most recent Bitcoin price"""
        return BitcoinPrice.query.order_by(BitcoinPrice.timestamp.desc()).first()
    
    @staticmethod
    def get_price_history(start_date=None, end_date=None, limit=100):
        """Get Bitcoin price history"""
        query = BitcoinPrice.query
        
        if start_date:
            query = query.filter(BitcoinPrice.timestamp >= start_date)
        if end_date:
            query = query.filter(BitcoinPrice.timestamp <= end_date)
        
        return query.order_by(BitcoinPrice.timestamp.desc()).limit(limit).all()
    
    @staticmethod
    def create_mining_session(difficulty=4):
        """Create a new mining session"""
        session = MiningSession(
            difficulty=difficulty,
            status='running'
        )
        db.session.add(session)
        db.session.commit()
        return session
    
    @staticmethod
    def update_mining_session(session_id, total_hashes=None, blocks_found=None, 
                             average_hash_rate=None, status=None):
        """Update a mining session"""
        session = MiningSession.query.get(session_id)
        if not session:
            return None
        
        if total_hashes is not None:
            session.total_hashes = total_hashes
        if blocks_found is not None:
            session.blocks_found = blocks_found
        if average_hash_rate is not None:
            session.average_hash_rate = Decimal(str(average_hash_rate))
        if status:
            session.status = status
            if status in ['completed', 'stopped']:
                session.end_time = datetime.utcnow()
        
        db.session.commit()
        return session
    
    @staticmethod
    def add_mining_stat(session_id, hashes_per_second, total_hashes, 
                       blocks_found=0, last_hash=None):
        """Add a mining statistics snapshot"""
        stat = MiningStat(
            session_id=session_id,
            hashes_per_second=Decimal(str(hashes_per_second)),
            total_hashes=total_hashes,
            blocks_found=blocks_found,
            last_hash=last_hash
        )
        db.session.add(stat)
        db.session.commit()
        return stat
    
    @staticmethod
    def get_mining_session(session_id):
        """Get a mining session by ID"""
        return MiningSession.query.get(session_id)
    
    @staticmethod
    def get_all_mining_sessions(limit=50):
        """Get all mining sessions"""
        return MiningSession.query.order_by(
            MiningSession.start_time.desc()
        ).limit(limit).all()
    
    @staticmethod
    def get_session_stats(session_id, limit=100):
        """Get statistics for a mining session"""
        return MiningStat.query.filter_by(
            session_id=session_id
        ).order_by(MiningStat.timestamp.desc()).limit(limit).all()
    
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
        # Check if transaction already exists
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
