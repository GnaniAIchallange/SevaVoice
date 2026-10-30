import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Sprout,
  Calendar,
  X,
  HeartHandshake,
  Clock,
  Tag,
  IndianRupee,
  FileText,
} from 'lucide-react';
import { API_URL } from '../../lib/apiConfig.js';

export default function RequestDetailModal({ requestId, onClose, onDonate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadRequest() {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`${API_URL}/api/donor/requests/${requestId}`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.message || 'Unable to load request details');
        }
        setData(json);
      } catch (err) {
        setError(err.message || 'Failed to load request');
      } finally {
        setLoading(false);
      }
    }

    if (requestId) {
      loadRequest();
    }
  }, [requestId]);

  if (loading) {
    return (
      <div className="modal-overlay" role="dialog" aria-modal="true">
        <div className="modal-content">
          <div className="modal-body" style={{ textAlign: 'center', padding: '60px' }}>
            <Clock size={32} style={{ margin: '0 auto 12px auto', color: 'var(--color-primary)' }} />
            <p style={{ color: 'var(--color-text-muted)' }}>Loading assistance request details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="modal-overlay" role="dialog" aria-modal="true">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Request Details</h2>
            <button className="modal-close-btn" onClick={onClose} aria-label="Close modal"><X size={20} /></button>
          </div>
          <div className="modal-body">
            <p className="form-error">{error || 'This request is not available for public view.'}</p>
          </div>
          <div className="modal-footer">
            <button className="btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  const { request, farmer } = data;
  const percentFunded = Math.min(
    100,
    Math.round(((request.amountFunded || 0) / (request.amountRequested || 1)) * 100)
  );

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content" style={{ maxWidth: '820px' }}>
        <div className="modal-header">
          <div>
            <span className="category-pill">{request.category}</span>
            <h2 style={{ marginTop: '6px' }}>{request.title}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal"><X size={20} /></button>
        </div>

        <div className="modal-body">
          {/* Trust & Verification Badge Explanation */}
          <div className="public-trust-notice">
            <div className="public-trust-notice-header">
              <ShieldCheck size={18} />
              <span>Verified Farmer & Approved Request</span>
            </div>
            <p>
              This farmer's identity and land ownership documents have been independently reviewed and verified by SevaVoice verifiers. The assistance request has been evaluated and approved for public community support.
            </p>
          </div>

          {/* Farmer Public Profile */}
          <div className="info-section">
            <h3>Farmer Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Farmer Name</span>
                <span className="info-value">{farmer.name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Location</span>
                <span className="info-value">
                  {[farmer.village, farmer.district, farmer.state].filter(Boolean).join(', ') || 'Rural Community'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Crop & Cultivation</span>
                <span className="info-value">{farmer.cropType || 'Staple crops'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Farm Land Size</span>
                <span className="info-value">
                  {farmer.landSizeAcres ? `${farmer.landSizeAcres} Acres` : 'Smallholder Farm'}
                </span>
              </div>
            </div>
          </div>

          {/* Funding Summary */}
          <div className="funding-progress-box">
            <div className="funding-numbers">
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block' }}>Target Amount</span>
                <span className="funding-amount">₹{Number(request.amountRequested).toLocaleString()}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block' }}>Amount Raised</span>
                <span className="funding-amount" style={{ color: 'var(--color-success)' }}>
                  ₹{Number(request.amountFunded || 0).toLocaleString()} ({percentFunded}%)
                </span>
              </div>
            </div>
            <div className="progress-bar-bg" style={{ height: '8px' }}>
              <div className="progress-bar-fill" style={{ width: `${percentFunded}%` }} />
            </div>
            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'right' }}>
              Remaining Need: ₹{Number(request.remainingGoal || 0).toLocaleString()}
            </div>
          </div>

          {/* Request Reason & Intended Use */}
          <div className="info-section">
            <h3>Reason for Assistance</h3>
            <p style={{ margin: 0, fontSize: '14.5px', lineHeight: '1.6', color: 'var(--color-text)' }}>
              {request.reason || request.purpose || 'Direct financial assistance requested for farming operations.'}
            </p>
          </div>

          <div className="info-section">
            <h3>Intended Use of Contributions</h3>
            <p style={{ margin: 0, fontSize: '14.5px', lineHeight: '1.6', color: 'var(--color-text)' }}>
              {request.intendedUse || request.purpose || 'Agricultural inputs, seeds, irrigation, and field maintenance.'}
            </p>
          </div>

          {/* Public Supporting Evidence if present */}
          {request.supportingEvidence && request.supportingEvidence.length > 0 && (
            <div className="info-section">
              <h3>Supporting Evidence</h3>
              <ul>
                {request.supportingEvidence.map((evidence, idx) => (
                  <li key={idx} style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
                    {evidence}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ fontSize: '12px', color: 'var(--color-text-dim)', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
            <Calendar size={13} />
            Submitted on {new Date(request.createdAt).toLocaleDateString()}
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button className="btn-secondary" onClick={onClose}>Close</button>
          <button
            type="button"
            className="btn-primary"
            style={{ fontSize: '15px', padding: '10px 24px' }}
            onClick={() => onDonate(request)}
          >
            <HeartHandshake size={17} />
            Donate Now
          </button>
        </div>
      </div>
    </div>
  );
}
