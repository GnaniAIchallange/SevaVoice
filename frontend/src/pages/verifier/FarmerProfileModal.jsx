import { useEffect, useState } from 'react';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Sprout,
  Calendar,
  History,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Hourglass,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  IndianRupee,
} from 'lucide-react';
import { API_URL, getAuthHeaders } from '../../lib/apiConfig.js';

export default function FarmerProfileModal({ farmerId, onClose, onSelectRequest }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  async function loadFarmerProfile(targetPage = 1) {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API_URL}/api/verifier/farmers/${farmerId}/profile?page=${targetPage}&limit=10`, {
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Unable to load farmer profile');
      }
      setData(result);
      setPage(targetPage);
    } catch (err) {
      setError(err.message || 'Error connecting to server');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (farmerId) {
      loadFarmerProfile(1);
    }
  }, [farmerId]);

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

  if (loading && !data) {
    return (
      <div className="modal-overlay" role="dialog" aria-modal="true">
        <div className="modal-content">
          <div className="modal-body" style={{ textAlign: 'center', padding: '60px' }}>
            <Clock size={32} style={{ margin: '0 auto 12px auto', color: 'var(--color-primary)' }} />
            <p>Loading farmer profile and history...</p>
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
            <h2>Error Loading Profile</h2>
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

  const { farmer, requests, pagination } = data;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content" style={{ maxWidth: '980px' }}>
        <div className="modal-header">
          <div>
            <h2>Farmer Profile & Assistance History: {farmer.name}</h2>
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>User ID: {farmer.id}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal"><X size={20} /></button>
        </div>

        <div className="modal-body">
          {/* Detailed Profile */}
          <div className="info-section">
            <h3><User size={16} /> Farmer Account Profile</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Full Name</span>
                <span className="info-value">{farmer.name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Phone (Authorized Access)</span>
                <span className="info-value">{farmer.phone}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email</span>
                <span className="info-value">{farmer.email || 'None provided'}</span>
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
              <div className="info-item">
                <span className="info-label">Verified At</span>
                <span className="info-value">
                  {farmer.verifiedAt ? new Date(farmer.verifiedAt).toLocaleDateString() : 'Not yet verified'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Registration Date</span>
                <span className="info-value">
                  {new Date(farmer.registrationDate).toLocaleDateString()}
                </span>
              </div>
            </div>
            {farmer.verificationRemarks && (
              <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                <strong>Verification Remarks:</strong> {farmer.verificationRemarks}
              </div>
            )}
          </div>

          {/* Historical Assistance Requests */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <History size={18} /> Previous Assistance Requests ({pagination?.total || 0})
              </h3>
            </div>

            {requests.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px', background: 'var(--color-surface-muted)', borderRadius: '10px' }}>
                <p>No previous assistance requests recorded for this farmer.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="table-container table-desktop-only">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Title & Category</th>
                        <th>Amount Requested</th>
                        <th>Amount Funded</th>
                        <th>Submitted Date</th>
                        <th>Status</th>
                        <th>Verifier Decision & Notes</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((reqItem) => (
                        <tr key={reqItem.id}>
                          <td>
                            <strong>{reqItem.title}</strong>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                              {reqItem.category}
                            </div>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                            ₹{Number(reqItem.amountRequested).toLocaleString()}
                          </td>
                          <td>
                            ₹{Number(reqItem.amountFunded || 0).toLocaleString()}
                          </td>
                          <td>
                            {new Date(reqItem.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            {renderStatusBadge(reqItem.status)}
                          </td>
                          <td style={{ maxWidth: '240px', fontSize: '13px' }}>
                            {reqItem.reviewedBy ? (
                              <div>
                                <div style={{ fontWeight: 600 }}>By: {reqItem.reviewedBy.name}</div>
                                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                  {reqItem.reviewedAt ? new Date(reqItem.reviewedAt).toLocaleDateString() : ''}
                                </div>
                                {reqItem.reviewNotes && (
                                  <div style={{ fontSize: '12px', color: 'var(--color-text)', marginTop: '2px' }}>
                                    "{reqItem.reviewNotes}"
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--color-text-dim)' }}>Awaiting Review</span>
                            )}
                          </td>
                          <td>
                            {onSelectRequest && (
                              <button
                                type="button"
                                className="btn-outline-primary"
                                onClick={() => {
                                  onClose();
                                  onSelectRequest(reqItem.id);
                                }}
                              >
                                <Eye size={14} /> Review
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards for History */}
                <div className="mobile-card-list">
                  {requests.map((reqItem) => (
                    <article className="mobile-data-card" key={reqItem.id}>
                      <div className="mobile-data-card-header">
                        <div>
                          <strong style={{ fontSize: '15px', color: 'var(--color-text)' }}>{reqItem.title}</strong>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                            {reqItem.category} &bull; {new Date(reqItem.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        {renderStatusBadge(reqItem.status)}
                      </div>

                      <div className="mobile-data-card-row">
                        <span>Requested / Raised</span>
                        <strong>
                          ₹{Number(reqItem.amountRequested).toLocaleString()} / ₹{Number(reqItem.amountFunded || 0).toLocaleString()}
                        </strong>
                      </div>

                      {reqItem.reviewedBy && (
                        <div style={{ fontSize: '12px', background: 'var(--color-surface-muted)', padding: '8px 10px', borderRadius: '6px' }}>
                          <span style={{ fontWeight: 600 }}>Reviewed by: {reqItem.reviewedBy.name}</span>
                          {reqItem.reviewNotes && (
                            <div style={{ color: 'var(--color-text-muted)', marginTop: '2px' }}>"{reqItem.reviewNotes}"</div>
                          )}
                        </div>
                      )}

                      {onSelectRequest && (
                        <button
                          type="button"
                          className="btn-outline-primary"
                          style={{ width: '100%' }}
                          onClick={() => {
                            onClose();
                            onSelectRequest(reqItem.id);
                          }}
                        >
                          <Eye size={15} /> Examine Request
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              </>
            )}

            {pagination && pagination.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={page <= 1}
                  onClick={() => loadFarmerProfile(page - 1)}
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  Page {page} of {pagination.totalPages}
                </span>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={page >= pagination.totalPages}
                  onClick={() => loadFarmerProfile(page + 1)}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
