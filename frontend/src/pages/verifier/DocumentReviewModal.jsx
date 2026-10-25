import { useEffect, useState } from 'react';
import {
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  Clock,
  Hourglass,
  X,
  User,
  ShieldCheck,
  MapPin,
  Sprout,
  AlertTriangle,
} from 'lucide-react';
import { API_URL, getAuthHeaders, getAuthToken } from '../../lib/apiConfig.js';

export default function DocumentReviewModal({ farmerId, onClose, onUpdated }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);

  // Per-document reason/remark inputs
  const [docRemarks, setDocRemarks] = useState({});
  // Farmer final decision inputs
  const [farmerReason, setFarmerReason] = useState('');

  async function loadFarmerDetails() {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API_URL}/api/verifier/farmers/${farmerId}`, {
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Unable to load farmer documents');
      }
      setData(result);
    } catch (err) {
      setError(err.message || 'Error connecting to server');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (farmerId) {
      loadFarmerDetails();
    }
  }, [farmerId]);

  // Securely download or view document file via authorized blob stream
  async function handleViewDocument(docId, docType) {
    try {
      const response = await fetch(`${API_URL}/api/verifier/documents/${docId}/file`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.message || 'Unable to fetch document file');
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      alert(`Document access error: ${err.message}`);
    }
  }

  async function handleReviewDocument(docId, status) {
    const remark = docRemarks[docId] || '';
    if ((status === 'rejected' || status === 'needs_replacement') && !remark.trim()) {
      alert('Please provide a reason or instruction for this document decision.');
      return;
    }

    try {
      setActionInProgress(true);
      const response = await fetch(`${API_URL}/api/verifier/documents/${docId}/review`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status,
          reason: remark.trim(),
          remarks: remark.trim(),
        }),
      });

      const resJson = await response.json();
      if (!response.ok) {
        throw new Error(resJson.message || 'Failed to update document status');
      }

      setDocRemarks((prev) => ({ ...prev, [docId]: '' }));
      await loadFarmerDetails();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionInProgress(false);
    }
  }

  async function handleFarmerVerification(action) {
    if ((action === 'reject' || action === 'request_info') && !farmerReason.trim()) {
      alert('Please enter a reason or explanation for this decision.');
      return;
    }

    try {
      setActionInProgress(true);
      const response = await fetch(`${API_URL}/api/verifier/farmers/${farmerId}/verify`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action,
          reason: farmerReason.trim(),
          remarks: farmerReason.trim(),
        }),
      });

      const resJson = await response.json();
      if (!response.ok) {
        throw new Error(resJson.message || 'Failed to update farmer verification');
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
    if (s === 'verified') Icon = CheckCircle2;
    else if (s === 'rejected' || s === 'missing') Icon = XCircle;
    else if (s === 'under_review') Icon = Hourglass;
    else if (s.includes('additional') || s.includes('replacement')) Icon = AlertCircle;

    return (
      <span className={`status-badge ${s}`}>
        <Icon size={12} />
        {s.replace(/_/g, ' ')}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-body" style={{ textAlign: 'center', padding: '60px' }}>
            <Clock size={32} style={{ margin: '0 auto 12px auto', color: '#1d684b' }} />
            <p>Loading farmer verification details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Error Loading Record</h2>
            <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
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

  const { farmer, mandatoryDocuments, supportingDocuments, canVerify } = data;

  function renderDocumentCard(doc, title, isMandatory) {
    if (!doc) {
      return (
        <div className="doc-review-card" style={{ borderColor: '#fca5a5' }}>
          <div className="doc-review-header">
            <h4 style={{ margin: 0, fontSize: '15px' }}>
              {title} {isMandatory && <span style={{ color: '#dc2626' }}>* (Mandatory)</span>}
            </h4>
            {renderStatusBadge('missing')}
          </div>
          <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '13px' }}>
            This required document has not been uploaded.
          </p>
        </div>
      );
    }

    const docId = doc._id || doc.id;
    const currentRemark = docRemarks[docId] || '';

    return (
      <div className="doc-review-card" key={docId}>
        <div className="doc-review-header">
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>
              {title} {isMandatory && <span style={{ color: '#dc2626' }}>*</span>}
            </h4>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Type: {doc.type} | Size: {(doc.size / 1024).toFixed(1)} KB | Uploaded: {new Date(doc.createdAt).toLocaleDateString()}
            </span>
          </div>
          {renderStatusBadge(doc.verificationStatus)}
        </div>

        {doc.rejectionReason && (
          <div className="notice-box notice-warning" style={{ margin: '8px 0', fontSize: '12px' }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Remarks / Reason:</strong> {doc.rejectionReason}
            </div>
          </div>
        )}

        <div style={{ marginTop: '10px' }}>
          <button
            type="button"
            className="btn-outline-primary"
            onClick={() => handleViewDocument(docId, doc.type)}
          >
            <ExternalLink size={14} />
            Preview / Download Document
          </button>
        </div>

        <div style={{ marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
          <input
            type="text"
            className="doc-reason-input"
            placeholder="Add remark or reason for rejection / replacement request..."
            value={currentRemark}
            onChange={(e) => setDocRemarks({ ...docRemarks, [docId]: e.target.value })}
          />

          <div className="doc-review-actions">
            <button
              type="button"
              className="btn-primary"
              disabled={actionInProgress || doc.verificationStatus === 'verified'}
              onClick={() => handleReviewDocument(docId, 'verified')}
            >
              <CheckCircle2 size={14} />
              Approve Document
            </button>
            <button
              type="button"
              className="btn-danger"
              disabled={actionInProgress || doc.verificationStatus === 'rejected'}
              onClick={() => handleReviewDocument(docId, 'rejected')}
            >
              <XCircle size={14} />
              Reject Document
            </button>
            <button
              type="button"
              className="btn-warning"
              disabled={actionInProgress || doc.verificationStatus === 'needs_replacement'}
              onClick={() => handleReviewDocument(docId, 'needs_replacement')}
            >
              <RotateCcw size={14} />
              Request Clearer Copy
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h2>Review Farmer Documents: {farmer.name}</h2>
            <span style={{ fontSize: '13px', color: '#64748b' }}>ID: {farmer.id}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          {/* Profile Details */}
          <div className="info-section">
            <h3><User size={16} /> Farmer Registration Details</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Full Name</span>
                <span className="info-value">{farmer.name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Mobile Number</span>
                <span className="info-value">{farmer.phone}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Location</span>
                <span className="info-value">
                  {[farmer.village, farmer.district, farmer.state].filter(Boolean).join(', ') || 'N/A'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Land Size</span>
                <span className="info-value">{farmer.landSizeAcres ? `${farmer.landSizeAcres} Acres` : 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Crop Type</span>
                <span className="info-value">{farmer.cropType || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Verification Status</span>
                <div>{renderStatusBadge(farmer.farmerVerificationStatus)}</div>
              </div>
            </div>
          </div>

          {/* Mandatory Documents */}
          <div>
            <h3 style={{ fontSize: '16px', color: '#153f32', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={17} /> Mandatory Documents Review
            </h3>
            {renderDocumentCard(mandatoryDocuments.aadhaar, 'Aadhaar Identification Card', true)}
            {renderDocumentCard(mandatoryDocuments.landCertificate, 'Land Ownership / Property Certificate', true)}
          </div>

          {/* Supporting Documents */}
          {supportingDocuments && supportingDocuments.length > 0 && (
            <div>
              <h3 style={{ fontSize: '16px', color: '#153f32', margin: '16px 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={17} /> Additional Supporting Documents ({supportingDocuments.length})
              </h3>
              {supportingDocuments.map((doc, idx) =>
                renderDocumentCard(doc, `Supporting Document #${idx + 1}`, false)
              )}
            </div>
          )}

          {/* Final Verification Section */}
          <div className="info-section" style={{ background: canVerify ? '#f0fdf4' : '#fffbeb', borderColor: canVerify ? '#86efac' : '#fde68a' }}>
            <h3 style={{ borderBottomColor: canVerify ? '#bbf7d0' : '#fef08a' }}>
              <ShieldCheck size={17} /> Final Farmer Verification Decision
            </h3>

            {!canVerify ? (
              <div className="notice-box notice-warning" style={{ marginBottom: '12px' }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Verification Policy:</strong> A farmer cannot be marked verified until both mandatory documents (Aadhaar Card and Land Ownership Certificate) have been approved by a verifier.
                </div>
              </div>
            ) : (
              <div className="notice-box notice-success" style={{ marginBottom: '12px' }}>
                <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>All mandatory documents approved!</strong> You can now approve this farmer's verification.
                </div>
              </div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Decision Remarks / Reason (Required for rejection or info requests):
              </label>
              <textarea
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', minHeight: '64px', boxSizing: 'border-box' }}
                placeholder="Enter remarks or required information..."
                value={farmerReason}
                onChange={(e) => setFarmerReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <button
                type="button"
                className="btn-primary"
                disabled={!canVerify || actionInProgress || farmer.farmerVerificationStatus === 'verified'}
                onClick={() => handleFarmerVerification('approve')}
              >
                <CheckCircle2 size={16} />
                Approve Farmer Verification
              </button>

              <button
                type="button"
                className="btn-danger"
                disabled={actionInProgress || farmer.farmerVerificationStatus === 'rejected'}
                onClick={() => handleFarmerVerification('reject')}
              >
                <XCircle size={16} />
                Reject Verification
              </button>

              <button
                type="button"
                className="btn-warning"
                disabled={actionInProgress || farmer.farmerVerificationStatus === 'additional_information_required'}
                onClick={() => handleFarmerVerification('request_info')}
              >
                <AlertCircle size={16} />
                Request Additional Info
              </button>

              <button
                type="button"
                className="btn-secondary"
                disabled={actionInProgress || farmer.farmerVerificationStatus === 'under_review'}
                onClick={() => handleFarmerVerification('under_review')}
              >
                <Hourglass size={16} />
                Put Under Review
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
