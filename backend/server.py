from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
import base64
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

ERP_URL    = os.getenv("ERP_URL", "http://frappe_docker-frontend-1:8080")
ERP_KEY    = os.getenv("ERP_KEY", "")
ERP_SECRET = os.getenv("ERP_SECRET", "")
NAS_URL    = os.getenv("NAS_URL", "https://nas.aaairrigationservice.com")
NAS_USER   = os.getenv("NAS_USER", "jdboatman1")
NAS_PASS   = os.getenv("NAS_PASS", "")
NAS_FOLDER = os.getenv("NAS_FOLDER", "/AAA/Integrity-Flow/Signed-Estimates")
NOTIFY_EMAIL = os.getenv("NOTIFICATION_EMAIL", "jdboatman1@yahoo.com")
RESEND_KEY   = os.getenv("RESEND_API_KEY", "")

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="AAA Invoice App")
api_router = APIRouter(prefix="/api")


# ── Models ────────────────────────────────────────────────────────────────────

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
    customer_name: str
    billing_address: str = ""
    service_address: str = ""
    phone: str = ""
    email: str = ""
    line_items: List[LineItem] = []
    subtotal: float = 0
    tax_rate: float = 8.25
    tax_amount: float = 0
    discount: float = 0
    total: float = 0
    payment_status: str = "pending"
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
    service_address: str = ""
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
    service_address: Optional[str] = None
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

class ApproveRequest(BaseModel):
    signature: str  # base64 data URL


# ── Helpers ───────────────────────────────────────────────────────────────────

def _erp_headers():
    return {"Authorization": f"token {ERP_KEY}:{ERP_SECRET}"}

def _erp_to_invoice(doc: dict) -> dict:
    """Map an ERP Quotation doc to the invoice app's data shape."""
    items = []
    for item in doc.get("items", []):
        if item.get("custom_is_subtotal") or item.get("item_code") == "SUBTOTAL":
            continue
        items.append({
            "zone": item.get("custom_zone") or "",
            "description": item.get("description") or item.get("item_name") or "",
            "qty": float(item.get("qty") or 0),
            "rate": float(item.get("rate") or 0),
            "amount": float(item.get("amount") or 0),
        })
    return {
        "id": doc["name"],
        "invoice_number": doc["name"],
        "date": doc.get("transaction_date", ""),
        "terms": doc.get("terms", ""),
        "tech": doc.get("custom_technician_name") or doc.get("custom_technician") or "",
        "customer_name": doc.get("customer_name", ""),
        "billing_address": doc.get("custom_billing_address", "") or "",
        "service_address": doc.get("custom_service_address", "") or "",
        "phone": "",
        "email": "",
        "line_items": items,
        "subtotal": float(doc.get("net_total") or 0),
        "tax_rate": 8.25,
        "tax_amount": float(doc.get("total_taxes_and_charges") or 0),
        "discount": float(doc.get("discount_amount") or 0),
        "total": float(doc.get("grand_total") or 0),
        "payment_status": "paid" if doc.get("docstatus") == 1 and doc.get("custom_approval_status") == "Approved" else "pending",
        "payment_method": None,
        # Extra ERP fields for the estimate view
        "_erp": {
            "name": doc["name"],
            "docstatus": doc.get("docstatus", 0),
            "custom_approval_status": doc.get("custom_approval_status", "Draft"),
            "scheduled_date": doc.get("custom_scheduled_date", ""),
            "party_name": doc.get("party_name", ""),
        }
    }

def _erp_invoice_to_invoice(doc: dict) -> dict:
    """Map an ERP Sales Invoice doc to the invoice app's data shape."""
    items = []
    for item in doc.get("items", []):
        items.append({
            "zone": item.get("custom_zone") or "",
            "description": item.get("description") or item.get("item_name") or "",
            "qty": float(item.get("qty") or 0),
            "rate": float(item.get("rate") or 0),
            "amount": float(item.get("amount") or 0),
        })
    paid = doc.get("outstanding_amount", 1) == 0 or doc.get("status") == "Paid"
    return {
        "id": doc["name"],
        "invoice_number": doc["name"],
        "date": doc.get("posting_date", ""),
        "terms": doc.get("terms", "Due on Receipt"),
        "tech": doc.get("custom_technician_name") or doc.get("custom_technician") or "",
        "customer_name": doc.get("customer_name", ""),
        "billing_address": doc.get("address_display", "") or "",
        "service_address": doc.get("custom_service_address", "") or "",
        "phone": "",
        "email": "",
        "line_items": items,
        "subtotal": float(doc.get("net_total") or 0),
        "tax_rate": 8.25,
        "tax_amount": float(doc.get("total_taxes_and_charges") or 0),
        "discount": float(doc.get("discount_amount") or 0),
        "total": float(doc.get("grand_total") or 0),
        "payment_status": "paid" if paid else "pending",
        "payment_method": None,
        "_erp": {
            "name": doc["name"],
            "docstatus": doc.get("docstatus", 1),
            "outstanding_amount": doc.get("outstanding_amount", 0),
        }
    }


