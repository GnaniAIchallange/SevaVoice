import { useState, useEffect } from 'react';
import {
  Shield,
  CreditCard,
  QrCode,
  Building2,
  Smartphone,
  Lock,
  X,
  CheckCircle2,
  Loader2,
  ArrowRight,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

export default function RazorpayGatewayModal({
  orderData,
  request,
  donorName,
  donorEmail,
  donorPhone,
  onPaymentSuccess,
  onPaymentFailure,
  onClose,
}) {
  const [activeMethod, setActiveMethod] = useState('upi'); // 'upi' | 'card' | 'netbanking'
  const [upiSubMethod, setUpiSubMethod] = useState('qr'); // 'qr' | 'apps' | 'id'
  const [upiId, setUpiId] = useState('');
  const [selectedUpiApp, setSelectedUpiApp] = useState('gpay');

  // Card state
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState(donorName || '');

  // Netbanking state
  const [selectedBank, setSelectedBank] = useState('HDFC');

  // Processing state
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authStep, setAuthStep] = useState(''); // 'connecting' | 'verifying' | 'done'
  const [errorMsg, setErrorMsg] = useState('');

  const amountInRupees = orderData?.amount ? orderData.amount / 100 : 1000;

  function handleFormatCard(val) {
    const cleaned = val.replace(/\D/g, '').slice(0, 16);
    const parts = [];
    for (let i = 0; i < cleaned.length; i += 4) {
      parts.push(cleaned.slice(i, i + 4));
    }
    setCardNumber(parts.join(' '));
  }

  function handleFormatExpiry(val) {
    const cleaned = val.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 3) {
      setCardExpiry(`${cleaned.slice(0, 2)}/${cleaned.slice(2)}`);
    } else {
      setCardExpiry(cleaned);
    }
  }

  function fillTestCard() {
    setCardNumber('4111 2222 3333 4444');
    setCardExpiry('12/28');
    setCardCvv('789');
    setCardHolder(donorName || 'Test Cardholder');
  }

  async function handleExecutePayment(methodUsed) {
    setIsAuthorizing(true);
    setErrorMsg('');
    setAuthStep('Connecting to Razorpay secure servers...');

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setAuthStep('Authorizing payment with banking partner...');
      await new Promise((resolve) => setTimeout(resolve, 900));
      setAuthStep('Verifying transaction token and signature...');
      await new Promise((resolve) => setTimeout(resolve, 500));

      const generatedPaymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const generatedSignature = 'simulated_success_sig';

      await onPaymentSuccess({
        razorpay_order_id: orderData.orderId,
        razorpay_payment_id: generatedPaymentId,
        razorpay_signature: generatedSignature,
        donationId: orderData.donationId,
        amount: amountInRupees,
        paymentMethod: methodUsed || activeMethod,
      });
    } catch (err) {
      console.error('Payment authorization failed:', err);
      setErrorMsg(err.message || 'Payment processing failed');
      setIsAuthorizing(false);
      if (onPaymentFailure) onPaymentFailure(err);
    }
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '680px',
          padding: 0,
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(12, 35, 64, 0.45)',
          background: '#ffffff',
        }}
      >
        {/* Razorpay Authentic Blue Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0c2340 0%, #173860 100%)',
            color: '#ffffff',
            padding: '18px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              }}
            >
              {/* Razorpay Official Icon Representation */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M14.5 2L5 15H11.5L9.5 22L19 9H12.5L14.5 2Z" fill="#0c2340" />
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '0.02em' }}>Razorpay</span>
                <span
                  style={{
                    background: 'rgba(255,255,255,0.18)',
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                >
                  Test Gateway
                </span>
              </div>
              <div style={{ fontSize: '12.5px', color: '#94a3b8' }}>
                SevaVoice Direct Farmer Assistance • Order #{orderData.orderId?.slice(-8) || 'SV1001'}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Amount to Pay</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#38bdf8' }}>
              ₹{Number(amountInRupees).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {isAuthorizing ? (
          /* Processing Screen */
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div
              style={{
                width: '72px',
                height: '72px',
                margin: '0 auto 20px',
                borderRadius: '50%',
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0284c7',
              }}
            >
              <Loader2 size={40} className="spinner" />
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#0c2340', fontFamily: 'Georgia, serif' }}>
              Razorpay Payment in Progress
            </h3>
            <p style={{ color: '#0284c7', fontWeight: 600, fontSize: '14px', margin: '0 0 8px 0' }}>
              {authStep}
            </p>
            <p style={{ color: '#64748b', fontSize: '12.5px', margin: 0 }}>
              Please do not refresh this window or hit back. Communicating with banking gateway.
            </p>
          </div>
        ) : (
          /* Main Payment Gateway Interface */
          <div>
            {/* Beneficiary Pill */}
            <div
              style={{
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                padding: '10px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12.5px',
                color: '#475569',
              }}
            >
              <span>
                Supporting: <strong>{request?.title || 'Agricultural Assistance'}</strong>
              </span>
              <span>
                Farmer: <strong>{request?.farmer?.name || 'Verified Beneficiary'}</strong>
              </span>
            </div>

            {/* Error banner if any */}
            {errorMsg && (
              <div
                style={{
                  background: '#fef2f2',
                  borderBottom: '1px solid #fecaca',
                  padding: '10px 24px',
                  color: '#dc2626',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Payment Methods Layout */}
            <div style={{ display: 'flex', minHeight: '360px' }}>
              {/* Left Method Tabs */}
              <div
                style={{
                  width: '200px',
                  borderRight: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveMethod('upi')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '16px',
                    background: activeMethod === 'upi' ? '#ffffff' : 'transparent',
                    border: 'none',
                    borderLeft: activeMethod === 'upi' ? '4px solid #0c2340' : '4px solid transparent',
                    fontWeight: activeMethod === 'upi' ? 700 : 500,
                    color: activeMethod === 'upi' ? '#0c2340' : '#475569',
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <Smartphone size={18} color={activeMethod === 'upi' ? '#0c2340' : '#64748b'} />
                  <div>
                    <div>UPI / QR</div>
                    <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 500 }}>Fast & Instant</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMethod('card')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '16px',
                    background: activeMethod === 'card' ? '#ffffff' : 'transparent',
                    border: 'none',
                    borderLeft: activeMethod === 'card' ? '4px solid #0c2340' : '4px solid transparent',
                    fontWeight: activeMethod === 'card' ? 700 : 500,
                    color: activeMethod === 'card' ? '#0c2340' : '#475569',
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <CreditCard size={18} color={activeMethod === 'card' ? '#0c2340' : '#64748b'} />
                  <div>
                    <div>Cards</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Visa, Master, RuPay</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMethod('netbanking')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '16px',
                    background: activeMethod === 'netbanking' ? '#ffffff' : 'transparent',
                    border: 'none',
                    borderLeft: activeMethod === 'netbanking' ? '4px solid #0c2340' : '4px solid transparent',
                    fontWeight: activeMethod === 'netbanking' ? 700 : 500,
                    color: activeMethod === 'netbanking' ? '#0c2340' : '#475569',
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <Building2 size={18} color={activeMethod === 'netbanking' ? '#0c2340' : '#64748b'} />
                  <div>
                    <div>Net Banking</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>All Indian Banks</div>
                  </div>
                </button>
              </div>

              {/* Right Method Content Pane */}
              <div style={{ flex: 1, padding: '20px 24px' }}>
                {/* 1. UPI TAB */}
                {activeMethod === 'upi' && (
                  <div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                      <button
                        type="button"
                        onClick={() => setUpiSubMethod('qr')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 600,
                          background: upiSubMethod === 'qr' ? '#0c2340' : '#f1f5f9',
                          color: upiSubMethod === 'qr' ? '#ffffff' : '#475569',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        UPI QR Code
                      </button>
                      <button
                        type="button"
                        onClick={() => setUpiSubMethod('apps')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 600,
                          background: upiSubMethod === 'apps' ? '#0c2340' : '#f1f5f9',
                          color: upiSubMethod === 'apps' ? '#ffffff' : '#475569',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        UPI Apps
                      </button>
                      <button
                        type="button"
                        onClick={() => setUpiSubMethod('id')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 600,
                          background: upiSubMethod === 'id' ? '#0c2340' : '#f1f5f9',
                          color: upiSubMethod === 'id' ? '#ffffff' : '#475569',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Enter UPI ID
                      </button>
                    </div>

                    {upiSubMethod === 'qr' && (
                      <div style={{ textAlign: 'center', padding: '10px 0' }}>
                        <div
                          style={{
                            display: 'inline-block',
                            background: '#ffffff',
                            padding: '12px',
                            borderRadius: '12px',
                            border: '2px solid #e2e8f0',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                          }}
                        >
                          {/* SVG QR Code Simulation with Indian Rupee symbol */}
                          <svg width="150" height="150" viewBox="0 0 150 150">
                            <rect width="150" height="150" fill="#ffffff" />
                            {/* Corner squares */}
                            <rect x="10" y="10" width="36" height="36" fill="#0c2340" />
                            <rect x="16" y="16" width="24" height="24" fill="#ffffff" />
                            <rect x="22" y="22" width="12" height="12" fill="#0c2340" />

                            <rect x="104" y="10" width="36" height="36" fill="#0c2340" />
                            <rect x="110" y="16" width="24" height="24" fill="#ffffff" />
                            <rect x="116" y="22" width="12" height="12" fill="#0c2340" />

                            <rect x="10" y="104" width="36" height="36" fill="#0c2340" />
                            <rect x="16" y="110" width="24" height="24" fill="#ffffff" />
                            <rect x="22" y="116" width="12" height="12" fill="#0c2340" />

                            {/* Data grid patterns */}
                            <rect x="56" y="16" width="8" height="8" fill="#0c2340" />
                            <rect x="72" y="16" width="8" height="8" fill="#0c2340" />
                            <rect x="88" y="16" width="8" height="8" fill="#0c2340" />
                            <rect x="56" y="32" width="16" height="8" fill="#0c2340" />
                            <rect x="80" y="32" width="8" height="16" fill="#0c2340" />

                            {/* Center Logo */}
                            <circle cx="75" cy="75" r="18" fill="#0c2340" />
                            <text x="75" y="81" fill="#38bdf8" fontSize="18" fontWeight="bold" textAnchor="middle">₹</text>

                            {/* Bottom patterns */}
                            <rect x="56" y="104" width="12" height="12" fill="#0c2340" />
                            <rect x="80" y="116" width="16" height="8" fill="#0c2340" />
                            <rect x="110" y="70" width="24" height="8" fill="#0c2340" />
                            <rect x="104" y="100" width="12" height="20" fill="#0c2340" />
                          </svg>
                        </div>
                        <p style={{ margin: '10px 0 4px 0', fontSize: '13px', fontWeight: 600, color: '#0c2340' }}>
                          Scan QR Code with Google Pay, PhonePe, Paytm, or BHIM
                        </p>
                        <p style={{ margin: '0 0 16px 0', fontSize: '11.5px', color: '#64748b' }}>
                          Real-time QR code linked directly to SevaVoice trust escrow
                        </p>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => handleExecutePayment('upi_qr')}
                          style={{
                            background: '#0c2340',
                            width: '100%',
                            padding: '11px',
                            borderRadius: '8px',
                            fontWeight: 700,
                          }}
                        >
                          Simulate UPI QR Scan & Pay ₹{Number(amountInRupees).toLocaleString()}
                        </button>
                      </div>
                    )}

                    {upiSubMethod === 'apps' && (
                      <div>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px 0' }}>
                          Choose your preferred UPI application:
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
                          {[
                            { id: 'gpay', name: 'Google Pay', icon: '🟢', sub: 'Instant bank transfer' },
                            { id: 'phonepe', name: 'PhonePe', icon: '🟣', sub: 'UPI Linked Account' },
                            { id: 'paytm', name: 'Paytm UPI', icon: '🔵', sub: 'Wallet & UPI' },
                            { id: 'cred', name: 'CRED UPI', icon: '⚪', sub: 'Direct bank debit' },
                          ].map((app) => (
                            <label
                              key={app.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px',
                                border: selectedUpiApp === app.id ? '2px solid #0c2340' : '1px solid #e2e8f0',
                                borderRadius: '10px',
                                background: selectedUpiApp === app.id ? '#f0fdf4' : '#ffffff',
                                cursor: 'pointer',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input
                                  type="radio"
                                  name="upiApp"
                                  checked={selectedUpiApp === app.id}
                                  onChange={() => setSelectedUpiApp(app.id)}
                                />
                                <div>
                                  <strong style={{ fontSize: '13.5px', color: '#0c2340' }}>{app.name}</strong>
                                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>{app.sub}</div>
                                </div>
                              </div>
                              <span style={{ fontSize: '18px' }}>{app.icon}</span>
                            </label>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => handleExecutePayment(`upi_${selectedUpiApp}`)}
                          style={{
                            background: '#0c2340',
                            width: '100%',
                            padding: '11px',
                            borderRadius: '8px',
                            fontWeight: 700,
                          }}
                        >
                          Authorize via {selectedUpiApp.toUpperCase()} (₹{Number(amountInRupees).toLocaleString()})
                        </button>
                      </div>
                    )}

                    {upiSubMethod === 'id' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                          Virtual Payment Address (VPA / UPI ID)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. yourname@oksbi or 9876543210@paytm"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            fontSize: '13.5px',
                            boxSizing: 'border-box',
                            marginBottom: '16px',
                          }}
                        />
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => handleExecutePayment('upi_vpa')}
                          style={{
                            background: '#0c2340',
                            width: '100%',
                            padding: '11px',
                            borderRadius: '8px',
                            fontWeight: 700,
                          }}
                        >
                          Verify and Pay ₹{Number(amountInRupees).toLocaleString()}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. CARD TAB */}
                {activeMethod === 'card' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>Card Details</span>
                      <button
                        type="button"
                        onClick={fillTestCard}
                        style={{
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Auto-Fill Test Visa Card
                      </button>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#475569', marginBottom: '4px' }}>
                        Card Number
                      </label>
                      <input
                        type="text"
                        placeholder="4532 •••• •••• ••••"
                        value={cardNumber}
                        onChange={(e) => handleFormatCard(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          fontSize: '14px',
                          letterSpacing: '0.05em',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#475569', marginBottom: '4px' }}>
                          Expiry (MM/YY)
                        </label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={(e) => handleFormatExpiry(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            fontSize: '13.5px',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#475569', marginBottom: '4px' }}>
                          CVV
                        </label>
                        <input
                          type="password"
                          placeholder="•••"
                          maxLength="4"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            fontSize: '13.5px',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '18px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#475569', marginBottom: '4px' }}>
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        placeholder="Name as on card"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          fontSize: '13.5px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleExecutePayment('card')}
                      style={{
                        background: '#0c2340',
                        width: '100%',
                        padding: '11px',
                        borderRadius: '8px',
                        fontWeight: 700,
                      }}
                    >
                      Pay ₹{Number(amountInRupees).toLocaleString()}
                    </button>
                  </div>
                )}

                {/* 3. NETBANKING TAB */}
                {activeMethod === 'netbanking' && (
                  <div>
                    <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '12px' }}>
                      Select your bank:
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                      {[
                        { code: 'HDFC', name: 'HDFC Bank' },
                        { code: 'SBI', name: 'State Bank of India' },
                        { code: 'ICICI', name: 'ICICI Bank' },
                        { code: 'AXIS', name: 'Axis Bank' },
                        { code: 'KOTAK', name: 'Kotak Bank' },
                        { code: 'PNB', name: 'Punjab National' },
                      ].map((bank) => (
                        <button
                          key={bank.code}
                          type="button"
                          onClick={() => setSelectedBank(bank.code)}
                          style={{
                            padding: '12px 10px',
                            border: selectedBank === bank.code ? '2px solid #0c2340' : '1px solid #e2e8f0',
                            borderRadius: '8px',
                            background: selectedBank === bank.code ? '#f0fdf4' : '#ffffff',
                            fontWeight: selectedBank === bank.code ? 700 : 500,
                            color: '#0c2340',
                            fontSize: '13px',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          {bank.name}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleExecutePayment(`netbanking_${selectedBank}`)}
                      style={{
                        background: '#0c2340',
                        width: '100%',
                        padding: '11px',
                        borderRadius: '8px',
                        fontWeight: 700,
                      }}
                    >
                      Proceed to {selectedBank} NetBanking (₹{Number(amountInRupees).toLocaleString()})
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Trust Shield */}
            <div
              style={{
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                padding: '12px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                color: '#64748b',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={13} color="#16a34a" />
                <span>256-bit SSL Encrypted • PCI-DSS Level 1 Compliant</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel & Exit Gateway
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
