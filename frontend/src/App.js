import { useState, useEffect } from "react";
import "@/App.css";
import axios from "axios";
import { Printer, Plus, Trash2, CreditCard, DollarSign, Building2, ChevronLeft, FileText } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Company Logo URL
const LOGO_URL = "https://customer-assets.emergentagent.com/job_d103776f-33dd-494c-8cc3-8cf5e55c4b09/artifacts/8oehlteb_header1.png";
const SEAL_URL = "https://customer-assets.emergentagent.com/job_d103776f-33dd-494c-8cc3-8cf5e55c4b09/artifacts/2rjpk01m_seal.png";

// Payment Modal Component
const PaymentModal = ({ isOpen, onClose, invoice, onPaymentSuccess }) => {
  const [selectedMethod, setSelectedMethod] = useState(null);

  if (!isOpen) return null;

  const handlePayment = async (method) => {
    try {
      await axios.post(`${API}/invoices/${invoice.id}/payment`, {
        payment_status: "paid",
        payment_method: method
      });
      onPaymentSuccess();
      onClose();
    } catch (error) {
      console.error("Payment update failed:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" data-testid="payment-modal">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-[#0a2463] mb-2">Payment Options</h2>
        <p className="text-gray-600 mb-6">Total Due: <span className="font-bold text-[#0a2463]">${invoice?.total?.toFixed(2)}</span></p>
        
        <div className="space-y-3">
          {/* Credit Card - Chase */}
          <button
            onClick={() => setSelectedMethod('credit_card')}
            className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
              selectedMethod === 'credit_card' 
                ? 'border-[#0a2463] bg-[#0a2463]/5' 
                : 'border-gray-200 hover:border-[#0a2463]/50'
            }`}
            data-testid="payment-credit-card"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0a2463] to-[#1e88e5] flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">Credit Card</p>
              <p className="text-sm text-gray-500">Pay via Chase Processing</p>
            </div>
          </button>

          {/* Cash App */}
          <button
            onClick={() => handlePayment('cash_app')}
            className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-[#00D632]/50 flex items-center gap-4 transition-all"
            data-testid="payment-cash-app"
          >
            <div className="w-12 h-12 rounded-full bg-[#00D632] flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">Cash App</p>
              <p className="text-sm text-[#00D632] font-medium">$AAAIRRIGATIONSERVICE</p>
            </div>
          </button>

          {/* Zelle */}
          <button
            onClick={() => handlePayment('zelle')}
            className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-[#6D1ED4]/50 flex items-center gap-4 transition-all"
            data-testid="payment-zelle"
          >
            <div className="w-12 h-12 rounded-full bg-[#6D1ED4] flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">Zelle</p>
              <p className="text-sm text-[#6D1ED4] font-medium">aaairrigationservice@yahoo.com</p>
            </div>
          </button>
        </div>

        {selectedMethod === 'credit_card' && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600 mb-3">Chase Credit Card processing will be available. For now, please contact us directly.</p>
            <p className="font-semibold text-[#0a2463]">Call: 469 751-3567</p>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 text-gray-600 hover:text-gray-900 font-medium"
          data-testid="payment-modal-close"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

// Invoice Template Component
const InvoiceTemplate = ({ invoice, onBack, onPaymentSuccess }) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-container { 
            box-shadow: none !important; 
            margin: 0 !important;
            padding: 20px !important;
          }
        }
      `}</style>

      {/* Action Bar */}
      <div className="no-print sticky top-0 bg-white shadow-md z-40 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-[#0a2463] transition-colors"
            data-testid="back-button"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back to Invoices</span>
          </button>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              data-testid="print-button"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            {invoice.payment_status !== 'paid' && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center gap-2 px-6 py-2 bg-[#0a2463] text-white rounded-lg hover:bg-[#0a2463]/90 transition-colors font-medium"
                data-testid="pay-now-button"
              >
                <CreditCard className="w-4 h-4" />
                Pay Now
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="py-8 px-4">
        <div className="print-container max-w-4xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden relative">

          {/* Seal - Bottom Left, 15% opacity, 30% larger */}
          <div className="absolute bottom-8 left-8 z-20 pointer-events-none" style={{ opacity: 0.15 }}>
            <img 
              src={SEAL_URL} 
              alt="Texas Licensed Irrigator Seal" 
              className="object-contain"
              style={{ width: '208px', height: '208px' }}
            />
          </div>

          {/* PAID Stamp */}
          {invoice.payment_status === 'paid' && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none rotate-[-15deg]">
              <div className="border-8 border-green-600 rounded-lg px-8 py-4" style={{ opacity: 0.7 }}>
                <p className="text-6xl font-black text-green-600 tracking-widest">PAID</p>
              </div>
            </div>
          )}

          {/* Content Container */}
          <div className="relative z-10 p-8">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b-4 border-[#0a2463] pb-6 mb-6">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-4">
                  <img src={LOGO_URL} alt="AAA Irrigation Service" className="h-20 w-auto" />
                  <div className="text-center">
                    <h1 className="text-5xl font-black text-[#0a2463] tracking-tight" style={{ fontWeight: 900 }}>AAA</h1>
                    <p className="text-xl font-bold text-[#0a2463] tracking-wide">IRRIGATION SERVICE, LLC</p>
                  </div>
                </div>
                <div className="text-center mt-2">
                  <p className="text-gray-600">Allen TX 75002</p>
                  <p className="text-gray-600">469 751-3567</p>
                  <p className="text-[#1e88e5]">www.aaairrigationservice.com</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-bold text-[#0a2463] tracking-wider">INVOICE</h2>
              </div>
            </div>

            {/* Two Column Info */}
            <div className="flex justify-between mb-8">
              {/* Left - Customer Info */}
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Bill To</p>
                <p className="text-xl font-bold text-[#0a2463]" data-testid="customer-name">{invoice.customer_name}</p>
                <p className="text-gray-600" data-testid="billing-address">{invoice.billing_address}</p>
                <p className="text-gray-600" data-testid="customer-phone">{invoice.phone}</p>
                <p className="text-gray-600" data-testid="customer-email">{invoice.email}</p>
                
                {invoice.service_address && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Service Address</p>
                    <p className="text-gray-600" data-testid="service-address">{invoice.service_address}</p>
                  </div>
                )}
              </div>

              {/* Right - Invoice Details */}
              <div className="text-right space-y-2">
                <div className="flex justify-end gap-8">
                  <span className="text-gray-500">Invoice #:</span>
                  <span className="font-bold text-[#0a2463]" data-testid="invoice-number">{invoice.invoice_number}</span>
                </div>
                <div className="flex justify-end gap-8">
                  <span className="text-gray-500">Date:</span>
                  <span className="font-medium" data-testid="invoice-date">{invoice.date}</span>
                </div>
                <div className="flex justify-end gap-8">
                  <span className="text-gray-500">Terms:</span>
                  <span className="font-medium" data-testid="invoice-terms">{invoice.terms}</span>
                </div>
                <div className="flex justify-end gap-8">
                  <span className="text-gray-500">Tech:</span>
                  <span className="font-medium" data-testid="invoice-tech">{invoice.tech}</span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="mb-8">
              <table className="w-full" data-testid="line-items-table">
                <thead>
                  <tr className="bg-[#0a2463] text-white">
                    <th className="py-3 px-4 text-left font-semibold">Zone #</th>
                    <th className="py-3 px-4 text-left font-semibold">Description</th>
                    <th className="py-3 px-4 text-center font-semibold">Qty</th>
                    <th className="py-3 px-4 text-right font-semibold">Rate</th>
                    <th className="py-3 px-4 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.line_items && invoice.line_items.map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="py-3 px-4 border-b border-gray-200">{item.zone}</td>
                      <td className="py-3 px-4 border-b border-gray-200">{item.description}</td>
                      <td className="py-3 px-4 border-b border-gray-200 text-center">{item.qty}</td>
                      <td className="py-3 px-4 border-b border-gray-200 text-right">${item.rate?.toFixed(2)}</td>
                      <td className="py-3 px-4 border-b border-gray-200 text-right font-medium">${item.amount?.toFixed(2)}</td>
                    </tr>
                  ))}
                  {/* Empty rows to maintain 5 row minimum */}
                  {Array.from({ length: Math.max(0, 5 - (invoice.line_items?.length || 0)) }).map((_, index) => (
                    <tr key={`empty-${index}`} className={(invoice.line_items?.length || 0) + index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="py-3 px-4 border-b border-gray-200">&nbsp;</td>
                      <td className="py-3 px-4 border-b border-gray-200">&nbsp;</td>
                      <td className="py-3 px-4 border-b border-gray-200">&nbsp;</td>
                      <td className="py-3 px-4 border-b border-gray-200">&nbsp;</td>
                      <td className="py-3 px-4 border-b border-gray-200">&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-72">
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium" data-testid="subtotal">${invoice.subtotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Tax ({invoice.tax_rate}%):</span>
                  <span className="font-medium" data-testid="tax-amount">${invoice.tax_amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium text-red-500" data-testid="discount">-${invoice.discount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-3 bg-[#0a2463] text-white px-4 rounded-lg mt-2">
                  <span className="font-bold text-lg">TOTAL:</span>
                  <span className="font-bold text-lg" data-testid="total">${invoice.total?.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Buttons (Print visible) */}
            <div className="no-print flex justify-center gap-4 mb-8 py-4 border-t border-b border-gray-200">
              <button
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-[#0a2463] text-white rounded-xl hover:bg-[#0a2463]/90 transition-all shadow-lg hover:shadow-xl"
                data-testid="pay-credit-card-inline"
              >
                <CreditCard className="w-5 h-5" />
                Pay with Credit Card
              </button>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-[#00D632] text-white rounded-xl hover:bg-[#00D632]/90 transition-all shadow-lg hover:shadow-xl"
                data-testid="pay-cash-app-inline"
              >
                <DollarSign className="w-5 h-5" />
                Cash App
              </button>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-[#6D1ED4] text-white rounded-xl hover:bg-[#6D1ED4]/90 transition-all shadow-lg hover:shadow-xl"
                data-testid="pay-zelle-inline"
              >
                <Building2 className="w-5 h-5" />
                Zelle
              </button>
            </div>

            {/* Footer */}
            <div className="text-center pt-4 border-t border-gray-300">
              <p className="text-xs text-gray-500 italic">
                Irrigation in Texas is regulated by the TCEQ, P.O. Box 13087, Austin, Texas 78711-3087
              </p>
            </div>
          </div>
        </div>
      </div>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        invoice={invoice}
        onPaymentSuccess={onPaymentSuccess}
      />
    </div>
  );
};

// Invoice Form Component
const InvoiceForm = ({ onSave, onCancel, editInvoice }) => {
  const [formData, setFormData] = useState({
    customer_name: editInvoice?.customer_name || "",
    billing_address: editInvoice?.billing_address || "",
    service_address: editInvoice?.service_address || "",
    phone: editInvoice?.phone || "",
    email: editInvoice?.email || "",
    date: editInvoice?.date || new Date().toISOString().split('T')[0],
    terms: editInvoice?.terms || "Due on Receipt",
    tech: editInvoice?.tech || "",
    line_items: editInvoice?.line_items || [
      { zone: "", description: "", qty: 0, rate: 0, amount: 0 },
      { zone: "", description: "", qty: 0, rate: 0, amount: 0 },
      { zone: "", description: "", qty: 0, rate: 0, amount: 0 },
      { zone: "", description: "", qty: 0, rate: 0, amount: 0 },
      { zone: "", description: "", qty: 0, rate: 0, amount: 0 }
    ],
    tax_rate: editInvoice?.tax_rate || 8.25,
    discount: editInvoice?.discount || 0
  });

  const calculateTotals = () => {
    const subtotal = formData.line_items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const taxAmount = subtotal * (formData.tax_rate / 100);
    const total = subtotal + taxAmount - formData.discount;
    return { subtotal, taxAmount, total };
  };

  const updateLineItem = (index, field, value) => {
    const newItems = [...formData.line_items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'qty' || field === 'rate') {
      newItems[index].amount = (newItems[index].qty || 0) * (newItems[index].rate || 0);
    }
    
    setFormData({ ...formData, line_items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { subtotal, taxAmount, total } = calculateTotals();
    
    const invoiceData = {
      ...formData,
      subtotal,
      tax_amount: taxAmount,
      total
    };

    try {
      if (editInvoice) {
        await axios.put(`${API}/invoices/${editInvoice.id}`, invoiceData);
      } else {
        await axios.post(`${API}/invoices`, invoiceData);
      }
      onSave();
    } catch (error) {
      console.error("Failed to save invoice:", error);
    }
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-[#0a2463]">
              {editInvoice ? 'Edit Invoice' : 'Create New Invoice'}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700"
              data-testid="cancel-form"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Info */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-[#0a2463] border-b pb-2">Customer Information</h3>
                <input
                  type="text"
                  placeholder="Customer Name *"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a2463] focus:border-transparent"
                  required
                  data-testid="input-customer-name"
                />
                <textarea
                  placeholder="Billing Address"
                  value={formData.billing_address}
                  onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a2463] focus:border-transparent"
                  rows={2}
                  data-testid="input-billing-address"
                />
                <textarea
                  placeholder="Service Address (if different)"
                  value={formData.service_address}
                  onChange={(e) => setFormData({ ...formData, service_address: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a2463] focus:border-transparent"
                  rows={2}
                  data-testid="input-service-address"
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a2463] focus:border-transparent"
                  data-testid="input-phone"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a2463] focus:border-transparent"
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-[#0a2463] border-b pb-2">Invoice Details</h3>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a2463] focus:border-transparent"
                  data-testid="input-date"
                />
                <input
                  type="text"
                  placeholder="Terms (e.g., Due on Receipt)"
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a2463] focus:border-transparent"
                  data-testid="input-terms"
                />
                <input
                  type="text"
                  placeholder="Technician Name"
                  value={formData.tech}
                  onChange={(e) => setFormData({ ...formData, tech: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a2463] focus:border-transparent"
                  data-testid="input-tech"
                />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <h3 className="font-semibold text-[#0a2463] border-b pb-2 mb-4">Line Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="form-line-items">
                  <thead>
                    <tr className="bg-[#0a2463] text-white">
                      <th className="py-2 px-3 text-left text-sm">Zone #</th>
                      <th className="py-2 px-3 text-left text-sm">Description</th>
                      <th className="py-2 px-3 text-center text-sm w-20">Qty</th>
                      <th className="py-2 px-3 text-right text-sm w-24">Rate</th>
                      <th className="py-2 px-3 text-right text-sm w-24">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.line_items.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-2 px-1">
                          <input
                            type="text"
                            value={item.zone}
                            onChange={(e) => updateLineItem(index, 'zone', e.target.value)}
                            className="w-full px-2 py-2 border border-gray-200 rounded focus:ring-1 focus:ring-[#0a2463]"
                            data-testid={`input-zone-${index}`}
                          />
                        </td>
                        <td className="py-2 px-1">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                            className="w-full px-2 py-2 border border-gray-200 rounded focus:ring-1 focus:ring-[#0a2463]"
                            data-testid={`input-description-${index}`}
                          />
                        </td>
                        <td className="py-2 px-1">
                          <input
                            type="number"
                            value={item.qty || ''}
                            onChange={(e) => updateLineItem(index, 'qty', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-2 border border-gray-200 rounded text-center focus:ring-1 focus:ring-[#0a2463]"
                            data-testid={`input-qty-${index}`}
                          />
                        </td>
                        <td className="py-2 px-1">
                          <input
                            type="number"
                            step="0.01"
                            value={item.rate || ''}
                            onChange={(e) => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-2 border border-gray-200 rounded text-right focus:ring-1 focus:ring-[#0a2463]"
                            data-testid={`input-rate-${index}`}
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-[#0a2463]">
                          ${item.amount?.toFixed(2) || '0.00'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-72 space-y-2">
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 items-center">
                  <span className="text-gray-600">Tax Rate (%):</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                    className="w-20 px-2 py-1 border border-gray-200 rounded text-right"
                    data-testid="input-tax-rate"
                  />
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Tax Amount:</span>
                  <span className="font-medium">${taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 items-center">
                  <span className="text-gray-600">Discount:</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                    className="w-20 px-2 py-1 border border-gray-200 rounded text-right"
                    data-testid="input-discount"
                  />
                </div>
                <div className="flex justify-between py-3 bg-[#0a2463] text-white px-4 rounded-lg">
                  <span className="font-bold">TOTAL:</span>
                  <span className="font-bold">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 text-gray-600 hover:text-gray-900"
                data-testid="cancel-button"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-8 py-3 bg-[#0a2463] text-white rounded-lg hover:bg-[#0a2463]/90 font-medium shadow-lg"
                data-testid="save-invoice-button"
              >
                {editInvoice ? 'Update Invoice' : 'Create Invoice'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Invoice List Component
const InvoiceList = ({ onCreateNew, onViewInvoice }) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await axios.get(`${API}/invoices`);
      setInvoices(response.data);
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteInvoice = async (id) => {
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      try {
        await axios.delete(`${API}/invoices/${id}`);
        fetchInvoices();
      } catch (error) {
        console.error("Failed to delete invoice:", error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-[#0a2463] text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={LOGO_URL} alt="AAA Irrigation Service" className="h-14 w-auto" />
              <div>
                <h1 className="text-xl font-bold">AAA IRRIGATION SERVICE, LLC</h1>
                <p className="text-sm text-blue-200">Invoice Management System</p>
              </div>
            </div>
            <button
              onClick={onCreateNew}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#0a2463] rounded-lg hover:bg-gray-100 transition-colors font-medium shadow-lg"
              data-testid="create-invoice-button"
            >
              <Plus className="w-5 h-5" />
              New Invoice
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-[#0a2463] mb-6">Recent Invoices</h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-[#0a2463] border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No invoices yet</p>
            <p className="text-gray-400 mb-6">Create your first invoice to get started</p>
            <button
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#0a2463] text-white rounded-lg hover:bg-[#0a2463]/90 font-medium"
              data-testid="create-first-invoice"
            >
              <Plus className="w-5 h-5" />
              Create Invoice
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full" data-testid="invoices-table">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-600">Invoice #</th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-600">Customer</th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-600">Date</th>
                  <th className="py-4 px-6 text-right text-sm font-semibold text-gray-600">Total</th>
                  <th className="py-4 px-6 text-center text-sm font-semibold text-gray-600">Status</th>
                  <th className="py-4 px-6 text-center text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-medium text-[#0a2463]">{invoice.invoice_number}</span>
                    </td>
                    <td className="py-4 px-6">{invoice.customer_name}</td>
                    <td className="py-4 px-6 text-gray-500">{invoice.date}</td>
                    <td className="py-4 px-6 text-right font-semibold">${invoice.total?.toFixed(2)}</td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        invoice.payment_status === 'paid' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {invoice.payment_status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onViewInvoice(invoice)}
                          className="px-3 py-1.5 text-sm bg-[#0a2463] text-white rounded-lg hover:bg-[#0a2463]/90"
                          data-testid={`view-invoice-${invoice.id}`}
                        >
                          View
                        </button>
                        <button
                          onClick={() => deleteInvoice(invoice.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                          data-testid={`delete-invoice-${invoice.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 text-center text-sm text-gray-500">
        <p>Irrigation in Texas is regulated by the TCEQ, P.O. Box 13087, Austin, Texas 78711-3087</p>
      </footer>
    </div>
  );
};

function App() {
  const [view, setView] = useState('list'); // list, form, invoice
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [editInvoice, setEditInvoice] = useState(null);

  const handleCreateNew = () => {
    setEditInvoice(null);
    setView('form');
  };

  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setView('invoice');
  };

  const handleSave = () => {
    setView('list');
    setEditInvoice(null);
  };

  const handleBack = () => {
    setView('list');
    setSelectedInvoice(null);
  };

  const handlePaymentSuccess = async () => {
    // Refresh the invoice data
    try {
      const response = await axios.get(`${API}/invoices/${selectedInvoice.id}`);
      setSelectedInvoice(response.data);
    } catch (error) {
      console.error("Failed to refresh invoice:", error);
    }
  };

  return (
    <div className="App">
      {view === 'list' && (
        <InvoiceList 
          onCreateNew={handleCreateNew} 
          onViewInvoice={handleViewInvoice}
        />
      )}
      {view === 'form' && (
        <InvoiceForm 
          onSave={handleSave} 
          onCancel={handleBack}
          editInvoice={editInvoice}
        />
      )}
      {view === 'invoice' && selectedInvoice && (
        <InvoiceTemplate 
          invoice={selectedInvoice} 
          onBack={handleBack}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}

export default App;