async def _save_to_nas(pdf_bytes: bytes, filename: str):
    """Upload signed PDF to Synology NAS via File Station API."""
    try:
        async with httpx.AsyncClient(verify=False, timeout=30) as c:
            # Login
            r = await c.get(f"{NAS_URL}/webapi/auth.cgi", params={
                "api": "SYNO.API.Auth", "version": "3", "method": "login",
                "account": NAS_USER, "passwd": NAS_PASS,
                "session": "FileStation", "format": "sid",
            })
            sid = r.json().get("data", {}).get("sid")
            if not sid:
                logger.warning("NAS login failed: %s", r.text)
                return
            # Upload
            await c.post(
                f"{NAS_URL}/webapi/entry.cgi",
                params={"api": "SYNO.FileStation.Upload", "version": "2", "method": "upload", "_sid": sid},
                files={"file": (filename, pdf_bytes, "application/pdf")},
                data={"path": NAS_FOLDER, "create_parents": "true", "overwrite": "true"},
            )
            logger.info("Saved %s to NAS", filename)
    except Exception as e:
        logger.warning("NAS upload failed: %s", e)


async def _fetch_signed_pdf(quotation_id: str) -> bytes:
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.get(
            f"{ERP_URL}/api/method/frappe.utils.print_format.download_pdf",
            params={"doctype": "Quotation", "name": quotation_id, "format": "Estimate", "no_letterhead": 0},
            headers=_erp_headers(),
        )
        return r.content if r.status_code == 200 else b""


async def _background_approve_tasks(quotation_id: str, customer_name: str):
    pdf = await _fetch_signed_pdf(quotation_id)
    if pdf:
        filename = f"{quotation_id}-signed.pdf"
        await _save_to_nas(pdf, filename)
        if RESEND_KEY:
            try:
                import httpx as _h
                b64 = base64.b64encode(pdf).decode()
                async with _h.AsyncClient() as c:
                    await c.post("https://api.resend.com/emails", headers={
                        "Authorization": f"Bearer {RESEND_KEY}",
                        "Content-Type": "application/json",
                    }, json={
                        "from": "AAA Irrigation Service <info@aaairrigationservice.com>",
                        "to": [NOTIFY_EMAIL],
                        "subject": f"Signed Estimate {quotation_id} — {customer_name}",
                        "html": f"<p>Customer <b>{customer_name}</b> signed estimate <b>{quotation_id}</b>. PDF attached.</p>",
                        "attachments": [{"filename": filename, "content": b64}],
                    })
            except Exception as e:
                logger.warning("Email failed: %s", e)


# ── ERP Routes ────────────────────────────────────────────────────────────────

@api_router.get("/erp/estimate/{quotation_id}")
async def get_erp_estimate(quotation_id: str, customer_id: str):
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get(f"{ERP_URL}/api/resource/Quotation/{quotation_id}", headers=_erp_headers())
        if r.status_code != 200:
            raise HTTPException(404, "Estimate not found")
        doc = r.json().get("data", {})
        if doc.get("party_name") != customer_id:
            raise HTTPException(403, "Not authorized")
        # Resolve tech name
        tech = doc.get("custom_technician")
        if tech:
            ur = await c.get(f"{ERP_URL}/api/resource/User/{tech}", headers=_erp_headers())
            if ur.status_code == 200:
                doc["custom_technician_name"] = ur.json().get("data", {}).get("full_name", tech)
    return _erp_to_invoice(doc)


