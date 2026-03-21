# AAA Irrigation Service Invoice Template - PRD

## Original Problem Statement
Create a professional invoice template for ERPNext-style system with:
- Texas state seal watermark in background
- Company logo at top: AAA IRRIGATION SERVICE, LLC. Allen TX 75002 469 751-3567 www.aaairrigationservice.com
- Top left: Customer name, billing address, phone, email
- Top right: Invoice#, Date, Terms, Tech
- Body: 5 rows table with Zone#/Description/Qty/Rate/Amount
- Totals: Subtotal, Tax, Discount, Total
- Payment buttons: Credit Card (Chase), Cash App ($AAAIRRIGATIONSERVICE), Zelle (aaairrigationservice@yahoo.com)
- Footer: TCEQ regulation notice
- Blue theme matching logo

## User Personas
1. **Business Owner** - Creates and manages invoices for irrigation services
2. **Customers** - View invoices and make payments via multiple methods
3. **Technicians** - Named on invoices for service tracking

## Core Requirements (Static)
- ✅ Professional invoice template with company branding
- ✅ Texas Licensed Irrigator seal as watermark
- ✅ Customer and invoice info sections
- ✅ 5-row line items table
- ✅ Automatic calculation of subtotal, tax (8.25%), discount, total
- ✅ Payment options: Credit Card, Cash App, Zelle
- ✅ TCEQ regulatory footer
- ✅ Print functionality
- ✅ Invoice CRUD operations

## What's Been Implemented (Jan 2026)
### Backend (FastAPI + MongoDB)
- Invoice model with all required fields
- Auto-generated invoice numbers (INV-00001 format)
- CRUD endpoints: Create, Read, Update, Delete invoices
- Payment status tracking
- Texas sales tax calculation (8.25%)

### Frontend (React + Tailwind)
- Invoice list dashboard with company branding
- Create/edit invoice form with live calculations
- Professional invoice template with:
  - Logo header
  - Texas seal watermark background
  - Customer info (left) / Invoice details (right)
  - 5-row line items table
  - Totals section
  - Payment modal with Credit Card, Cash App, Zelle
  - TCEQ footer
- Print functionality
- Responsive design

## Tech Stack
- Frontend: React 19, Tailwind CSS, Lucide React icons
- Backend: FastAPI, Motor (async MongoDB)
- Database: MongoDB
- Styling: Custom CSS with Montserrat font

## P0/P1/P2 Features

### P0 (Critical) - COMPLETED
- ✅ Invoice creation and viewing
- ✅ Professional template layout
- ✅ Payment options display
- ✅ Print capability

### P1 (Important) - BACKLOG
- Chase payment gateway integration
- Email invoice to customers
- PDF export
- Invoice editing

### P2 (Nice to Have) - BACKLOG
- Customer database/autocomplete
- Recurring invoices
- Payment reminders
- Reports/analytics

## Next Tasks
1. Integrate Chase credit card processing
2. Add email invoice functionality
3. PDF generation and download
4. Customer database with search
