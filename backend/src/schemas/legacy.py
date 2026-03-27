"""Request bodies for optional legacy blueprints (price / wallet / transaction)."""

from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class PriceCreateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    price_usd: Decimal | float | int
    volume_24h: Decimal | float | int | None = None
    market_cap: Decimal | float | int | None = None
    source: str = "manual"


class WalletCreateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    address: str = Field(..., min_length=1)
    label: str | None = None
    user_id: str | None = None


class WalletUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    label: str | None = None
    balance_btc: Decimal | float | int | None = None
    balance_usd: Decimal | float | int | None = None
    is_tracked: bool | None = None


class TransactionCreateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    txid: str = Field(..., min_length=1)
    wallet_id: int = Field(..., ge=1)
    amount_btc: Decimal | float | int
    amount_usd: Decimal | float | int | None = None
    transaction_type: str = Field(..., min_length=1)
    fee_btc: Decimal | float | int = 0
    confirmations: int = 0
    block_height: int | None = None