@api_router.post("/erp/estimate/{quotation_id}/approve")
async def approve_erp_estimate(quotation_id: str, customer_id: str, body: ApproveRequest, background_tasks: BackgroundTasks):
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get(f"{ERP_URL}/api/resource/Quotation/{quotation_id}", headers=_erp_headers())
        if r.status_code != 200:
            raise HTTPException(404, "Estimate not found")
        doc = r.json().get("data", {})
        if doc.get("party_name") != customer_id:
            raise HTTPException(403, "Not authorized")

        # Save signature image to ERP
        raw_b64 = body.signature.split(",", 1)[1] if "," in body.signature else body.signature
        await c.post(f"{ERP_URL}/api/method/frappe.client.attach_file", headers=_erp_headers(), json={
            "filename": f"sig_{quotation_id}.png",
            "filedata": raw_b64,
            "doctype": "Quotation",
            "docname": quotation_id,
            "fieldname": "custom_signature_image",
            "is_private": 0,
        })
        await c.put(f"{ERP_URL}/api/resource/Quotation/{quotation_id}", headers=_erp_headers(),
                    json={"custom_signature_captured": 1})

        # Approve in ERP
        ar = await c.post(
            f"{ERP_URL}/api/method/integrity_flow_custom.api.manual_approve_estimate",
            headers=_erp_headers(),
            json={"quotation_id": quotation_id},
        )
        result = ar.json()
        if not result.get("message", {}).get("success"):
            raise HTTPException(400, result.get("message", {}).get("message", "Approval failed"))

    customer_name = doc.get("customer_name", customer_id)
    background_tasks.add_task(_background_approve_tasks, quotation_id, customer_name)
    return {"success": True, "message": "Estimate approved!"}


@api_router.post("/erp/estimate/{quotation_id}/decline")
async def decline_erp_estimate(quotation_id: str, customer_id: str):
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get(f"{ERP_URL}/api/resource/Quotation/{quotation_id}", headers=_erp_headers())
        if r.status_code != 200:
            raise HTTPException(404, "Estimate not found")
        if r.json().get("data", {}).get("party_name") != customer_id:
            raise HTTPException(403, "Not authorized")
        dr = await c.post(
            f"{ERP_URL}/api/method/integrity_flow_custom.api.manual_decline_estimate",
            headers=_erp_headers(),
            json={"quotation_id": quotation_id},
        )
    result = dr.json()
    if result.get("message", {}).get("success") is False:
        raise HTTPException(400, "Decline failed")
    return {"success": True}


@api_router.get("/erp/invoice/{invoice_id}")
async def get_erp_invoice(invoice_id: str, customer_id: str):
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get(f"{ERP_URL}/api/resource/Sales Invoice/{invoice_id}", headers=_erp_headers())
        if r.status_code != 200:
            raise HTTPException(404, "Invoice not found")
        doc = r.json().get("data", {})
        if doc.get("customer") != customer_id:
            raise HTTPException(403, "Not authorized")
    return _erp_invoice_to_invoice(doc)


@api_router.get("/erp/estimate/{quotation_id}/pdf")
async def get_erp_estimate_pdf(quotation_id: str, customer_id: str):
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.get(f"{ERP_URL}/api/resource/Quotation/{quotation_id}", headers=_erp_headers())
        if r.status_code != 200:
            raise HTTPException(404, "Not found")
        if r.json().get("data", {}).get("party_name") != customer_id:
            raise HTTPException(403, "Not authorized")
        pdf_r = await c.get(
            f"{ERP_URL}/api/method/frappe.utils.print_format.download_pdf",
            params={"doctype": "Quotation", "name": quotation_id, "format": "Estimate", "no_letterhead": 0},
            headers=_erp_headers(),
        )
        if pdf_r.status_code != 200:
            raise HTTPException(502, "PDF generation failed")
    return StreamingResponse(iter([pdf_r.content]), media_type="application/pdf",
                             headers={"Content-Disposition": f'inline; filename="{quotation_id}.pdf"'})


# ── Local Invoice CRUD ────────────────────────────────────────────────────────

@api_router.get("/")
async def root():
    return {"message": "AAA Irrigation Invoice API"}

async def _next_invoice_number():
    last = await db.invoices.find_one({}, {"invoice_number": 1}, sort=[("created_at", -1)])
    if last and last.get("invoice_number"):
        try:
            n = int(last["invoice_number"].replace("INV-", ""))
            return f"INV-{n + 1:05d}"
        except Exception:
            pass
    return "INV-00001"

@api_router.post("/invoices", response_model=Invoice)
async def create_invoice(data: InvoiceCreate):
    inv = Invoice(
        invoice_number=data.invoice_number or await _next_invoice_number(),
        date=data.date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        **{k: v for k, v in data.model_dump().items() if k not in ("invoice_number", "date")},
    )
    await db.invoices.insert_one(inv.model_dump())
    return inv

