from datetime import datetime

from sqlalchemy import Index

from src.models.base import db


class CoderPrice(db.Model):
    """Legacy market/price sample storage (historical table name may be bitcoin_prices in older DBs)."""

    __tablename__ = "coder_prices"

    id = db.Column(db.Integer, primary_key=True)
    price_usd = db.Column(db.Numeric(20, 2), nullable=False)
    price_btc = db.Column(db.Numeric(20, 8), default=1.0)
    volume_24h = db.Column(db.Numeric(20, 2))
    market_cap = db.Column(db.Numeric(20, 2))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    source = db.Column(db.String(50), default="manual")

    def to_dict(self):
        return {
            "id": self.id,
            "price_usd": float(self.price_usd),
            "price_btc": float(self.price_btc),
            "volume_24h": float(self.volume_24h) if self.volume_24h else None,
            "market_cap": float(self.market_cap) if self.market_cap else None,
            "timestamp": self.timestamp.isoformat(),
            "source": self.source,
        }


class Wallet(db.Model):
    """Model for tracked wallet records (legacy schema)"""

    __tablename__ = "wallets"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True)
    address = db.Column(db.String(64), unique=True, nullable=False, index=True)
    label = db.Column(db.String(100))
    balance_btc = db.Column(db.Numeric(20, 8), default=0)
    balance_usd = db.Column(db.Numeric(20, 2), default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_tracked = db.Column(db.Boolean, default=True)

    user = db.relationship("User", backref=db.backref("wallets", lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "address": self.address,
            "label": self.label,
            "balance_btc": float(self.balance_btc),
            "balance_usd": float(self.balance_usd),
            "created_at": self.created_at.isoformat(),
            "last_updated": self.last_updated.isoformat(),
            "is_tracked": self.is_tracked,
        }


class Transaction(db.Model):
    """Model for ledger-style transaction records (legacy schema)"""

    __tablename__ = "transactions"

    id = db.Column(db.Integer, primary_key=True)
    txid = db.Column(db.String(64), unique=True, nullable=False, index=True)
    wallet_id = db.Column(db.Integer, db.ForeignKey("wallets.id"), nullable=False)
    amount_btc = db.Column(db.Numeric(20, 8), nullable=False)
    amount_usd = db.Column(db.Numeric(20, 2))
    transaction_type = db.Column(db.String(20), nullable=False)
    fee_btc = db.Column(db.Numeric(20, 8), default=0)
    confirmations = db.Column(db.Integer, default=0)
    block_height = db.Column(db.Integer)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    wallet = db.relationship("Wallet", backref=db.backref("transactions", lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "txid": self.txid,
            "wallet_id": self.wallet_id,
            "amount_btc": float(self.amount_btc),
            "amount_usd": float(self.amount_usd) if self.amount_usd else None,
            "transaction_type": self.transaction_type,
            "fee_btc": float(self.fee_btc),
            "confirmations": self.confirmations,
            "block_height": self.block_height,
            "timestamp": self.timestamp.isoformat(),
        }


Index("idx_price_timestamp", CoderPrice.timestamp)
Index("idx_transaction_timestamp", Transaction.timestamp)
Index("idx_wallet_address", Wallet.address)
