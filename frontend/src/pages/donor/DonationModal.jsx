import { useState } from 'react';
import { HeartHandshake, AlertTriangle, X, ArrowLeft } from 'lucide-react';

export default function DonationModal({ request, onClose }) {
  const [pledgeAmount, setPledgeAmount] = useState('1000');
  const [inputError, setInputError] = useState('');

  if (!request) return null;

  function handleAmountChange(e) {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setPledgeAmount(val);
    if (!val || parseInt(val, 10) <= 0) {
      setInputError('Please enter a valid positive donation amount.');
    } else {
      setInputError('');
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <div>
            <h2>Contribute to Assistance Request</h2>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Direct Farmer Support</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <div className="donation-modal-box">
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#153f32', fontFamily: 'Georgia, serif' }}>
              {request.title}
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13.5px', color: '#64748b' }}>
              Farmer: <strong>{request.farmer?.name || 'Verified Farmer'}</strong> | Goal: ₹{Number(request.amountRequested || 0).toLocaleString()}
            </p>

            <div style={{ margin: '16px 0' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                Intended Contribution Amount (INR)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px', fontWeight: 700, color: '#153f32' }}>₹</span>
                <input
                  type="text"
                  className="donation-amount-input"
                  value={pledgeAmount}
                  onChange={handleAmountChange}
                  placeholder="Amount"
                />
              </div>
              {inputError && (
                <p style={{ color: '#dc2626', fontSize: '12px', margin: '4px 0 0 0' }}>
                  {inputError}
                </p>
              )}

              {/* Quick Select Buttons */}
              <div className="preset-buttons-row">
                {['500', '1000', '2500', '5000'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="btn-secondary preset-btn"
                    onClick={() => {
                      setPledgeAmount(preset);
                      setInputError('');
                    }}
                  >
                    ₹{preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Notice Box */}
            <div className="donation-placeholder-alert">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#92400e', marginBottom: '4px' }}>
                <AlertTriangle size={17} />
                <span>Payment Gateway Notice</span>
              </div>
              Online donations are not available yet. Payment functionality will be added in a future update. No money has been deducted from your account, and no transaction has been processed.
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn-primary" onClick={onClose} style={{ minWidth: '200px' }}>
            <ArrowLeft size={16} />
            Return to Browsing
          </button>
        </div>
      </div>
    </div>
  );
}