@api_router.get("/invoices", response_model=List[Invoice])
async def list_invoices():
    return await db.invoices.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api_router.get("/invoices/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: str):
    doc = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Invoice not found")
    return doc

@api_router.put("/invoices/{invoice_id}", response_model=Invoice)
async def update_invoice(invoice_id: str, data: InvoiceUpdate):
    upd = {k: v for k, v in data.model_dump().items() if v is not None}
    upd["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.invoices.update_one({"id": invoice_id}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(404, "Invoice not found")
    return await db.invoices.find_one({"id": invoice_id}, {"_id": 0})

@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str):
    res = await db.invoices.delete_one({"id": invoice_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Invoice not found")
    return {"message": "Deleted"}

@api_router.post("/invoices/{invoice_id}/payment", response_model=Invoice)
async def update_payment(invoice_id: str, payment: PaymentUpdate):
    upd = {"payment_status": payment.payment_status, "payment_method": payment.payment_method,
           "updated_at": datetime.now(timezone.utc).isoformat()}
    res = await db.invoices.update_one({"id": invoice_id}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(404, "Invoice not found")
    return await db.invoices.find_one({"id": invoice_id}, {"_id": 0})


@api_router.get("/field-invoices/{invoice_id}/pdf")
async def download_field_invoice_pdf(invoice_id: str):
    """Generate and stream a branded itemized PDF for a field invoice."""
    import io
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_RIGHT, TA_CENTER, TA_LEFT

    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=0.6 * inch,
        rightMargin=0.6 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.6 * inch,
    )

    # ── Brand colours ──────────────────────────────────────────────────────────
    BLUE   = colors.HexColor("#1b7abf")
    GREEN  = colors.HexColor("#059669")
    ORANGE = colors.HexColor("#ea580c")
    LIGHT  = colors.HexColor("#f0f7ff")
    GRAY   = colors.HexColor("#6b7280")
    DKGRAY = colors.HexColor("#1f2937")
    WHITE  = colors.white

    styles = getSampleStyleSheet()

    def style(name, **kw):
        s = ParagraphStyle(name, parent=styles["Normal"], **kw)
        return s

    hdr_title  = style("HdrTitle",  fontSize=22, textColor=WHITE,  fontName="Helvetica-Bold",  leading=26)
    hdr_sub    = style("HdrSub",    fontSize=10, textColor=colors.HexColor("#bfdbfe"), fontName="Helvetica", leading=14)
    label_s    = style("Label",     fontSize=8,  textColor=GRAY,   fontName="Helvetica-Bold",  leading=10, spaceAfter=1)
    val_s      = style("Value",     fontSize=10, textColor=DKGRAY, fontName="Helvetica",       leading=13)
    val_bold   = style("ValBold",   fontSize=11, textColor=BLUE,   fontName="Helvetica-Bold",  leading=14)
    right_s    = style("Right",     fontSize=10, textColor=DKGRAY, fontName="Helvetica",       leading=13, alignment=TA_RIGHT)
    right_bold = style("RightBold", fontSize=11, textColor=BLUE,   fontName="Helvetica-Bold",  leading=14, alignment=TA_RIGHT)
    footer_s   = style("Footer",    fontSize=8,  textColor=GRAY,   fontName="Helvetica-Oblique", leading=10, alignment=TA_CENTER)
    th_s       = style("TH",        fontSize=9,  textColor=WHITE,  fontName="Helvetica-Bold",  leading=11, alignment=TA_CENTER)
    td_s       = style("TD",        fontSize=9,  textColor=DKGRAY, fontName="Helvetica",       leading=12)
    td_right   = style("TDR",       fontSize=9,  textColor=DKGRAY, fontName="Helvetica",       leading=12, alignment=TA_RIGHT)
    td_center  = style("TDC",       fontSize=9,  textColor=DKGRAY, fontName="Helvetica",       leading=12, alignment=TA_CENTER)
    paid_s     = style("Paid",      fontSize=56, textColor=GREEN,  fontName="Helvetica-Bold",  leading=60, alignment=TA_CENTER)

    story = []
    W = 7.3 * inch  # usable width

    # ── HEADER BAND ────────────────────────────────────────────────────────────
    header_data = [[
        Paragraph("AAA IRRIGATION SERVICE, LLC", hdr_title),
        Paragraph(
            "Allen, TX 75002 · (469) 751-3567<br/>"
            "www.aaairrigationservice.com<br/>"
            "Powered by Boatman Systems™",
            hdr_sub
        ),
    ]]
    header_tbl = Table(header_data, colWidths=[W * 0.6, W * 0.4])
    header_tbl.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, -1), BLUE),
        ("VALIGN",      (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (0, -1), 14),
        ("RIGHTPADDING",(-1, 0),(-1, -1),14),
        ("TOPPADDING",  (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING",(0, 0),(-1, -1), 14),
        ("ALIGN",       (1, 0), (1, -1),  "RIGHT"),
    ]))
    story.append(header_tbl)
    story.append(Spacer(1, 10))

    # ── INVOICE META + BILL TO ─────────────────────────────────────────────────
    cust_name  = invoice.get("customer_name", "")
    bill_addr  = invoice.get("billing_address", "")
    svc_addr   = invoice.get("service_address", "")
    phone      = invoice.get("phone", "")
    email      = invoice.get("email", "")
    inv_num    = invoice.get("invoice_number", "")
    inv_date   = invoice.get("date", "")
    terms      = invoice.get("terms", "Due on Receipt")
    tech       = invoice.get("tech", "")

    bill_cell = [
        Paragraph("BILL TO", label_s),
        Paragraph(cust_name, val_bold),
    ]
    if bill_addr:
        bill_cell.append(Paragraph(bill_addr.replace("\n", "<br/>"), val_s))
    if phone:
        bill_cell.append(Paragraph(phone, val_s))
    if email:
        bill_cell.append(Paragraph(email, val_s))
    if svc_addr and svc_addr != bill_addr:
        bill_cell.append(Spacer(1, 6))
        bill_cell.append(Paragraph("SERVICE ADDRESS", label_s))
        bill_cell.append(Paragraph(svc_addr.replace("\n", "<br/>"), val_s))

    meta_right = [
        [Paragraph("INVOICE #", label_s), Paragraph(inv_num, right_bold)],
        [Paragraph("DATE",      label_s), Paragraph(inv_date, right_s)],
        [Paragraph("TERMS",     label_s), Paragraph(terms,    right_s)],
    ]
    if tech:
        meta_right.append([Paragraph("TECH", label_s), Paragraph(tech, right_s)])

    meta_tbl = Table(meta_right, colWidths=[0.8 * inch, 1.8 * inch])
    meta_tbl.setStyle(TableStyle([
        ("ALIGN",       (1, 0), (1, -1), "RIGHT"),
        ("TOPPADDING",  (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING",(0, 0),(-1, -1), 3),
        ("LINEBEFORE",  (0, 0), (0, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))

    top_data = [[bill_cell, meta_tbl]]
    top_tbl  = Table(top_data, colWidths=[W * 0.55, W * 0.45])
    top_tbl.setStyle(TableStyle([
        ("VALIGN",      (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",  (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING",(0, 0),(-1, -1), 0),
        ("ALIGN",       (1, 0), (1, -1),  "RIGHT"),
    ]))
    story.append(top_tbl)
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width=W, thickness=2, color=BLUE, spaceAfter=8))

    # ── LINE ITEMS TABLE ───────────────────────────────────────────────────────
    line_items = invoice.get("line_items") or []
    tbl_data = [[
        Paragraph("ZONE",        th_s),
        Paragraph("DESCRIPTION", th_s),
        Paragraph("QTY",         th_s),
        Paragraph("RATE",        th_s),
        Paragraph("AMOUNT",      th_s),
    ]]

    for i, item in enumerate(line_items):
        amt  = item.get("amount") or ((item.get("qty") or 0) * (item.get("rate") or 0))
        row  = [
            Paragraph(str(item.get("zone",  "") or ""), td_center),
            Paragraph(str(item.get("description", "") or ""), td_s),
            Paragraph(str(item.get("qty",   0)  or 0), td_center),
            Paragraph(f"${item.get('rate', 0):,.2f}", td_right),
            Paragraph(f"${amt:,.2f}", td_right),
        ]
        tbl_data.append(row)

    # Ensure minimum 5 rows
    while len(tbl_data) < 6:
        tbl_data.append(["", "", "", "", ""])

    col_w = [0.5 * inch, W - 3.3 * inch, 0.6 * inch, 0.9 * inch, 0.9 * inch]
    items_tbl = Table(tbl_data, colWidths=col_w, repeatRows=1)
    items_style = [
        ("BACKGROUND",    (0, 0),  (-1, 0),         BLUE),
        ("TEXTCOLOR",     (0, 0),  (-1, 0),          WHITE),
        ("FONTNAME",      (0, 0),  (-1, 0),          "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0),  (-1, 0),          9),
        ("ALIGN",         (0, 0),  (-1, -1),          "CENTER"),
        ("ALIGN",         (1, 1),  (1, -1),           "LEFT"),
        ("ALIGN",         (3, 1),  (4, -1),           "RIGHT"),
        ("TOPPADDING",    (0, 0),  (-1, -1),          5),
        ("BOTTOMPADDING", (0, 0),  (-1, -1),          5),
        ("LEFTPADDING",   (0, 0),  (-1, -1),          6),
        ("RIGHTPADDING",  (0, 0),  (-1, -1),          6),
        ("GRID",          (0, 0),  (-1, -1),          0.4, colors.HexColor("#e5e7eb")),
        ("ROWBACKGROUNDS",(0, 1),  (-1, -1),          [WHITE, LIGHT]),
    ]
    items_tbl.setStyle(TableStyle(items_style))
    story.append(items_tbl)
    story.append(Spacer(1, 14))

    # ── TOTALS ─────────────────────────────────────────────────────────────────
    subtotal   = invoice.get("subtotal",   0) or 0
    tax_rate   = invoice.get("tax_rate",   8.25)
    tax_amount = invoice.get("tax_amount", 0) or 0
    discount   = invoice.get("discount",   0) or 0
    total      = invoice.get("total",      0) or 0

    totals_data = [
        [Paragraph("Subtotal:",       right_s), Paragraph(f"${subtotal:,.2f}",   right_s)],
        [Paragraph(f"Tax ({tax_rate}%):", right_s), Paragraph(f"${tax_amount:,.2f}", right_s)],
    ]
    if discount:
        totals_data.append([
            Paragraph("Discount:",    right_s),
            Paragraph(f"-${discount:,.2f}", style("Disc", fontSize=10, textColor=ORANGE, fontName="Helvetica", leading=13, alignment=TA_RIGHT)),
        ])
    totals_data.append([
        Paragraph("TOTAL DUE:", style("TotLbl", fontSize=13, textColor=WHITE, fontName="Helvetica-Bold", leading=16, alignment=TA_RIGHT)),
        Paragraph(f"${total:,.2f}", style("TotAmt", fontSize=13, textColor=WHITE, fontName="Helvetica-Bold", leading=16, alignment=TA_RIGHT)),
    ])

    totals_tbl = Table(totals_data, colWidths=[1.4 * inch, 1.1 * inch])
    tot_style = [
        ("ALIGN",          (0, 0), (-1, -1), "RIGHT"),
        ("TOPPADDING",     (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING",  (0, 0), (-1, -1), 4),
        ("LEFTPADDING",    (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",   (0, 0), (-1, -1), 6),
        ("LINEBELOW",      (0, -2), (-1, -2), 1, BLUE),
        ("BACKGROUND",     (0, -1), (-1, -1), BLUE),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
    ]
    totals_tbl.setStyle(TableStyle(tot_style))

    # Right-align the totals block
    outer = Table([[Paragraph("", val_s), totals_tbl]], colWidths=[W - 2.6 * inch, 2.6 * inch])
    outer.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(outer)

    # ── PAID STAMP ─────────────────────────────────────────────────────────────
    if invoice.get("payment_status") == "paid":
        story.append(Spacer(1, 8))
        paid_tbl = Table([[Paragraph("✓  PAID", paid_s)]], colWidths=[W])
        paid_tbl.setStyle(TableStyle([
            ("BOX",            (0, 0), (-1, -1), 4, GREEN),
            ("TOPPADDING",     (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING",  (0, 0), (-1, -1), 8),
        ]))
        story.append(paid_tbl)

    # ── FOOTER ─────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 14))
    story.append(HRFlowable(width=W, thickness=0.5, color=colors.HexColor("#e5e7eb"), spaceAfter=6))
    story.append(Paragraph(
        "Irrigation in Texas is regulated by the TCEQ, P.O. Box 13087, Austin, Texas 78711-3087 · "
        "Licensed Irrigator LI0018222 · Powered by Boatman Systems™",
        footer_s
    ))

    doc.build(story)
    buf.seek(0)

    safe_num = inv_num.replace("/", "-").replace(" ", "_")
    filename = f"AAA_Invoice_{safe_num}.pdf"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'}
    )


app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

@app.on_event("shutdown")
async def shutdown():
    client.close()
