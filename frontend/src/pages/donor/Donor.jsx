import { useEffect, useState } from 'react';
import {
  HeartHandshake,
  ShieldCheck,
  CheckCircle2,
  Gift,
  Search,
  SlidersHorizontal,
  Eye,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  MapPin,
  Calendar,
  Grid,
  History,
  ArrowUpDown,
} from 'lucide-react';
import { API_URL, getAuthHeaders } from '../../lib/apiConfig.js';
import RequestDetailModal from './RequestDetailModal.jsx';
import DonationModal from './DonationModal.jsx';
import './donor.css';

export default function Donor({ user }) {
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' or 'history'
  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Browse requests state
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Donation history state
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Active modals
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [donationTargetRequest, setDonationTargetRequest] = useState(null);

  // Load donor overview stats
  async function loadOverview() {
    try {
      setLoadingOverview(true);
      const res = await fetch(`${API_URL}/api/donor/overview`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      }
    } catch (err) {
      console.error('Error fetching overview:', err);
    } finally {
      setLoadingOverview(false);
    }
  }

  // Load approved requests
  async function loadRequests(targetPage = page, targetCat = category, targetSort = sort, targetSearch = search) {
    try {
      setLoadingRequests(true);
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: '9',
        category: targetCat,
        sort: targetSort,
        search: targetSearch,
      });

      const res = await fetch(`${API_URL}/api/donor/requests?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.items || []);
        setPagination(data.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Error fetching donor requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  }

  // Load donation history (real records)
  async function loadHistory() {
    try {
      setLoadingHistory(true);
      const res = await fetch(`${API_URL}/api/donor/history`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.donations || []);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (activeTab === 'browse') {
      loadRequests(page, category, sort, search);
    } else if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, page, category, sort]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    setPage(1);
    loadRequests(1, category, sort, search);
  }

  return (
    <div className="donor-container">
      {/* Hero Welcome */}
      <section className="donor-hero">
        <p className="eyebrow">
          <HeartHandshake size={16} /> Donor Community Workspace
        </p>
        <h1>Support Verified Farmers Across India</h1>
        <p>
          Welcome, {user.name}. Every assistance request listed below has passed strict independent identity and land ownership verification by certified verifiers before publication.
        </p>
      </section>

      {/* Overview Stats */}
      <section className="donor-stats-row" aria-label="Donor Platform Overview">
        <div className="donor-stat-box">
          <div className="donor-stat-top">
            <span className="donor-stat-label">Available Requests</span>
            <span className="donor-stat-icon"><FileText size={18} /></span>
          </div>
          <div className="donor-stat-number">
            {loadingOverview ? '...' : overview?.availableRequestsCount ?? 0}
          </div>
        </div>

        <div className="donor-stat-box">
          <div className="donor-stat-top">
            <span className="donor-stat-label">Your Lifetime Contributions</span>
            <span className="donor-stat-icon"><Gift size={18} /></span>
          </div>
          <div className="donor-stat-number">
            {loadingOverview ? '...' : overview?.donorContributionsCount ?? 0}
          </div>
        </div>

        <div className="donor-stat-box">
          <div className="donor-stat-top">
            <span className="donor-stat-label">Trust & Verification</span>
            <span className="donor-stat-icon"><ShieldCheck size={18} /></span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-success)', marginTop: '6px' }}>
            100% Aadhaar & Land Verified
          </div>
        </div>
      </section>

      {/* Tabs */}
      <nav className="section-nav" aria-label="Donor Dashboard Sections">
        <button
          type="button"
          className={`section-nav-button ${activeTab === 'browse' ? 'active' : ''}`}
          onClick={() => setActiveTab('browse')}
        >
          <Grid size={18} />
          Browse Verified Assistance Requests
        </button>
        <button
          type="button"
          className={`section-nav-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={18} />
          My Contribution History ({history.length})
        </button>
      </nav>

      {/* TAB 1: BROWSE REQUESTS */}
      {activeTab === 'browse' && (
        <section aria-labelledby="browse-section-title">
          {/* Filter Bar */}
          <div className="donor-filters">
            <div className="filters-row-top">
              <form onSubmit={handleSearchSubmit} className="search-form-wrapper">
                <div className="donor-search-input-wrapper">
                  <Search size={16} className="donor-search-icon" />
                  <input
                    type="search"
                    className="donor-search-input"
                    placeholder="Search by keywords, reason, crops..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-primary">Search</button>
              </form>

              <div className="sort-wrapper">
                <ArrowUpDown size={15} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                <select
                  className="filter-select"
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="newest">Recently Published</option>
                  <option value="amount_asc">Amount: Low to High</option>
                  <option value="amount_desc">Amount: High to Low</option>
                </select>
              </div>
            </div>

            {/* Category Chips */}
            <div className="category-chips">
              {[
                { label: 'All Categories', value: 'all' },
                { label: 'Seeds', value: 'seeds' },
                { label: 'Fertilizer', value: 'fertilizer' },
                { label: 'Equipment', value: 'equipment' },
                { label: 'Irrigation', value: 'irrigation' },
                { label: 'Livestock', value: 'livestock' },
                { label: 'Medical', value: 'medical' },
                { label: 'Other', value: 'other' },
              ].map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  className={`category-chip ${category === cat.value ? 'active' : ''}`}
                  onClick={() => {
                    setCategory(cat.value);
                    setPage(1);
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Requests Grid */}
          {loadingRequests ? (
            <div className="empty-state">
              <Clock size={28} />
              <p>Loading approved assistance requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="empty-state" style={{ background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '64px 20px' }}>
              <FileText size={32} style={{ color: 'var(--color-primary)' }} />
              <h3 style={{ margin: '8px 0 4px 0', color: 'var(--color-text)' }}>No Approved Requests Available</h3>
              <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
                There are currently no published requests matching your filter criteria. Check back soon as verifiers approve new applications.
              </p>
            </div>
          ) : (
            <div className="requests-grid">
              {requests.map((item) => {
                const percentFunded = Math.min(
                  100,
                  Math.round(((item.amountFunded || 0) / (item.amountRequested || 1)) * 100)
                );

                return (
                  <article className="request-card" key={item.id}>
                    <div>
                      <div className="request-card-header">
                        <span className="category-pill">{item.category}</span>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} />
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="verified-trust-badge">
                        <CheckCircle2 size={13} />
                        Verified Farmer & Approved Request
                      </div>

                      <h3 className="request-card-title">{item.title}</h3>

                      <div className="request-card-farmer">
                        <MapPin size={13} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                        <span>By <strong>{item.farmer?.name}</strong> &bull; {[item.farmer?.village, item.farmer?.district, item.farmer?.state].filter(Boolean).join(', ')}</span>
                      </div>

                      <p className="request-card-reason">
                        {item.reason || item.purpose || 'Direct financial assistance requested for farming operations.'}
                      </p>
                    </div>

                    <div>
                      {/* Funding Progress */}
                      <div className="funding-progress-box">
                        <div className="funding-numbers">
                          <span>Goal: <strong style={{ color: 'var(--color-text)' }}>₹{Number(item.amountRequested).toLocaleString()}</strong></span>
                          <span>Raised: <strong style={{ color: 'var(--color-success)' }}>₹{Number(item.amountFunded || 0).toLocaleString()}</strong></span>
                        </div>
                        <div className="progress-bar-bg">
                          <div className="progress-bar-fill" style={{ width: `${percentFunded}%` }} />
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '6px', textAlign: 'right' }}>
                          Remaining: ₹{Number(item.remainingGoal || 0).toLocaleString()}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="card-actions-row">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setSelectedRequestId(item.id)}
                        >
                          <Eye size={15} />
                          View Details
                        </button>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => setDonationTargetRequest(item)}
                        >
                          <HeartHandshake size={15} />
                          Donate Now
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: CONTRIBUTION HISTORY */}
      {activeTab === 'history' && (
        <section aria-labelledby="history-section-title">
          {loadingHistory ? (
            <div className="empty-state">
              <Clock size={28} />
              <p>Loading your donation history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="history-empty-note">
              <Gift size={32} style={{ color: 'var(--color-primary)' }} />
              <h3 style={{ margin: 0, color: 'var(--color-text)' }}>
                No Contribution Records Yet
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-muted)', maxWidth: '500px' }}>
                You have not made any recorded donations yet. When online payment transactions are processed in future updates, your verified receipts and impact updates will appear here.
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setActiveTab('browse')}
              >
                <Grid size={15} />
                Browse Assistance Requests
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="table-container table-desktop-only">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Assistance Request</th>
                      <th>Farmer & Location</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((record) => (
                      <tr key={record.id}>
                        <td>{new Date(record.date).toLocaleDateString()}</td>
                        <td><strong>{record.request?.title || 'Assistance Request'}</strong></td>
                        <td>{record.request?.farmerName} ({record.request?.location})</td>
                        <td style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                          ₹{Number(record.amount).toLocaleString()}
                        </td>
                        <td>
                          <span className="status-badge verified">
                            <CheckCircle2 size={12} /> {record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View for History */}
              <div className="mobile-card-list">
                {history.map((record) => (
                  <article className="mobile-data-card" key={record.id}>
                    <div className="mobile-data-card-header">
                      <div>
                        <strong style={{ fontSize: '15px', color: 'var(--color-text)' }}>
                          {record.request?.title || 'Assistance Request'}
                        </strong>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          {new Date(record.date).toLocaleDateString()}
                        </div>
                      </div>
                      <span className="status-badge verified">
                        <CheckCircle2 size={12} /> {record.status}
                      </span>
                    </div>

                    <div className="mobile-data-card-row">
                      <span>Beneficiary</span>
                      <strong>{record.request?.farmerName} ({record.request?.location})</strong>
                    </div>

                    <div className="mobile-data-card-row">
                      <span>Contributed Amount</span>
                      <strong style={{ color: 'var(--color-text)', fontSize: '16px' }}>
                        ₹{Number(record.amount).toLocaleString()}
                      </strong>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* Modals */}
      {selectedRequestId && (
        <RequestDetailModal
          requestId={selectedRequestId}
          onClose={() => setSelectedRequestId(null)}
          onDonate={(req) => {
            setSelectedRequestId(null);
            setDonationTargetRequest(req);
          }}
        />
      )}

      {donationTargetRequest && (
        <DonationModal
          request={donationTargetRequest}
          user={user}
          onClose={() => setDonationTargetRequest(null)}
          onSuccess={() => {
            loadOverview();
            loadRequests();
            if (activeTab === 'history') loadHistory();
          }}
        />
      )}
    </div>
  );
}
