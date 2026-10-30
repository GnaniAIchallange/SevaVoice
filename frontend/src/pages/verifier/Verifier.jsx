import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  FileCheck,
  HandCoins,
  Clock,
  Hourglass,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Search,
  User,
  Eye,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Sprout,
  Calendar,
  FileText,
} from 'lucide-react';
import { API_URL, getAuthHeaders } from '../../lib/apiConfig.js';
import DocumentReviewModal from './DocumentReviewModal.jsx';
import RequestReviewModal from './RequestReviewModal.jsx';
import FarmerProfileModal from './FarmerProfileModal.jsx';
import './verifier.css';

export default function Verifier({ user }) {
  const [activeTab, setActiveTab] = useState('documents'); // 'documents' or 'requests'
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Section A: Farmers queue state
  const [farmers, setFarmers] = useState([]);
  const [farmersLoading, setFarmersLoading] = useState(true);
  const [farmerStatusFilter, setFarmerStatusFilter] = useState('all');
  const [farmerSearch, setFarmerSearch] = useState('');
  const [farmerPage, setFarmerPage] = useState(1);
  const [farmerPagination, setFarmerPagination] = useState({ total: 0, totalPages: 1 });

  // Section B: Requests queue state
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestStatusFilter, setRequestStatusFilter] = useState('all');
  const [requestSearch, setRequestSearch] = useState('');
  const [requestPage, setRequestPage] = useState(1);
  const [requestPagination, setRequestPagination] = useState({ total: 0, totalPages: 1 });

  // Modals state
  const [reviewingFarmerId, setReviewingFarmerId] = useState(null);
  const [reviewingRequestId, setReviewingRequestId] = useState(null);
  const [profileFarmerId, setProfileFarmerId] = useState(null);

  // Fetch real statistics
  async function fetchStats() {
    try {
      setLoadingStats(true);
      const res = await fetch(`${API_URL}/api/verifier/stats`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }

  // Fetch Section A farmers queue
  async function fetchFarmers(page = farmerPage, status = farmerStatusFilter, search = farmerSearch) {
    try {
      setFarmersLoading(true);
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: '10',
        status,
        search,
      });

      const res = await fetch(`${API_URL}/api/verifier/farmers?${queryParams.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setFarmers(data.items || []);
        setFarmerPagination(data.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to load farmers:', err);
    } finally {
      setFarmersLoading(false);
    }
  }

  // Fetch Section B requests queue
  async function fetchRequests(page = requestPage, status = requestStatusFilter, search = requestSearch) {
    try {
      setRequestsLoading(true);
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: '10',
        status,
        search,
      });

      const res = await fetch(`${API_URL}/api/verifier/requests?${queryParams.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.items || []);
        setRequestPagination(data.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setRequestsLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'documents') {
      fetchFarmers(farmerPage, farmerStatusFilter, farmerSearch);
    } else {
      fetchRequests(requestPage, requestStatusFilter, requestSearch);
    }
  }, [activeTab, farmerPage, farmerStatusFilter, requestPage, requestStatusFilter]);

  function handleFarmerSearchSubmit(e) {
    e.preventDefault();
    setFarmerPage(1);
    fetchFarmers(1, farmerStatusFilter, farmerSearch);
  }

  function handleRequestSearchSubmit(e) {
    e.preventDefault();
    setRequestPage(1);
    fetchRequests(1, requestStatusFilter, requestSearch);
  }

  function handleDataUpdated() {
    fetchStats();
    if (activeTab === 'documents') {
      fetchFarmers(farmerPage, farmerStatusFilter, farmerSearch);
    } else {
      fetchRequests(requestPage, requestStatusFilter, requestSearch);
    }
  }

  function renderStatusBadge(status) {
    const s = String(status || 'pending').toLowerCase();
    let Icon = Clock;
    if (s === 'verified' || s === 'approved') Icon = CheckCircle2;
    else if (s === 'rejected') Icon = XCircle;
    else if (s === 'under_review') Icon = Hourglass;
    else if (s.includes('additional') || s.includes('info')) Icon = AlertCircle;

    return (
      <span className={`status-badge ${s}`}>
        <Icon size={13} />
        {s.replace(/_/g, ' ')}
      </span>
    );
  }

  return (
    <div className="verifier-container">
      {/* Header */}
      <header className="verifier-header">
        <p className="eyebrow">
          <ShieldCheck size={16} /> Verifier Workspace
        </p>
        <h1>Case Management & Verification Dashboard</h1>
        <p>
          Welcome, {user.name}. Review mandatory farmer identity documents and verify financial assistance requests before public donor listing.
        </p>
      </header>

      {/* Summary Cards Overview (calculated from actual database records) */}
      <section className="stats-grid" aria-label="Verification Summary">
        <div className="stat-card stat-card-pending">
          <div className="stat-card-top">
            <span className="stat-card-title">Pending Reviews</span>
            <span className="stat-card-icon"><Clock size={16} /></span>
          </div>
          <div className="stat-card-value">
            {loadingStats ? '...' : stats?.farmerVerification?.pendingReviews ?? 0}
          </div>
        </div>

        <div className="stat-card stat-card-review">
          <div className="stat-card-top">
            <span className="stat-card-title">Under Review</span>
            <span className="stat-card-icon"><Hourglass size={16} /></span>
          </div>
          <div className="stat-card-value">
            {loadingStats ? '...' : stats?.farmerVerification?.underReview ?? 0}
          </div>
        </div>

        <div className="stat-card stat-card-info">
          <div className="stat-card-top">
            <span className="stat-card-title">Needs Information</span>
            <span className="stat-card-icon"><AlertCircle size={16} /></span>
          </div>
          <div className="stat-card-value">
            {loadingStats ? '...' : stats?.farmerVerification?.additionalInfoRequired ?? 0}
          </div>
        </div>

        <div className="stat-card stat-card-verified">
          <div className="stat-card-top">
            <span className="stat-card-title">Verified Farmers</span>
            <span className="stat-card-icon"><CheckCircle2 size={16} /></span>
          </div>
          <div className="stat-card-value">
            {loadingStats ? '...' : stats?.farmerVerification?.verified ?? 0}
          </div>
        </div>

        <div className="stat-card stat-card-rejected">
          <div className="stat-card-top">
            <span className="stat-card-title">Rejected Applications</span>
            <span className="stat-card-icon"><XCircle size={16} /></span>
          </div>
          <div className="stat-card-value">
            {loadingStats ? '...' : stats?.farmerVerification?.rejected ?? 0}
          </div>
        </div>
      </section>

      {/* Main Section Navigation */}
      <nav className="section-nav" aria-label="Verifier Sections">
        <button
          type="button"
          className={`section-nav-button ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          <FileCheck size={18} />
          Section A: Farmer Document Verification
        </button>
        <button
          type="button"
          className={`section-nav-button ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <HandCoins size={18} />
          Section B: Farmer Donation Request Approval ({stats?.assistanceRequests?.requestsPending ?? 0} pending)
        </button>
      </nav>

      {/* SECTION A: FARMER DOCUMENT VERIFICATION */}
      {activeTab === 'documents' && (
        <section aria-labelledby="section-a-title">
          <div className="controls-bar">
            {/* Status Filter Tabs */}
            <div className="filter-tabs">
              {[
                { label: 'All', value: 'all' },
                { label: 'Pending', value: 'pending' },
                { label: 'Under Review', value: 'under_review' },
                { label: 'Needs Info', value: 'additional_information_required' },
                { label: 'Verified', value: 'verified' },
                { label: 'Rejected', value: 'rejected' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  className={`filter-chip ${farmerStatusFilter === tab.value ? 'active' : ''}`}
                  onClick={() => {
                    setFarmerStatusFilter(tab.value);
                    setFarmerPage(1);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <form className="search-box" onSubmit={handleFarmerSearchSubmit}>
              <div className="search-box-inner">
                <Search size={16} className="search-box-icon" />
                <input
                  type="search"
                  placeholder="Search by name, phone, village..."
                  value={farmerSearch}
                  onChange={(e) => setFarmerSearch(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-secondary">Search</button>
            </form>
          </div>

          {/* Records Display */}
          {farmersLoading ? (
            <div className="empty-state">
              <Clock size={28} />
              <p>Loading farmer verification records...</p>
            </div>
          ) : farmers.length === 0 ? (
            <div className="empty-state">
              <FileText size={28} />
              <p>No farmers match the selected filter criteria.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="table-container table-desktop-only">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Farmer Name</th>
                      <th>User ID</th>
                      <th>Mobile (Authorized)</th>
                      <th>Location</th>
                      <th>Land / Crop</th>
                      <th>Submitted Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {farmers.map((farmer) => (
                      <tr key={farmer.id}>
                        <td>
                          <button
                            type="button"
                            className="btn-link"
                            style={{ textAlign: 'left', fontWeight: 600 }}
                            onClick={() => setProfileFarmerId(farmer.id)}
                          >
                            <User size={14} />
                            {farmer.name}
                          </button>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          {String(farmer.id).slice(-8)}
                        </td>
                        <td style={{ fontWeight: 500 }}>
                          {farmer.phone}
                        </td>
                        <td>
                          {[farmer.village, farmer.district, farmer.state].filter(Boolean).join(', ') || 'N/A'}
                        </td>
                        <td style={{ fontSize: '13px' }}>
                          {farmer.cropType ? `${farmer.cropType}` : 'General'}
                          {farmer.landSizeAcres ? ` (${farmer.landSizeAcres} ac)` : ''}
                        </td>
                        <td style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                          {farmer.verificationSubmittedAt ? new Date(farmer.verificationSubmittedAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td>
                          {renderStatusBadge(farmer.farmerVerificationStatus)}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() => setReviewingFarmerId(farmer.id)}
                          >
                            <Eye size={14} />
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="mobile-card-list">
                {farmers.map((farmer) => (
                  <article className="mobile-data-card" key={farmer.id}>
                    <div className="mobile-data-card-header">
                      <div>
                        <button
                          type="button"
                          className="btn-link"
                          style={{ fontSize: '16px', fontWeight: 700 }}
                          onClick={() => setProfileFarmerId(farmer.id)}
                        >
                          <User size={16} />
                          {farmer.name}
                        </button>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          ID: {String(farmer.id).slice(-8)} &bull; Phone: {farmer.phone}
                        </div>
                      </div>
                      {renderStatusBadge(farmer.farmerVerificationStatus)}
                    </div>

                    <div className="mobile-data-card-row">
                      <span><MapPin size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Location</span>
                      <strong>{[farmer.village, farmer.district, farmer.state].filter(Boolean).join(', ') || 'N/A'}</strong>
                    </div>

                    <div className="mobile-data-card-row">
                      <span><Sprout size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Land & Crop</span>
                      <strong>
                        {farmer.cropType || 'General'} {farmer.landSizeAcres ? `(${farmer.landSizeAcres} ac)` : ''}
                      </strong>
                    </div>

                    <div className="mobile-data-card-row">
                      <span><Calendar size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Submitted</span>
                      <span>{farmer.verificationSubmittedAt ? new Date(farmer.verificationSubmittedAt).toLocaleDateString() : 'N/A'}</span>
                    </div>

                    <button
                      type="button"
                      className="btn-primary"
                      style={{ width: '100%', marginTop: '4px' }}
                      onClick={() => setReviewingFarmerId(farmer.id)}
                    >
                      <Eye size={16} />
                      Review Documents
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}

          {/* Pagination */}
          {farmerPagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={farmerPage <= 1}
                onClick={() => setFarmerPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                Page {farmerPage} of {farmerPagination.totalPages}
              </span>
              <button
                type="button"
                className="btn-secondary"
                disabled={farmerPage >= farmerPagination.totalPages}
                onClick={() => setFarmerPage((p) => p + 1)}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </section>
      )}

      {/* SECTION B: FARMER DONATION REQUEST APPROVAL */}
      {activeTab === 'requests' && (
        <section aria-labelledby="section-b-title">
          <div className="controls-bar">
            {/* Status Filter Tabs */}
            <div className="filter-tabs">
              {[
                { label: 'All', value: 'all' },
                { label: 'Pending Approval', value: 'pending_approval' },
                { label: 'Under Review', value: 'under_review' },
                { label: 'Needs Info', value: 'additional_info_required' },
                { label: 'Approved', value: 'approved' },
                { label: 'Rejected', value: 'rejected' },
                { label: 'Closed', value: 'closed' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  className={`filter-chip ${requestStatusFilter === tab.value ? 'active' : ''}`}
                  onClick={() => {
                    setRequestStatusFilter(tab.value);
                    setRequestPage(1);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <form className="search-box" onSubmit={handleRequestSearchSubmit}>
              <div className="search-box-inner">
                <Search size={16} className="search-box-icon" />
                <input
                  type="search"
                  placeholder="Search by title, reason, category..."
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-secondary">Search</button>
            </form>
          </div>

          {/* Records Display */}
          {requestsLoading ? (
            <div className="empty-state">
              <Clock size={28} />
              <p>Loading assistance requests queue...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="empty-state">
              <FileText size={28} />
              <p>No assistance requests found matching the criteria.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="table-container table-desktop-only">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Request Title</th>
                      <th>Farmer Name</th>
                      <th>Category</th>
                      <th>Amount Requested</th>
                      <th>Submission Date</th>
                      <th>Publication Eligibility</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((item) => (
                      <tr key={item.id}>
                        <td style={{ maxWidth: '240px' }}>
                          <strong style={{ display: 'block', color: 'var(--color-text)' }}>{item.title}</strong>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                            {item.reason ? (item.reason.slice(0, 50) + (item.reason.length > 50 ? '...' : '')) : ''}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-link"
                            onClick={() => setProfileFarmerId(item.farmer.id)}
                          >
                            <User size={14} />
                            {item.farmer.name}
                          </button>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                            {[item.farmer.village, item.farmer.district].filter(Boolean).join(', ')}
                          </div>
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>
                          {item.category}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                          ₹{Number(item.amountRequested).toLocaleString()}
                        </td>
                        <td style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          {item.isEligibleForPublication ? (
                            <span className="eligibility-badge eligible">
                              <CheckCircle2 size={12} /> Eligible (Verified)
                            </span>
                          ) : (
                            <span className="eligibility-badge ineligible" title={item.ineligibilityReason}>
                              <XCircle size={12} /> Ineligible (Unverified)
                            </span>
                          )}
                        </td>
                        <td>
                          {renderStatusBadge(item.status)}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() => setReviewingRequestId(item.id)}
                          >
                            <Eye size={14} />
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="mobile-card-list">
                {requests.map((item) => (
                  <article className="mobile-data-card" key={item.id}>
                    <div className="mobile-data-card-header">
                      <div>
                        <strong style={{ fontSize: '16px', color: 'var(--color-text)', display: 'block' }}>{item.title}</strong>
                        <button
                          type="button"
                          className="btn-link"
                          style={{ fontSize: '13px', marginTop: '2px' }}
                          onClick={() => setProfileFarmerId(item.farmer.id)}
                        >
                          <User size={13} /> {item.farmer.name}
                        </button>
                      </div>
                      {renderStatusBadge(item.status)}
                    </div>

                    <div className="mobile-data-card-row">
                      <span>Target Amount</span>
                      <strong style={{ color: 'var(--color-text)', fontSize: '15px' }}>
                        ₹{Number(item.amountRequested).toLocaleString()}
                      </strong>
                    </div>

                    <div className="mobile-data-card-row">
                      <span>Category</span>
                      <strong style={{ textTransform: 'capitalize' }}>{item.category}</strong>
                    </div>

                    <div className="mobile-data-card-row">
                      <span>Publication Gate</span>
                      {item.isEligibleForPublication ? (
                        <span className="eligibility-badge eligible">
                          <CheckCircle2 size={12} /> Eligible (Verified)
                        </span>
                      ) : (
                        <span className="eligibility-badge ineligible">
                          <XCircle size={12} /> Ineligible (Unverified)
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="btn-primary"
                      style={{ width: '100%', marginTop: '4px' }}
                      onClick={() => setReviewingRequestId(item.id)}
                    >
                      <Eye size={16} />
                      Review Request
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}

          {/* Pagination */}
          {requestPagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={requestPage <= 1}
                onClick={() => setRequestPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                Page {requestPage} of {requestPagination.totalPages}
              </span>
              <button
                type="button"
                className="btn-secondary"
                disabled={requestPage >= requestPagination.totalPages}
                onClick={() => setRequestPage((p) => p + 1)}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </section>
      )}

      {/* Modals */}
      {reviewingFarmerId && (
        <DocumentReviewModal
          farmerId={reviewingFarmerId}
          onClose={() => setReviewingFarmerId(null)}
          onUpdated={handleDataUpdated}
        />
      )}

      {reviewingRequestId && (
        <RequestReviewModal
          requestId={reviewingRequestId}
          onClose={() => setReviewingRequestId(null)}
          onUpdated={handleDataUpdated}
          onViewFarmerProfile={(fId) => setProfileFarmerId(fId)}
        />
      )}

      {profileFarmerId && (
        <FarmerProfileModal
          farmerId={profileFarmerId}
          onClose={() => setProfileFarmerId(null)}
          onSelectRequest={(reqId) => setReviewingRequestId(reqId)}
        />
      )}
    </div>
  );
}
