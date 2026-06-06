import { useState, useEffect, useRef } from "react";
import "@/App.css";
import axios from "axios";
import { Printer, Plus, Trash2, CreditCard, DollarSign, Building2, ChevronLeft, FileText, CheckCircle, XCircle } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LOGO_URL = "https://portal.aaairrigationservice.com/header_new.png";
const SEAL_URL = "https://portal.aaairrigationservice.com/seal.png";

const fmt = (n) => `$${(parseFloat(n) || 0).toFixed(2)}`;

// ── Payment Modal ─────────────────────────────────────────────────────────────
const PaymentModal = ({ isOpen, onClose, invoice, onPaymentSuccess }) => {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [copied, setCopied] = useState(false);
  const [cardForm, setCardForm] = useState({ cardNumber: "", expiry: "", cvc: "", name: "" });
  const [processing, setProcessing] = useState(false);

  if (!isOpen) return null;

  const handlePayment = async (method) => {
    try {
      await axios.post(`${API}/invoices/${invoice.id}/payment`, { payment_status: "paid", payment_method: method });
      onPaymentSuccess();
      onClose();
    } catch (e) { console.error(e); }
  };

  const copy = (text) => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleCard = async (e) => { e.preventDefault(); setProcessing(true); setTimeout(async () => { await handlePayment("credit_card"); setProcessing(false); }, 2000); };
  const fmtCard = (v) => { const d = v.replace(/\D/g, ""); const p = []; for (let i = 0; i < d.length && i < 16; i += 4) p.push(d.slice(i, i+4)); return p.join(" "); };
  const fmtExp  = (v) => { const d = v.replace(/\D/g, ""); return d.length >= 2 ? d.slice(0,2) + "/" + d.slice(2,4) : d; };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-[#1b7abf] mb-2">Payment Options</h2>
        <p className="text-gray-600 mb-6">Total Due: <span className="font-bold text-[#1b7abf]">{fmt(invoice?.total)}</span></p>

        {!selectedMethod && (
          <div className="space-y-3">
            <button onClick={() => setSelectedMethod("credit_card")} className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-[#1b7abf]/50 flex items-center gap-4 transition-all">
              <div className="w-12 h-12 rounded-full bg-[#1b7abf] flex items-center justify-center"><CreditCard className="w-6 h-6 text-white" /></div>
              <div className="text-left"><p className="font-semibold">Credit Card</p><p className="text-sm text-gray-500">Authorize.net</p></div>
            </button>
            <button onClick={() => setSelectedMethod("zelle")} className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-[#6D1ED4]/50 flex items-center gap-4 transition-all">
              <div className="w-12 h-12 rounded-full bg-[#6D1ED4] flex items-center justify-center"><Building2 className="w-6 h-6 text-white" /></div>
              <div className="text-left"><p className="font-semibold">Zelle</p><p className="text-sm text-[#6D1ED4] font-medium">aaairrigationservice@yahoo.com</p></div>
            </button>
            <button onClick={() => setSelectedMethod("cash_app")} className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-[#00D632]/50 flex items-center gap-4 transition-all">
              <div className="w-12 h-12 rounded-full bg-[#00D632] flex items-center justify-center"><DollarSign className="w-6 h-6 text-white" /></div>
              <div className="text-left"><p className="font-semibold">Cash App</p><p className="text-sm text-[#00D632] font-medium">$AAAIRRIGATIONSERVICE</p></div>
            </button>
          </div>
        )}

        {selectedMethod === "credit_card" && (
          <div className="space-y-4">
            <button onClick={() => setSelectedMethod(null)} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
            <form onSubmit={handleCard} className="space-y-4">
              <input type="text" placeholder="Cardholder Name" value={cardForm.name} onChange={e=>setCardForm({...cardForm,name:e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg" required />
              <input type="text" placeholder="1234 5678 9012 3456" value={cardForm.cardNumber} onChange={e=>setCardForm({...cardForm,cardNumber:fmtCard(e.target.value)})} maxLength={19} className="w-full px-4 py-3 border border-gray-300 rounded-lg" required />
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="MM/YY" value={cardForm.expiry} onChange={e=>setCardForm({...cardForm,expiry:fmtExp(e.target.value)})} maxLength={5} className="px-4 py-3 border border-gray-300 rounded-lg" required />
                <input type="text" placeholder="CVC" value={cardForm.cvc} onChange={e=>setCardForm({...cardForm,cvc:e.target.value.replace(/\D/g,"").slice(0,4)})} maxLength={4} className="px-4 py-3 border border-gray-300 rounded-lg" required />
              </div>
              <button type="submit" disabled={processing} className="w-full py-4 bg-[#1b7abf] text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {processing ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/>Processing...</> : <><CreditCard className="w-5 h-5"/>Pay {fmt(invoice?.total)}</>}
              </button>
            </form>
          </div>
        )}

        {selectedMethod === "zelle" && (
          <div className="space-y-4">
            <button onClick={() => setSelectedMethod(null)} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
            <div className="bg-[#6D1ED4]/10 rounded-xl p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-[#6D1ED4] flex items-center justify-center mx-auto mb-4"><Building2 className="w-8 h-8 text-white"/></div>
              <p className="text-gray-600 mb-2">Send Zelle to:</p>
              <p className="text-lg font-bold text-[#6D1ED4] mb-4">aaairrigationservice@yahoo.com</p>
              <p className="text-lg font-semibold mb-4">Amount: {fmt(invoice?.total)}</p>
              <button onClick={() => copy("aaairrigationservice@yahoo.com")} className="px-6 py-2 bg-[#6D1ED4] text-white rounded-lg">{copied?"Copied!":"Copy Email"}</button>
              <p className="text-sm text-gray-500 mt-4">Include invoice #{invoice?.invoice_number} in memo.</p>
            </div>
            <button onClick={() => handlePayment("zelle")} className="w-full py-3 bg-[#6D1ED4] text-white rounded-xl font-semibold">I've Sent the Payment</button>
          </div>
        )}

        {selectedMethod === "cash_app" && (
          <div className="space-y-4">
            <button onClick={() => setSelectedMethod(null)} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
            <div className="bg-[#00D632]/10 rounded-xl p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-[#00D632] flex items-center justify-center mx-auto mb-4"><DollarSign className="w-8 h-8 text-white"/></div>
              <p className="text-gray-600 mb-2">Send Cash App to:</p>
              <p className="text-2xl font-bold text-[#00D632] mb-4">$AAAIRRIGATIONSERVICE</p>
              <p className="text-lg font-semibold mb-4">Amount: {fmt(invoice?.total)}</p>
              <button onClick={() => copy("$AAAIRRIGATIONSERVICE")} className="px-6 py-2 bg-[#00D632] text-white rounded-lg">{copied?"Copied!":"Copy Tag"}</button>
            </div>
            <button onClick={() => handlePayment("cash_app")} className="w-full py-3 bg-[#00D632] text-white rounded-xl font-semibold">I've Sent the Payment</button>
          </div>
        )}

        <button onClick={onClose} className="w-full mt-6 py-3 text-gray-600 font-medium">Cancel</button>
      </div>
    </div>
  );
};

// ── Document Template (handles both estimates and invoices) ───────────────────
const DocumentTemplate = ({ doc, mode, onBack, onPaymentSuccess, customerId }) => {
  const [showPayment, setShowPayment] = useState(false);
  const [hasSigned, setHasSigned]     = useState(false);
  const [sigError, setSigError]       = useState("");
  const [busy, setBusy]               = useState("");
  const [result, setResult]           = useState(null);
  const canvasRef = useRef(null);
  const drawing   = useRef(false);

  const isEstimate = mode === "estimate";
  const canAct = isEstimate && doc?._erp &&
    ["Draft","Pending Approval","Sent for Approval"].includes(doc._erp.custom_approval_status);
  const approved = doc?._erp?.custom_approval_status === "Approved";
  const paid     = doc?.payment_status === "paid";

  const initCanvas = (el) => {
    if (!el) return;
    canvasRef.current = el;
    const ctx = el.getContext("2d");
    const pos = (e) => { const r = el.getBoundingClientRect(); const s = e.touches?.[0] ?? e; return { x: (s.clientX-r.left)*(el.width/r.width), y: (s.clientY-r.top)*(el.height/r.height) }; };
    el.addEventListener("mousedown",  e => { drawing.current=true; const p=pos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); });
    el.addEventListener("mousemove",  e => { if(!drawing.current)return; ctx.strokeStyle="#1b2b4b"; ctx.lineWidth=2; ctx.lineCap="round"; const p=pos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); setHasSigned(true); });
    el.addEventListener("mouseup",    () => { drawing.current=false; });
    el.addEventListener("mouseleave", () => { drawing.current=false; });
    el.addEventListener("touchstart", e => { e.preventDefault(); drawing.current=true; const p=pos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); }, {passive:false});
    el.addEventListener("touchmove",  e => { e.preventDefault(); if(!drawing.current)return; ctx.strokeStyle="#1b2b4b"; ctx.lineWidth=2; ctx.lineCap="round"; const p=pos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); setHasSigned(true); }, {passive:false});
    el.addEventListener("touchend",   () => { drawing.current=false; });
  };

  const clearSig = () => { canvasRef.current?.getContext("2d").clearRect(0,0,canvasRef.current.width,canvasRef.current.height); setHasSigned(false); };

  const handleApprove = async () => {
    setSigError("");
    if (!hasSigned) { setSigError("Please sign before approving."); return; }
    setBusy("approving");
    try {
      const sig = canvasRef.current.toDataURL("image/png");
      const r = await axios.post(`${API}/erp/estimate/${doc.id}/approve?customer_id=${customerId}`, { signature: sig });
      if (r.data.success) setResult({ ok: true, msg: "Estimate approved! We will be in touch shortly." });
    } catch (e) { setResult({ ok: false, msg: e.response?.data?.detail || "Something went wrong." }); }
    finally { setBusy(""); }
  };

  const handleDecline = async () => {
    setBusy("declining");
    try {
      await axios.post(`${API}/erp/estimate/${doc.id}/decline?customer_id=${customerId}`);
      setResult({ ok: true, msg: "Estimate declined." });
    } catch (e) { setResult({ ok: false, msg: "Something went wrong." }); }
    finally { setBusy(""); }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <style>{`@media print { .no-print { display: none !important; } body { background: white !important; } .print-container { box-shadow: none !important; margin: 0 !important; padding: 20px !important; } }`}</style>

      {/* Action bar */}
      <div className="no-print sticky top-0 bg-white shadow-md z-40 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-[#1b7abf] transition-colors">
            <ChevronLeft className="w-5 h-5"/><span>Back</span>
          </button>
          <div className="flex gap-3">
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              <Printer className="w-4 h-4"/>Print
            </button>
            {isEstimate && customerId && (
              <a href={`${API}/erp/estimate/${doc.id}/pdf?customer_id=${customerId}`} target="_blank" rel="noreferrer"
                 className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 no-underline" style={{color:"inherit"}}>
                <FileText className="w-4 h-4"/>PDF
              </a>
            )}
            {!isEstimate && doc?.id && (
              <a href={`${API}/field-invoices/${doc.id}/pdf`} target="_blank" rel="noreferrer"
                 className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 no-underline" style={{color:"inherit"}}>
                <FileText className="w-4 h-4"/>PDF
              </a>
            )}
            {!isEstimate && doc?.payment_status !== "paid" && (
              <button onClick={() => setShowPayment(true)} className="flex items-center gap-2 px-6 py-2 bg-[#1b7abf] text-white rounded-lg font-medium">
                <CreditCard className="w-4 h-4"/>Pay Now
              </button>
            )}
          </div>
        </div>
      </div>

      {result && (
        <div className={`no-print px-6 py-3 text-sm font-semibold flex justify-between items-center ${result.ok?"bg-green-50 text-green-800":"bg-red-50 text-red-800"}`}>
          <span>{result.msg}</span>
          {result.ok && <button onClick={onBack} className="underline font-bold">Close</button>}
        </div>
      )}

      <div className="py-8 px-4">
        <div className="print-container max-w-4xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden relative">

          {/* First page cover-up for fixed header */}
          <div className="print-first-page-cover" />

          {/* Continuation Header */}
          <div className="continuation-header">
            <span>AAA IRRIGATION SERVICE — {isEstimate ? "ESTIMATE" : "INVOICE"} #{doc.invoice_number} (Continuation)</span>
            <span>Page <span className="page-number-continuation" /></span>
          </div>

          {/* Seal watermark */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none" style={{opacity:0.35}}>
            <img src={SEAL_URL} alt="" className="object-contain" style={{width:585,height:585}}/>
          </div>

          {/* Approved / Paid stamp */}
          {(approved || paid) && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none rotate-[-15deg]">
              <div className={`border-8 rounded-lg px-8 py-4 ${paid?"border-green-600":"border-[#1b7abf]"}`} style={{opacity:0.65}}>
                <p className={`text-6xl font-black tracking-widest ${paid?"text-green-600":"text-[#1b7abf]"}`}>{paid?"PAID":"APPROVED"}</p>
              </div>
            </div>
          )}

          <div className="relative z-10 p-8">

            {/* Header */}
            <div className="flex items-start justify-between border-b-4 border-[#1b7abf] pb-6 mb-6">
              <div>
                <p className="font-bold text-[#1b7abf] text-lg">AAA IRRIGATION SERVICE, LLC.</p>
                <p className="text-gray-600">14 Monroe Ct.</p>
                <p className="text-gray-600">Allen TX 75002</p>
                <p className="text-gray-600">469-751-3567</p>
                <p className="text-[#1b7abf]">www.aaairrigationservice.com</p>
              </div>
              <div className="flex-1 flex justify-center">
                <img src={LOGO_URL} alt="AAA Irrigation Service" className="h-28 w-auto"/>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-bold text-[#1b7abf] tracking-wider">{isEstimate?"ESTIMATE":"INVOICE"}</h2>
              </div>
            </div>

            {/* Customer / doc info */}
            <div className="flex justify-between mb-8">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Bill To</p>
                <p className="text-xl font-bold text-[#1b7abf]">{doc.customer_name}</p>
                {doc.billing_address && <p className="text-gray-600 whitespace-pre-line">{doc.billing_address.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim()}</p>}
                {doc.phone && <p className="text-gray-600">{doc.phone}</p>}
                {doc.email && <p className="text-gray-600">{doc.email}</p>}
                {doc.service_address && doc.service_address !== doc.billing_address && (
                  <div className="mt-3 no-print">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Service Address</p>
                    <p className="text-gray-600 whitespace-pre-line">{doc.service_address.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim()}</p>
                  </div>
                )}
              </div>
              <div className="text-right">
                <table className="ml-auto text-sm">
                  <tbody>
                    <tr><td className="text-right text-gray-500 pr-4 pb-1">{isEstimate?"Estimate #:":"Invoice #:"}</td><td className="font-bold text-[#1b7abf]">{doc.invoice_number}</td></tr>
                    <tr><td className="text-right text-gray-500 pr-4 pb-1">Date:</td><td>{doc.date}</td></tr>
                    {doc.terms && <tr><td className="text-right text-gray-500 pr-4 pb-1">Terms:</td><td>{doc.terms}</td></tr>}
                    {doc.tech && <tr><td className="text-right text-gray-500 pr-4">Tech:</td><td>{doc.tech}</td></tr>}
                    {doc._erp?.scheduled_date && <tr><td className="text-right text-gray-500 pr-4">Scheduled:</td><td>{doc._erp.scheduled_date}</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Line items */}
            <div className="mb-8">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#1b7abf] text-white">
                    <th className="py-3 px-4 text-left font-semibold">Zone #</th>
                    <th className="py-3 px-4 text-left font-semibold">Description</th>
                    <th className="py-3 px-4 text-center font-semibold">Qty</th>
                    <th className="py-3 px-4 text-right font-semibold">Rate</th>
                    <th className="py-3 px-4 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {doc.line_items?.map((item,i) => (
                    <tr key={i} className={i%2===0?"bg-gray-50":"bg-white"}>
                      <td className="py-3 px-4 border-b border-gray-200">{item.zone}</td>
                      <td className="py-3 px-4 border-b border-gray-200">{item.description}</td>
                      <td className="py-3 px-4 border-b border-gray-200 text-center">{item.qty}</td>
                      <td className="py-3 px-4 border-b border-gray-200 text-right">{fmt(item.rate)}</td>
                      <td className="py-3 px-4 border-b border-gray-200 text-right font-medium">{fmt(item.amount)}</td>
                    </tr>
                  ))}
                  {Array.from({length:Math.max(0,5-(doc.line_items?.length||0))}).map((_,i)=>(
                    <tr key={`pad${i}`} className={(doc.line_items?.length||0)%2===i%2?"bg-gray-50":"bg-white"}>
                      {[...Array(5)].map((__,j)=><td key={j} className="py-3 px-4 border-b border-gray-200">&nbsp;</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-72">
                <div className="flex justify-between py-2 border-b border-gray-200"><span className="text-gray-600">Subtotal:</span><span className="font-medium">{fmt(doc.subtotal)}</span></div>
                {doc.tax_amount>0 && <div className="flex justify-between py-2 border-b border-gray-200"><span className="text-gray-600">Tax ({doc.tax_rate}%):</span><span className="font-medium">{fmt(doc.tax_amount)}</span></div>}
                {doc.discount>0 && <div className="flex justify-between py-2 border-b border-gray-200"><span className="text-gray-600">Discount:</span><span className="font-medium text-red-500">-{fmt(doc.discount)}</span></div>}
                <div className="flex justify-between py-3 bg-[#1b7abf] text-white px-4 rounded-lg mt-2">
                  <span className="font-bold text-lg">TOTAL:</span>
                  <span className="font-bold text-lg">{fmt(doc.total)}</span>
                </div>
              </div>
            </div>

            {/* Signature (estimates awaiting approval) */}
            {canAct && !result?.ok && (
              <div className="no-print border-t-2 border-gray-200 pt-6 mb-6">
                <p className="text-sm text-gray-500 mb-4">By signing below, you authorize AAA Irrigation Service to perform the work described above.</p>
                <div className="flex gap-8 items-end flex-wrap">
                  <div className="flex-1 min-w-[240px]">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Customer Signature</p>
                    <canvas ref={initCanvas} width={400} height={80} className="w-full border border-dashed border-gray-400 rounded-lg bg-gray-50 cursor-crosshair touch-none" style={{height:80}}/>
                    {hasSigned && <button onClick={clearSig} className="mt-1 text-xs text-gray-400 hover:text-gray-600">Clear</button>}
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Printed Name</p>
                    <div className="border-b border-gray-800 pb-1 text-sm">{doc.customer_name}</div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Date</p>
                    <div className="border-b border-gray-800 pb-1 text-sm">{new Date().toLocaleDateString()}</div>
                  </div>
                </div>
                {sigError && <p className="text-red-500 text-xs mt-2 font-semibold">{sigError}</p>}
                <div className="flex gap-3 mt-6">
                  <button onClick={handleApprove} disabled={!!busy} className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#1b7abf] text-white rounded-xl font-bold text-base hover:bg-[#155f96] transition-all disabled:opacity-60">
                    <CheckCircle className="w-5 h-5"/>{busy==="approving"?"Approving…":"Approve & Sign"}
                  </button>
                  <button onClick={handleDecline} disabled={!!busy} className="px-6 py-3 border-2 border-red-400 text-red-500 rounded-xl font-semibold hover:bg-red-50 transition-all disabled:opacity-60">
                    <XCircle className="w-5 h-5 inline mr-1"/>{busy==="declining"?"…":"Decline"}
                  </button>
                </div>
              </div>
            )}

            {/* Pay buttons (invoices) */}
            {!isEstimate && doc?.payment_status !== "paid" && (
              <div className="no-print flex justify-center gap-4 mb-8 py-4 border-t border-b border-gray-200">
                <button onClick={() => setShowPayment(true)} className="flex items-center gap-2 px-6 py-3 bg-[#1b7abf] text-white rounded-xl shadow-lg"><CreditCard className="w-5 h-5"/>Credit Card</button>
                <button onClick={() => setShowPayment(true)} className="flex items-center gap-2 px-6 py-3 bg-[#6D1ED4] text-white rounded-xl shadow-lg"><Building2 className="w-5 h-5"/>Zelle</button>
                <button onClick={() => setShowPayment(true)} className="flex items-center gap-2 px-6 py-3 bg-[#00D632] text-white rounded-xl shadow-lg"><DollarSign className="w-5 h-5"/>Cash App</button>
              </div>
            )}

            {/* Footer */}
            <div className="text-center pt-4 border-t border-gray-300 print-footer">
              <p className="text-xs text-gray-500 italic">Irrigation in Texas is regulated by the TCEQ, P.O. Box 13087, Austin, Texas 78711-3087</p>
              <p className="text-xs text-gray-400 mt-1" style={{ color: '#00cc44' }}>Powered by Boatman Systems™</p>
              <div className="print-only-page-number text-xs text-gray-400 mt-1" />
            </div>
          </div>
        </div>
      </div>

      <PaymentModal isOpen={showPayment} onClose={() => setShowPayment(false)} invoice={doc} onPaymentSuccess={() => { if (onPaymentSuccess) onPaymentSuccess(); }}/>
    </div>
  );
};

// ── Invoice Form ──────────────────────────────────────────────────────────────
const InvoiceForm = ({ onSave, onCancel, editInvoice }) => {
  const [form, setForm] = useState({
    customer_name: editInvoice?.customer_name||"", billing_address: editInvoice?.billing_address||"",
    service_address: editInvoice?.service_address||"", phone: editInvoice?.phone||"",
    email: editInvoice?.email||"", date: editInvoice?.date||new Date().toISOString().split("T")[0],
    terms: editInvoice?.terms||"Due on Receipt", tech: editInvoice?.tech||"",
    line_items: editInvoice?.line_items||Array.from({length:5},()=>({zone:"",description:"",qty:0,rate:0,amount:0})),
    tax_rate: editInvoice?.tax_rate||8.25, discount: editInvoice?.discount||0,
  });

  const totals = () => { const sub=form.line_items.reduce((s,i)=>s+(i.amount||0),0); const tax=sub*(form.tax_rate/100); return {subtotal:sub,taxAmount:tax,total:sub+tax-form.discount}; };
  const setItem = (idx,field,val) => { const items=[...form.line_items]; items[idx]={...items[idx],[field]:val}; if(field==="qty"||field==="rate") items[idx].amount=(items[idx].qty||0)*(items[idx].rate||0); setForm({...form,line_items:items}); };

  const submit = async (e) => {
    e.preventDefault();
    const {subtotal,taxAmount,total}=totals();
    try {
      if(editInvoice) await axios.put(`${API}/invoices/${editInvoice.id}`,{...form,subtotal,tax_amount:taxAmount,total});
      else await axios.post(`${API}/invoices`,{...form,subtotal,tax_amount:taxAmount,total});
      onSave();
    } catch(err){console.error(err);}
  };

  const {subtotal,taxAmount,total}=totals();

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-[#1b7abf]">{editInvoice?"Edit Invoice":"New Invoice"}</h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">Cancel</button>
        </div>
        <form onSubmit={submit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-[#1b7abf] border-b pb-2">Customer</h3>
              <input type="text" placeholder="Customer Name *" value={form.customer_name} onChange={e=>setForm({...form,customer_name:e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg" required/>
              <textarea placeholder="Billing Address" value={form.billing_address} onChange={e=>setForm({...form,billing_address:e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg" rows={2}/>
              <textarea placeholder="Service Address" value={form.service_address} onChange={e=>setForm({...form,service_address:e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg" rows={2}/>
              <input type="tel" placeholder="Phone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg"/>
              <input type="email" placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg"/>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-[#1b7abf] border-b pb-2">Details</h3>
              <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg"/>
              <input type="text" placeholder="Terms" value={form.terms} onChange={e=>setForm({...form,terms:e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg"/>
              <input type="text" placeholder="Technician" value={form.tech} onChange={e=>setForm({...form,tech:e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg"/>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-[#1b7abf] border-b pb-2 mb-4">Line Items</h3>
            <table className="w-full">
              <thead><tr className="bg-[#1b7abf] text-white"><th className="py-2 px-3 text-left text-sm">Zone #</th><th className="py-2 px-3 text-left text-sm">Description</th><th className="py-2 px-3 text-center text-sm w-20">Qty</th><th className="py-2 px-3 text-right text-sm w-24">Rate</th><th className="py-2 px-3 text-right text-sm w-24">Amount</th></tr></thead>
              <tbody>
                {form.line_items.map((item,i)=>(
                  <tr key={i} className="border-b">
                    <td className="py-2 px-1"><input type="text" value={item.zone} onChange={e=>setItem(i,"zone",e.target.value)} className="w-full px-2 py-2 border border-gray-200 rounded"/></td>
                    <td className="py-2 px-1"><input type="text" value={item.description} onChange={e=>setItem(i,"description",e.target.value)} className="w-full px-2 py-2 border border-gray-200 rounded"/></td>
                    <td className="py-2 px-1"><input type="number" value={item.qty||""} onChange={e=>setItem(i,"qty",parseFloat(e.target.value)||0)} className="w-full px-2 py-2 border border-gray-200 rounded text-center"/></td>
                    <td className="py-2 px-1"><input type="number" step="0.01" value={item.rate||""} onChange={e=>setItem(i,"rate",parseFloat(e.target.value)||0)} className="w-full px-2 py-2 border border-gray-200 rounded text-right"/></td>
                    <td className="py-2 px-3 text-right font-medium text-[#1b7abf]">{fmt(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" onClick={()=>setForm({...form,line_items:[...form.line_items,{zone:"",description:"",qty:0,rate:0,amount:0}]})} className="mt-3 flex items-center gap-1 text-sm text-[#1b7abf] hover:underline"><Plus className="w-4 h-4"/>Add Row</button>
          </div>
          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between py-2"><span className="text-gray-600">Subtotal:</span><span>{fmt(subtotal)}</span></div>
              <div className="flex justify-between py-2 items-center"><span className="text-gray-600">Tax (%):</span><input type="number" step="0.01" value={form.tax_rate} onChange={e=>setForm({...form,tax_rate:parseFloat(e.target.value)||0})} className="w-20 px-2 py-1 border border-gray-200 rounded text-right"/></div>
              <div className="flex justify-between py-2"><span className="text-gray-600">Tax Amount:</span><span>{fmt(taxAmount)}</span></div>
              <div className="flex justify-between py-2 items-center"><span className="text-gray-600">Discount:</span><input type="number" step="0.01" value={form.discount} onChange={e=>setForm({...form,discount:parseFloat(e.target.value)||0})} className="w-20 px-2 py-1 border border-gray-200 rounded text-right"/></div>
              <div className="flex justify-between py-3 bg-[#1b7abf] text-white px-4 rounded-lg"><span className="font-bold">TOTAL:</span><span className="font-bold">{fmt(total)}</span></div>
            </div>
          </div>
          <div className="flex justify-end gap-4 pt-4 border-t">
            <button type="button" onClick={onCancel} className="px-6 py-3 text-gray-600 hover:text-gray-900">Cancel</button>
            <button type="submit" className="px-8 py-3 bg-[#1b7abf] text-white rounded-lg font-medium shadow-lg">{editInvoice?"Update":"Create Invoice"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Invoice List ──────────────────────────────────────────────────────────────
const InvoiceList = ({ onCreateNew, onViewInvoice }) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => { try { const r=await axios.get(`${API}/invoices`); setInvoices(r.data); } catch(e){console.error(e);} finally{setLoading(false);} };
  useEffect(()=>{load();},[]);

  const del = async (id) => { if(!window.confirm("Delete?"))return; try{await axios.delete(`${API}/invoices/${id}`);load();}catch(e){console.error(e);} };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-[#1b7abf] text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={LOGO_URL} alt="AAA Irrigation Service" className="h-14 w-auto"/>
            <div><h1 className="text-xl font-bold">AAA IRRIGATION SERVICE, LLC</h1><p className="text-sm text-blue-200">Invoice Management</p></div>
          </div>
          <button onClick={onCreateNew} className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#1b7abf] rounded-lg font-medium shadow-lg"><Plus className="w-5 h-5"/>New Invoice</button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-[#1b7abf] mb-6">Recent Invoices</h2>
        {loading ? <div className="text-center py-12"><div className="w-8 h-8 border-4 border-[#1b7abf] border-t-transparent rounded-full animate-spin mx-auto"/></div>
          : invoices.length===0 ? (
            <div className="text-center py-16 bg-white rounded-xl shadow">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4"/><p className="text-gray-500 text-lg">No invoices yet</p>
              <button onClick={onCreateNew} className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-[#1b7abf] text-white rounded-lg font-medium"><Plus className="w-5 h-5"/>Create Invoice</button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b"><th className="py-4 px-6 text-left text-sm font-semibold text-gray-600">Invoice #</th><th className="py-4 px-6 text-left text-sm font-semibold text-gray-600">Customer</th><th className="py-4 px-6 text-left text-sm font-semibold text-gray-600">Date</th><th className="py-4 px-6 text-right text-sm font-semibold text-gray-600">Total</th><th className="py-4 px-6 text-center text-sm font-semibold text-gray-600">Status</th><th className="py-4 px-6 text-center text-sm font-semibold text-gray-600">Actions</th></tr></thead>
                <tbody>
                  {invoices.map(inv=>(
                    <tr key={inv.id} className="border-b hover:bg-gray-50">
                      <td className="py-4 px-6 font-medium text-[#1b7abf]">{inv.invoice_number}</td>
                      <td className="py-4 px-6">{inv.customer_name}</td>
                      <td className="py-4 px-6 text-gray-500">{inv.date}</td>
                      <td className="py-4 px-6 text-right font-semibold">{fmt(inv.total)}</td>
                      <td className="py-4 px-6 text-center"><span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${inv.payment_status==="paid"?"bg-green-100 text-green-700":"bg-yellow-100 text-yellow-700"}`}>{inv.payment_status==="paid"?"Paid":"Pending"}</span></td>
                      <td className="py-4 px-6"><div className="flex items-center justify-center gap-2">
                        <button onClick={()=>onViewInvoice(inv)} className="px-3 py-1.5 text-sm bg-[#1b7abf] text-white rounded-lg">View</button>
                        <button onClick={()=>del(inv.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </main>
      <footer className="py-6 text-center text-sm text-gray-500"><p>Irrigation in Texas is regulated by the TCEQ, P.O. Box 13087, Austin, Texas 78711-3087</p></footer>
    </div>
  );
};

// ── App Root ──────────────────────────────────────────────────────────────────
function App() {
  const [view, setView]         = useState("list");
  const [selected, setSelected] = useState(null);
  const [erpDoc, setErpDoc]     = useState(null);
  const [erpMode, setErpMode]   = useState(null);
  const [erpCustomer, setErpCustomer] = useState(null);
  const [erpLoading, setErpLoading]   = useState(false);
  const [erpError, setErpError]       = useState("");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const mode = p.get("mode"), id = p.get("id"), cust = p.get("customer");
    if ((mode === "estimate" || mode === "invoice") && id && cust) {
      setErpMode(mode); setErpCustomer(cust); setErpLoading(true);
      const url = mode === "estimate"
        ? `${API}/erp/estimate/${id}?customer_id=${cust}`
        : `${API}/erp/invoice/${id}?customer_id=${cust}`;
      axios.get(url)
        .then(r => { setErpDoc(r.data); setView("erp"); })
        .catch(() => setErpError("Could not load document. Please try again."))
        .finally(() => setErpLoading(false));
    }
  }, []);

  if (erpLoading) return <div className="flex items-center justify-center min-h-screen"><div className="w-10 h-10 border-4 border-[#1b7abf] border-t-transparent rounded-full animate-spin"/></div>;
  if (erpError)   return <div className="flex items-center justify-center min-h-screen text-red-500 text-lg">{erpError}</div>;

  if (view === "erp" && erpDoc) {
    return <DocumentTemplate doc={erpDoc} mode={erpMode} customerId={erpCustomer} onBack={() => window.history.back()} onPaymentSuccess={() => {}}/>;
  }

  return (
    <div className="App">
      {view === "list" && <InvoiceList onCreateNew={()=>setView("form")} onViewInvoice={inv=>{setSelected(inv);setView("invoice");}}/>}
      {view === "form" && <InvoiceForm onSave={()=>setView("list")} onCancel={()=>setView("list")} editInvoice={null}/>}
      {view === "invoice" && selected && (
        <DocumentTemplate doc={selected} mode="invoice" onBack={()=>setView("list")}
          onPaymentSuccess={async()=>{const r=await axios.get(`${API}/invoices/${selected.id}`);setSelected(r.data);}}/>
      )}
    </div>
  );
}

export default App;
