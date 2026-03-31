import os
import csv
from pathlib import Path
from alpaca.broker.requests import CreateAccountRequest, CreateACHRelationshipRequest, CreateACHTransferRequest
from alpaca.broker.models import Contact, Identity, Disclosures, Agreement
from alpaca.broker.enums import AgreementType, TaxIdType, BankAccountType, TransferDirection, TransferTiming
from src.core.broker_config import get_broker_client, get_data_client
from alpaca.trading.requests import MarketOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce
from alpaca.data.requests import StockLatestQuoteRequest

ticker_path = Path(__file__).parent / "tickers.csv"

def create_mock_account(user_email, first_name, last_name):
    # initialize broker client
    client = get_broker_client()

    # Only capture minimal data to satisfy Alpaca API
    # providing fictitious contact data aside from email
    contact_data = Contact(
        email_address=user_email,
        phone_number="777-777-7777",
        street_address=["135 Mystic Ave"],
        city="Gainesville",
        state="FL",
        postal_code="32601"
    )

    # providing fictitious identity data aside from first/last name
    identity_data = Identity(
        given_name=first_name,
        family_name=last_name,
        date_of_birth="2000-01-01",
        tax_id="777-77-1234",
        tax_id_type=TaxIdType.USA_SSN,
        country_of_tax_residence="USA",
        funding_source=["employment_income"]
    )

    # Automatically accept disclosures
    disclosure_data = Disclosures(
        is_control_person=False,
        is_affiliated_exchange_or_finra=False,
        is_politically_exposed=False,
        immediate_family_exposed=False
    )

    agreement_data = [
        Agreement(
            agreement=AgreementType.MARGIN,
            signed_at="2026-01-01T00:00:00Z",
            ip_address="127.0.0.1",
        ),
        Agreement(
            agreement=AgreementType.ACCOUNT,
            signed_at="2026-01-01T00:00:00Z",
            ip_address="127.0.0.1",
        ),
        Agreement(
            agreement=AgreementType.CUSTOMER,
            signed_at="2026-01-01T00:00:00Z",
            ip_address="127.0.0.1",
        )
    ]

    # Create the request
    request = CreateAccountRequest(
        contact=contact_data,
        identity=identity_data,
        disclosures=disclosure_data,
        agreements=agreement_data
    )

    return client.create_account(request)

def deposit_to_mock_account(alpaca_account_id: str, first_name: str, last_name: str, amount: float):
    # Initialize the broker client
    client = get_broker_client()

    # Check if user already has dummy bank linked
    relationships = client.get_ach_relationships_for_account(alpaca_account_id)

    if not relationships:
        # Link dummy bank
        ach_data = CreateACHRelationshipRequest(
            account_owner_name=f"{first_name} {last_name}",
            bank_account_type=BankAccountType.CHECKING,
            bank_account_number="123456789abc",
            bank_routing_number="121000358",
        )
        relationships = client.create_ach_relationship_for_account(
            account_id=alpaca_account_id,
            ach_data=ach_data
        )
        rel_id = relationships.id
    else:
        print("🚨 USING EXISTING BANK ACCOUNT")
        rel_id = relationships[0].id

    # Initiate transfer of funds
    transfer_data = CreateACHTransferRequest(
        amount=str(amount),
        direction=TransferDirection.INCOMING,
        timing=TransferTiming.IMMEDIATE,
        relationship_id=rel_id
    )
    try:
        transfer = client.create_transfer_for_account(
            account_id=alpaca_account_id,
            transfer_data=transfer_data
        )
    except Exception as e:
        print(f"🚨 ALPACA ACH FUND TRANSFER ERROR: {str(e)}", flush=True)

    print("🚨 DEPOSIT SUCCESSFUL")
    return transfer

