from alpaca.broker.requests import CreateAccountRequest
from alpaca.broker.models import Contact, Identity, Disclosures, Agreement
from alpaca.broker.enums import AgreementType, TaxIdType
from alpaca.data.requests import StockBarsRequest
from alpaca.data.timeframe import TimeFrame
from datetime import date, timedelta
from ..core.broker_config import get_broker_client, get_stock_client


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
