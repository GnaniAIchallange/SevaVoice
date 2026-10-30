import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Hourglass,
  X,
  User,
  FileText,
  Tag,
  IndianRupee,
  Calendar,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { API_URL, getAuthHeaders } from '../../lib/apiConfig.js';

export default function RequestReviewModal({ requestId, onClose, onUpdated, onViewFarmerProfile }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);
  const [decisionReason, setDecisionReason] = useState('');

  async function loadRequestDetails() {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API_URL}/api/verifier/requests/${requestId}`, {
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Unable to load assistance request');
      }
      setData(result);
    } catch (err) {
      setError(err.message || 'Error connecting to server');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (requestId) {
      loadRequestDetails();
    }
  }, [requestId]);

  async function handleDecision(action) {
    if ((action === 'reject' || action === 'request_info') && !decisionReason.trim()) {
      alert('Please provide a mandatory reason for rejecting or requesting more information.');
      return;
    }

    try {
      setActionInProgress(true);
      const response = await fetch(`${API_URL}/api/verifier/requests/${requestId}/review`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action,
          reason: decisionReason.trim(),
          remarks: decisionReason.trim(),
        }),
      });

      const resJson = await response.json();
      if (!response.ok) {
        throw new Error(resJson.message || 'Failed to update request');
      }

      alert(resJson.message);
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionInProgress(false);
    }
  }

  function renderStatusBadge(status) {
    const s = String(status || 'pending').toLowerCase();
    let Icon = Clock;
    if (s === 'approved' || s === 'verified') Icon = CheckCircle2;
    else if (s === 'rejected') Icon = XCircle;
    else if (s === 'under_review') Icon = Hourglass;
    else if (s.includes('additional') || s.includes('info')) Icon = AlertCircle;

    return (
      <span className={`status-badge ${s}`}>
        <Icon size={12} />
        {s.replace(/_/g, ' ')}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="modal-overlay" role="dialog" aria-modal="true">
        <div className="modal-content">
          <div className="modal-body" style={{ textAlign: 'center', padding: '60px' }}>
            <Clock size={32} style={{ margin: '0 auto 12px auto', color: 'var(--color-primary)' }} />
            <p>Loading assistance request review...</p>
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
            <h2>Error Loading Request</h2>
            <button className="modal-close-btn" onClick={onClose} aria-label="Close modal"><X size={20} /></button>
          </div>
          <div className="modal-body">
            <p className="form-error">{error || 'Record unavailable'}</p>
          </div>
          <div className="modal-footer">
            <button className="btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  const { request, farmer } = data;
  const isFarmerVerified = farmer?.farmerVerificationStatus === 'verified';

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h2>Review Assistance Request: {request.title}</h2>
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Request ID: {request.id}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal"><X size={20} /></button>
        </div>

        <div className="modal-body">
          {/* Eligibility status */}
          {!isFarmerVerified ? (
            <div className="notice-box notice-warning">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Publication Ineligible:</strong> The farmer ({farmer.name}) has not completed mandatory document verification (Status: {farmer.farmerVerificationStatus}). Only assistance requests from verified farmers may be approved for publication.
              </div>
            </div>
          ) : (
            <div className="notice-box notice-success">
              <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Publication Eligible:</strong> Farmer identity and mandatory documents are verified. This request can be approved to appear in the Donor Dashboard.
              </div>
            </div>
          )}

          {/* Farmer Profile Summary */}
          <div className="info-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, border: 'none', padding: 0 }}><User size={16} /> Farmer Profile Summary</h3>
              {onViewFarmerProfile && (
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => onViewFarmerProfile(farmer.id)}
                >
                  View Profile & History ({farmer.previousRequestsCount || 0} prior)
                  <ArrowRight size={13} />
                </button>
              )}
            </div>

            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Farmer Name</span>
                <span className="info-value">{farmer.name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Contact Phone</span>
                <span className="info-value">{farmer.phone || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Location</span>
                <span className="info-value">
                  {[farmer.village, farmer.district, farmer.state].filter(Boolean).join(', ') || 'N/A'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Crop & Land</span>
                <span className="info-value">
                  {farmer.cropType || 'N/A'} ({farmer.landSizeAcres ? `${farmer.landSizeAcres} Acres` : 'N/A'})
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Document Verification</span>
                <div>{renderStatusBadge(farmer.farmerVerificationStatus)}</div>
              </div>
            </div>
          </div>

          {/* Donation Request Details */}
          <div className="info-section">
            <h3><FileText size={16} /> Donation Request Details</h3>
            <div className="info-grid" style={{ marginBottom: '14px' }}>
              <div className="info-item">
                <span className="info-label">Request Title</span>
                <span className="info-value">{request.title}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Category</span>
                <span className="info-value" style={{ textTransform: 'capitalize' }}>{request.category}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Requested Amount</span>
                <span className="info-value" style={{ color: 'var(--color-text)', fontSize: '18px' }}>
                  ₹{Number(request.amountRequested || 0).toLocaleString()}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Submission Date</span>
                <span className="info-value">{new Date(request.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Current Status</span>
                <div>{renderStatusBadge(request.status)}</div>
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <span className="info-label">Reason for Requesting Assistance</span>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', lineHeight: '1.5', color: 'var(--color-text)' }}>
                {request.reason || request.purpose || 'No description provided.'}
              </p>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <span className="info-label">Intended Use of Funds</span>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', lineHeight: '1.5', color: 'var(--color-text)' }}>
                {request.intendedUse || request.purpose || 'No details provided.'}
              </p>
            </div>

            {request.reviewNotes && (
              <div className="notice-box notice-info" style={{ marginTop: '10px' }}>
                <Clock size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Previous Review Note:</strong> {request.reviewNotes}
                </div>
              </div>
            )}
          </div>

          {/* Decision Section */}
          <div className="info-section" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h3><ShieldCheck size={16} /> Verifier Decision</h3>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '6px' }}>
                Review Notes / Reason (Required for rejection or additional info):
              </label>
              <textarea
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '13px', minHeight: '64px', boxSizing: 'border-box' }}
                placeholder="Enter remarks or justification for your decision..."
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <button
                type="button"
                className="btn-primary"
                disabled={!isFarmerVerified || actionInProgress || request.status === 'approved'}
                onClick={() => handleDecision('approve')}
              >
                <CheckCircle2 size={16} />
                Approve for Publication
              </button>

              <button
                type="button"
                className="btn-danger"
                disabled={actionInProgress || request.status === 'rejected'}
                onClick={() => handleDecision('reject')}
              >
                <XCircle size={16} />
                Reject Request
              </button>

              <button
                type="button"
                className="btn-warning"
                disabled={actionInProgress || request.status === 'additional_info_required'}
                onClick={() => handleDecision('request_info')}
              >
                <AlertCircle size={16} />
                Request Additional Info
              </button>

              <button
                type="button"
                className="btn-secondary"
                disabled={actionInProgress || request.status === 'under_review'}
                onClick={() => handleDecision('under_review')}
              >
                <Hourglass size={16} />
                Put Under Review
              </button>

              <button
                type="button"
                className="btn-secondary"
                disabled={actionInProgress || request.status === 'closed'}
                onClick={() => handleDecision('close')}
              >
                <X size={16} />
                Close Request
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
