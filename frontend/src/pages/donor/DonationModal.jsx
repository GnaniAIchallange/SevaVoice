import { useState, useEffect } from 'react';
import {
  HeartHandshake,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  ShieldCheck,
  User,
  Mail,
  Phone,
  Sparkles,
  Loader2,
  FileCheck,
} from 'lucide-react';
import { API_URL, getAuthHeaders } from '../../lib/apiConfig.js';
import RazorpayGatewayModal from './RazorpayGatewayModal.jsx';

export default function DonationModal({ request, user, onClose, onSuccess }) {
  const [pledgeAmount, setPledgeAmount] = useState('1000');
  const [donorName, setDonorName] = useState(user?.name || '');
  const [donorEmail, setDonorEmail] = useState(user?.email || '');
  const [donorPhone, setDonorPhone] = useState(user?.phone || '');
  const [notes, setNotes] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [inputError, setInputError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [showGatewayModal, setShowGatewayModal] = useState(false);

  useEffect(() => {
    // Pre-load Razorpay checkout script
    if (typeof window !== 'undefined' && !window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  if (!request) return null;

  const remainingGoal = Math.max(0, (request.amountRequested || 0) - (request.amountFunded || 0));

  function handleAmountChange(e) {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setPledgeAmount(val);
    if (!val || parseInt(val, 10) <= 0) {
      setInputError('Please enter a valid donation amount (minimum ₹1).');
    } else {
      setInputError('');
    }
  }

  async function verifyPaymentOnBackend(payload) {
    const res = await fetch(`${API_URL}/api/donor/verify-payment`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Payment verification failed');
    }

    setPaymentSuccess({
      amount: payload.amount || pledgeAmount,
      paymentId: payload.razorpay_payment_id,
      orderId: payload.razorpay_order_id,
      date: new Date().toISOString(),
      farmerName: request.farmer?.name || 'Verified Farmer',
      requestTitle: request.title || 'Agricultural Assistance',
    });

    if (onSuccess) {
      onSuccess(data.donation);
    }
  }

  async function handleInitiatePayment(e) {
    if (e) e.preventDefault();
    const amountNum = parseInt(pledgeAmount, 10);
    if (!amountNum || amountNum < 1) {
      setInputError('Please enter a valid donation amount (minimum ₹1).');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      // 1. Create order on backend
      const res = await fetch(`${API_URL}/api/donor/create-order`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          requestId: request.id || request._id,
          amount: amountNum,
          notes,
          isAnonymous,
          donorName: isAnonymous ? 'Anonymous' : donorName,
          donorEmail: isAnonymous ? '' : donorEmail,
          donorPhone: isAnonymous ? '' : donorPhone,
        }),
      });

      const orderData = await res.json();
      if (!res.ok) {
        throw new Error(orderData.message || 'Failed to initialize donation payment');
      }

      setActiveOrder(orderData);

      // 2. Launch official Razorpay Checkout popup if configured with live/test key
      if (typeof window !== 'undefined' && window.Razorpay && orderData.keyId && !orderData.isSimulated) {
        try {
          const options = {
            key: orderData.keyId,
            amount: orderData.amount, // in paise
            currency: orderData.currency || 'INR',
            name: 'SevaVoice',
            description: `Farmer Assistance: ${request.title || 'Direct Contribution'}`,
            image: '/favicon.svg',
            order_id: orderData.orderId,
            handler: async function (response) {
              try {
                setIsProcessing(true);
                await verifyPaymentOnBackend({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  donationId: orderData.donationId,
                  amount: amountNum,
                });
              } catch (err) {
                setErrorMessage(err.message || 'Payment verification failed');
              } finally {
                setIsProcessing(false);
              }
            },
            prefill: {
              name: donorName || '',
              email: donorEmail || '',
              contact: donorPhone || '',
            },
            notes: {
              requestId: String(request.id || request._id),
            },
            theme: {
              color: '#153f32',
            },
            modal: {
              ondismiss: function () {
                setIsProcessing(false);
              },
            },
          };

          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', function (resp) {
            setErrorMessage(resp.error?.description || 'Transaction was declined or cancelled.');
            setIsProcessing(false);
          });
          rzp.open();
          setIsProcessing(false);
          return;
        } catch (sdkErr) {
          console.warn('Razorpay SDK error, falling back to gateway interface:', sdkErr);
        }
      }

      // If Razorpay test keys are not yet entered or in local simulation, open gateway modal
      setShowGatewayModal(true);
      setIsProcessing(false);
    } catch (err) {
      console.error('Donation flow error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred while processing payment.');
      setIsProcessing(false);
    }
  }

  async function handleGatewaySuccess(payload) {
    setShowGatewayModal(false);
    setIsProcessing(true);
    setErrorMessage('');
    try {
      await verifyPaymentOnBackend({
        razorpay_order_id: payload.razorpay_order_id,
        razorpay_payment_id: payload.razorpay_payment_id,
        razorpay_signature: payload.razorpay_signature,
        donationId: payload.donationId,
        amount: payload.amount,
      });
    } catch (err) {
      setErrorMessage(err.message || 'Payment verification failed');
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content" style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HeartHandshake size={22} color="#1d684b" />
              Contribute with Razorpay
            </h2>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              100% Direct Support for Verified Farmers
            </span>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {paymentSuccess ? (
            /* Success Receipt View */
            <div style={{ textAlign: 'center', padding: '16px 8px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#dcfce7',
                  color: '#15803d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <CheckCircle2 size={36} />
              </div>
              <h3 style={{ fontSize: '22px', color: '#153f32', margin: '0 0 6px 0', fontFamily: 'Georgia, serif' }}>
                Payment Received!
              </h3>
              <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 20px 0' }}>
                Your generous contribution has been securely transferred to empower this verified farmer.
              </p>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px',
                  textAlign: 'left',
                  fontSize: '13.5px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #e2e8f0' }}>
                  <span style={{ color: '#64748b' }}>Amount Contributed</span>
                  <strong style={{ color: '#153f32', fontSize: '16px' }}>₹{Number(paymentSuccess.amount).toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #e2e8f0' }}>
                  <span style={{ color: '#64748b' }}>Beneficiary Farmer</span>
                  <strong>{paymentSuccess.farmerName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #e2e8f0' }}>
                  <span style={{ color: '#64748b' }}>Request Title</span>
                  <span style={{ maxWidth: '240px', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {paymentSuccess.requestTitle}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #e2e8f0' }}>
                  <span style={{ color: '#64748b' }}>Razorpay Payment ID</span>
                  <code style={{ fontSize: '12px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                    {paymentSuccess.paymentId}
                  </code>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span style={{ color: '#64748b' }}>Date & Time</span>
                  <span>{new Date(paymentSuccess.date).toLocaleString()}</span>
                </div>
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={onClose}
                style={{ width: '100%', padding: '12px' }}
              >
                Done / Back to Dashboard
              </button>
            </div>
          ) : (
            /* Payment Input View */
            <form onSubmit={handleInitiatePayment}>
              {/* Target Request Info Box */}
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  marginBottom: '18px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#153f32', fontFamily: 'Georgia, serif' }}>
                      {request.title || 'Agricultural Assistance Request'}
                    </h4>
                    <p style={{ margin: 0, fontSize: '13px', color: '#166534' }}>
                      Farmer: <strong>{request.farmer?.name || 'Verified Farmer'}</strong>
                      {request.farmer?.district ? ` (${request.farmer.district}, ${request.farmer.state})` : ''}
                    </p>
                  </div>
                  <span
                    style={{
                      background: '#dcfce7',
                      color: '#15803d',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <ShieldCheck size={13} /> Verified
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '12.5px', color: '#475569' }}>
                  <span>Requested: <strong>₹{Number(request.amountRequested || 0).toLocaleString()}</strong></span>
                  <span>Remaining: <strong style={{ color: '#15803d' }}>₹{Number(remainingGoal).toLocaleString()}</strong></span>
                </div>
              </div>

              {/* Amount Selection */}
              <div style={{ marginBottom: '18px', textAlign: 'center' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                  Contribution Amount (INR)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 700, color: '#153f32' }}>₹</span>
                  <input
                    type="text"
                    className="donation-amount-input"
                    value={pledgeAmount}
                    onChange={handleAmountChange}
                    placeholder="1000"
                    disabled={isProcessing}
                    autoFocus
                  />
                </div>
                {inputError && (
                  <p style={{ color: '#dc2626', fontSize: '12px', margin: '4px 0 0 0' }}>
                    {inputError}
                  </p>
                )}

                {/* Preset amount pills */}
                <div className="preset-buttons-row">
                  {['500', '1000', '2500', '5000', '10000'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`btn-secondary preset-btn ${pledgeAmount === preset ? 'active-preset' : ''}`}
                      onClick={() => {
                        setPledgeAmount(preset);
                        setInputError('');
                      }}
                      disabled={isProcessing}
                      style={{
                        background: pledgeAmount === preset ? '#153f32' : '',
                        color: pledgeAmount === preset ? '#ffffff' : '',
                      }}
                    >
                      ₹{Number(preset).toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Donor Contact & Details (Prefilled or editable) */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '10px' }}>
                  Donor Information (Optional)
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Your Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      placeholder="e.g. Ramesh Kulkarni"
                      disabled={isProcessing || isAnonymous}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Phone Number</label>
                    <input
                      type="text"
                      className="form-input"
                      value={donorPhone}
                      onChange={(e) => setDonorPhone(e.target.value)}
                      placeholder="10-digit mobile"
                      disabled={isProcessing || isAnonymous}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Email Address (for receipt)</label>
                  <input
                    type="email"
                    className="form-input"
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                    placeholder="donor@example.com"
                    disabled={isProcessing || isAnonymous}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Words of Support / Message</label>
                  <input
                    type="text"
                    className="form-input"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Wishing you a prosperous harvest season!"
                    disabled={isProcessing}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    disabled={isProcessing}
                  />
                  <span>Contribute anonymously (hide my identity publicly)</span>
                </label>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', color: '#dc2626', fontSize: '13px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Razorpay Trust Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  color: '#475569',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '8px',
                  marginBottom: '18px',
                }}
              >
                <ShieldCheck size={16} color="#0284c7" />
                <span>Secured by <strong>Razorpay</strong> Payment Gateway (UPI, Cards, NetBanking, Wallets)</span>
              </div>

              {/* Modal Footer Actions */}
              <div className="modal-footer" style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onClose}
                  disabled={isProcessing}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isProcessing || !pledgeAmount || parseInt(pledgeAmount, 10) <= 0}
                  style={{
                    flex: 2,
                    background: '#153f32',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 18px',
                  }}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={18} className="spinner" />
                      <span>Connecting to Razorpay...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={18} />
                      <span>Proceed to Pay ₹{Number(pledgeAmount || 0).toLocaleString()}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {showGatewayModal && activeOrder && (
        <RazorpayGatewayModal
          orderData={activeOrder}
          request={request}
          donorName={isAnonymous ? 'Anonymous Donor' : donorName}
          donorEmail={donorEmail}
          donorPhone={donorPhone}
          onPaymentSuccess={handleGatewaySuccess}
          onPaymentFailure={(err) => {
            setShowGatewayModal(false);
            setErrorMessage(err?.message || 'Payment was declined or cancelled');
          }}
          onClose={() => setShowGatewayModal(false)}
        />
      )}
    </div>
  );
}