def get_account_holdings(alpaca_account_id: str):
    client = get_broker_client()

    # Retrieve all positions currently held by user
    try:
        raw_positions = client.get_all_positions_for_account(account_id=alpaca_account_id)
        formatted_positions = []
        for pos in raw_positions:
            print(f"{pos.symbol}")
            formatted_positions.append({
            "symbol": pos.symbol,
            "shares": float(pos.qty),
            "market_value": float(pos.market_value),
            "avg_entry_price": float(pos.avg_entry_price),
            "current_price": float(pos.current_price),
            "total_return": float(pos.unrealized_pl),
            "total_return_percent": float(pos.unrealized_plpc) * 100 # Convert to a standard percentage
            })

        # Temp print statements to test functionality
        print(f"{alpaca_account_id} currently holds {len(formatted_positions)} positions.")
        print("Positions currently held:")
        for item in formatted_positions:
            print(f"{pos.symbol}\n{pos.qty}\n{pos.market_value}")

        return {
            "status": "success",
            "position_count": len(formatted_positions),
            "positions": formatted_positions
        }

    except Exception as e:
        print(f"🚨 ALPACA POSITIONS ERROR: {str(e)}", flush=True)

def get_portfolio_value(alpaca_account_id: str):
    client = get_broker_client()

    # Retrieve user portfolio value
    try:
        live_trade_account = client.get_trade_account_by_id(
            account_id = alpaca_account_id
        )

        print(f"{alpaca_account_id} portfolio value is: {live_trade_account.portfolio_value} with buying power: {live_trade_account.buying_power} and a current cash value of {live_trade_account.cash}")

        return {
            "portfolio_value": float(live_trade_account.portfolio_value),
            "buying_power": float(live_trade_account.buying_power),
            "cash": float(live_trade_account.cash)
        }

    except Exception as e:
        print(f"🚨 ALPACA PORTFOLIO ERROR: {str(e)}", flush=True)

def submit_mock_order(alpaca_account_id: str, symbol: str, qty: float, side: str):
    """
    Submits a market order to Alpaca on behalf of the user
    """
    # Check that the ticker symbol exists in limited dataset
    symbol_found = False
    with open(ticker_path, newline='', encoding='utf-8-sig') as ticker_file:
        reader = csv.reader(ticker_file)
        for row in reader:
            if symbol in row:
                symbol_found = True
                break
    
    if not symbol_found:
        raise ValueError(f"Our apologies, {symbol.upper()} is not included in current dataset.")

    client = get_broker_client()

    # Translate the frontend string into Alpaca's specific OrderSide enum
    if side.lower() == 'buy':
        order_side = OrderSide.BUY
    elif side.lower() == 'sell':
        order_side = OrderSide.SELL
    else:
        raise ValueError("Order side must be 'buy' or 'sell'")

    # Build the order request payload
    # TimeInDorce.DAY means if the market is closed, the order waits until it opens
    order_data = MarketOrderRequest(
        symbol=symbol.upper(),
        qty=qty,
        side=order_side,
        time_in_force=TimeInForce.DAY
    )

    try:
        # Submit the order to the broker on behalf of the user
        order = client.submit_order_for_account(
            account_id=alpaca_account_id,
            order_data=order_data
        )
        print(f"✅ ORDER SUBMITTED: {side.upper()} {qty} shares of {symbol.upper()}")
        return order

    except Exception as e:
        print(f"🚨 ORDER EXECUTION ERROR: {str(e)}", flush=True)
        raise e

def get_live_quote(symbol: str):
    """
    Fetches the latest real-time quote for a specific stock ticker
    """

    # Check that the ticker symbol exists in limited dataset
    symbol_found = False
    with open(ticker_path, newline='', encoding='utf-8-sig') as ticker_file:
        reader = csv.reader(ticker_file)
        for row in reader:
            if symbol in row:
                symbol_found = True
                break
    
    if not symbol_found:
        raise ValueError(f"Our apologies, {symbol.upper()} is not included in current dataset.")

    data_client = get_data_client()

    try:
        request_params = StockLatestQuoteRequest(symbol_or_symbols=symbol.upper())
        quotes = data_client.get_stock_latest_quote(request_params)

        symbol_quote = quotes.get(symbol.upper())

        if not symbol_quote:
            raise ValueError(f"No quote data found for {symbol.upper()}")

        return {
            "symbol": symbol.upper(),
            "ask_price": float(symbol_quote.ask_price),
            "bid_price": float(symbol_quote.bid_price),
            "timestamp": symbol_quote.timestamp.isoformat()
        }

    except Exception as e:
        print(f"🚨 QUOTE ERROR: {str(e)}", flush=True)
        raise e
