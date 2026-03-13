from alpaca.broker.requests import CreateAccountRequest, CreateACHRelationshipRequest, CreateACHTransferRequest
from alpaca.broker.models import Contact, Identity, Disclosures, Agreement
from alpaca.broker.enums import AgreementType, TaxIdType, BankAccountType, TransferDirection, TransferTiming
from src.core.broker_config import get_broker_client

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
        relationship = client.create_ach_relationship_for_account(
            account_id=alpaca_account_id, 
            ach_data=ach_data
        )
        rel_id = relationship.id
    else:
        print("🚨 USING EXISTING BANK ACCOUNT")
        rel_id = relationship[0].id

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
        for pos in formatted_positions:
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