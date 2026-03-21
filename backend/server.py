from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from decimal import Decimal


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class LineItem(BaseModel):
    zone: str = ""
    description: str = ""
    qty: float = 0
    rate: float = 0
    amount: float = 0

class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    date: str
    terms: str = "Due on Receipt"
    tech: str = ""
    
    # Customer info
    customer_name: str
    billing_address: str = ""
    phone: str = ""
    email: str = ""
    
    # Line items
    line_items: List[LineItem] = []
    
    # Totals
    subtotal: float = 0
    tax_rate: float = 8.25  # Texas sales tax
    tax_amount: float = 0
    discount: float = 0
    total: float = 0
    
    # Payment status
    payment_status: str = "pending"  # pending, paid
    payment_method: Optional[str] = None
    
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class InvoiceCreate(BaseModel):
    invoice_number: Optional[str] = None
    date: Optional[str] = None
    terms: str = "Due on Receipt"
    tech: str = ""
    customer_name: str
    billing_address: str = ""
    phone: str = ""
    email: str = ""
    line_items: List[LineItem] = []
    subtotal: float = 0
    tax_rate: float = 8.25
    tax_amount: float = 0
    discount: float = 0
    total: float = 0

class InvoiceUpdate(BaseModel):
    invoice_number: Optional[str] = None
    date: Optional[str] = None
    terms: Optional[str] = None
    tech: Optional[str] = None
    customer_name: Optional[str] = None
    billing_address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    line_items: Optional[List[LineItem]] = None
    subtotal: Optional[float] = None
    tax_rate: Optional[float] = None
    tax_amount: Optional[float] = None
    discount: Optional[float] = None
    total: Optional[float] = None
    payment_status: Optional[str] = None
    payment_method: Optional[str] = None

class PaymentUpdate(BaseModel):
    payment_status: str
    payment_method: str


# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "AAA Irrigation Service Invoice API"}

# Generate next invoice number
async def get_next_invoice_number():
    last_invoice = await db.invoices.find_one(
        {},
        {"invoice_number": 1},
        sort=[("created_at", -1)]
    )
    if last_invoice and last_invoice.get("invoice_number"):
        try:
            last_num = int(last_invoice["invoice_number"].replace("INV-", ""))
            return f"INV-{last_num + 1:05d}"
        except:
            pass
    return "INV-00001"

# Invoice CRUD operations
@api_router.post("/invoices", response_model=Invoice)
async def create_invoice(invoice_data: InvoiceCreate):
    # Generate invoice number if not provided
    invoice_number = invoice_data.invoice_number or await get_next_invoice_number()
    
    # Set date if not provided
    date = invoice_data.date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    invoice = Invoice(
        invoice_number=invoice_number,
        date=date,
        terms=invoice_data.terms,
        tech=invoice_data.tech,
        customer_name=invoice_data.customer_name,
        billing_address=invoice_data.billing_address,
        phone=invoice_data.phone,
        email=invoice_data.email,
        line_items=invoice_data.line_items,
        subtotal=invoice_data.subtotal,
        tax_rate=invoice_data.tax_rate,
        tax_amount=invoice_data.tax_amount,
        discount=invoice_data.discount,
        total=invoice_data.total
    )
    
    doc = invoice.model_dump()
    await db.invoices.insert_one(doc)
    return invoice

@api_router.get("/invoices", response_model=List[Invoice])
async def get_invoices():
    invoices = await db.invoices.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return invoices

@api_router.get("/invoices/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: str):
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@api_router.put("/invoices/{invoice_id}", response_model=Invoice)
async def update_invoice(invoice_id: str, invoice_update: InvoiceUpdate):
    update_data = {k: v for k, v in invoice_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.invoices.update_one(
        {"id": invoice_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    return invoice

@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str):
    result = await db.invoices.delete_one({"id": invoice_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"message": "Invoice deleted successfully"}

@api_router.post("/invoices/{invoice_id}/payment", response_model=Invoice)
async def update_payment(invoice_id: str, payment: PaymentUpdate):
    update_data = {
        "payment_status": payment.payment_status,
        "payment_method": payment.payment_method,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.invoices.update_one(
        {"id": invoice_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    return invoice


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
