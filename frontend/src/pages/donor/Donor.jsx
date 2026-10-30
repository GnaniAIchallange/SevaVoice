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
  LayoutDashboard,
  User,
  IndianRupee,
  Sparkles,
  ArrowRight,
  Mail,
  Phone,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { API_URL, getAuthHeaders } from '../../lib/apiConfig.js';
import RequestDetailModal from './RequestDetailModal.jsx';
import DonationModal from './DonationModal.jsx';
import './donor.css';

export default function Donor({ user }) {
  // Exactly the 4 requested clean sections:
  // 1. 'dashboard' (Donor Dashboard)
  // 2. 'browse' (Browse Requests)
  // 3. 'history' (Check Donation History)
  // 4. 'profile' (Manage Profile)
  const [activeTab, setActiveTab] = useState('dashboard');
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

  // Load donation history (real completed records only)
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
    loadHistory();
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

  // Calculate actual total donated amount and unique farmers supported from completed history
  const totalAmountDonated = history
    .filter((d) => d.status === 'completed' || d.status === 'simulated')
    .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  const farmersSupportedSet = new Set(
    history
      .filter((d) => d.status === 'completed' || d.status === 'simulated')
      .map((d) => d.request?.farmerName)
      .filter(Boolean)
  );
  const totalFarmersSupported = farmersSupportedSet.size;

  return (
    <div className="donor-container">
      {/* 4 Dedicated Tabs Navigation */}
      <nav className="section-nav mb-8" aria-label="Donor Portal Sections">
        <button
          type="button"
          className={`section-nav-button ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={18} />
          Donor Dashboard
        </button>
        <button
          type="button"
          className={`section-nav-button ${activeTab === 'browse' ? 'active' : ''}`}
          onClick={() => setActiveTab('browse')}
        >
          <Grid size={18} />
          Browse Requests
          {overview?.availableRequestsCount ? (
            <span className="tab-pill-badge">{overview.availableRequestsCount}</span>
          ) : null}
        </button>
        <button
          type="button"
          className={`section-nav-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={18} />
          Donation History
          {history.length ? <span className="tab-pill-badge">{history.length}</span> : null}
        </button>
        <button
          type="button"
          className={`section-nav-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <User size={18} />
          My Profile
        </button>
      </nav>

      {/* ========================================================
          SECTION 1: DONOR DASHBOARD
      ======================================================== */}
      {activeTab === 'dashboard' && (
        <section aria-labelledby="dashboard-title">
          {/* Personalized Welcome Banner */}
          <div className="donor-hero">
            <p className="eyebrow">
              <HeartHandshake size={16} /> Verified Donor Portal
            </p>
            <h1 id="dashboard-title">Welcome back, {user?.name || 'Kind Donor'}</h1>
            <p>
              Thank you for standing with Indian farmers. Every contribution you make directly funds verified crop inputs, irrigation, and seasonal agricultural necessities.
            </p>
          </div>

          {/* Genuine KPI Cards (Derived from real completed records) */}
          <div className="donor-stats-row" aria-label="Personal Donation Metrics">
            <div className="donor-stat-box">
              <div className="donor-stat-top">
                <span className="donor-stat-label">Total Amount Donated</span>
                <span className="donor-stat-icon"><IndianRupee size={18} /></span>
              </div>
              <div className="donor-stat-number text-success">
                ₹{Number(totalAmountDonated).toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-text-muted mt-2">
                Actual completed contributions made to date
              </p>
            </div>

            <div className="donor-stat-box">
              <div className="donor-stat-top">
                <span className="donor-stat-label">Farmers Supported</span>
                <span className="donor-stat-icon"><HeartHandshake size={18} /></span>
              </div>
              <div className="donor-stat-number">
                {totalFarmersSupported}
              </div>
              <p className="text-xs text-text-muted mt-2">
                Distinct verified farming families impacted
              </p>
            </div>

            <div className="donor-stat-box">
              <div className="donor-stat-top">
                <span className="donor-stat-label">Available Needs</span>
                <span className="donor-stat-icon"><FileText size={18} /></span>
              </div>
              <div className="donor-stat-number">
                {loadingOverview ? '...' : overview?.availableRequestsCount ?? 0}
              </div>
              <p className="text-xs text-text-muted mt-2">
                Verified cases awaiting community assistance
              </p>
            </div>
          </div>

          {/* Call-to-action bar */}
          <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="font-bold text-lg text-text font-serif">Ready to make an impact today?</h3>
              <p className="text-text-muted text-sm mt-0.5">
                Browse currently published requests that need urgent support before seasonal crop deadlines.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary shrink-0 inline-flex items-center gap-2"
              onClick={() => setActiveTab('browse')}
            >
              <Grid size={16} />
              <span>Browse Farmer Requests</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Recent Donation Activity */}
          <div className="p-6 rounded-2xl bg-surface border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-text font-serif">Recent Donation Activity</h3>
              {history.length > 0 && (
                <button
                  type="button"
                  className="text-xs font-semibold text-primary hover:underline"
                  onClick={() => setActiveTab('history')}
                >
                  View all ({history.length})
                </button>
              )}
            </div>

            {loadingHistory ? (
              <div className="p-8 text-center text-text-muted text-sm">
                <Clock size={24} className="animate-spin mx-auto mb-2 text-primary" />
                Loading your donation records...
              </div>
            ) : history.length === 0 ? (
              <div className="p-8 text-center bg-surface-muted rounded-xl">
                <Gift size={32} className="text-primary mx-auto mb-2 opacity-60" />
                <p className="font-bold text-text text-sm mb-1">No donation records yet</p>
                <p className="text-text-muted text-xs max-w-sm mx-auto mb-4">
                  When you contribute to any approved farmer request, your payment receipts and impact milestones will be listed here.
                </p>
                <button
                  type="button"
                  className="btn-primary text-xs py-2 inline-flex items-center gap-1.5"
                  onClick={() => setActiveTab('browse')}
                >
                  <Grid size={14} />
                  <span>Explore Requests</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {history.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-surface-muted border border-border gap-2"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-text">
                        {item.request?.title || 'Agricultural Assistance'}
                      </h4>
                      <p className="text-xs text-text-muted mt-0.5">
                        Farmer: <strong>{item.request?.farmerName || 'Verified Farmer'}</strong> &bull; {item.request?.location || 'India'} &bull; {new Date(item.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <span className="font-bold text-base text-success">
                        ₹{Number(item.amount).toLocaleString()}
                      </span>
                      <span className="status-badge verified">
                        <CheckCircle2 size={12} /> {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ========================================================
          SECTION 2: BROWSE REQUESTS
      ======================================================== */}
      {activeTab === 'browse' && (
        <section aria-labelledby="browse-section-title">
          {/* Header */}
          <div className="mb-6">
            <h2 id="browse-section-title" className="text-2xl font-bold font-serif text-text">
              Browse Verified Assistance Requests
            </h2>
            <p className="text-text-muted text-sm mt-1">
              Only requests inspected and approved by certified local verifiers are published for donations.
            </p>
          </div>

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
              <h3 style={{ margin: '8px 0 4px 0', color: 'var(--color-text)' }}>No Approved Requests Found</h3>
              <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
                There are currently no published requests matching your filter criteria. Check back soon or reset filters.
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

      {/* ========================================================
          SECTION 3: DONATION HISTORY
      ======================================================== */}
      {activeTab === 'history' && (
        <section aria-labelledby="history-section-title">
          <div className="mb-6">
            <h2 id="history-section-title" className="text-2xl font-bold font-serif text-text">
              My Contribution History
            </h2>
            <p className="text-text-muted text-sm mt-1">
              Complete, verified records of all your payments processed through Razorpay.
            </p>
          </div>

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
                You have not made any recorded donations yet. When online payment transactions are processed, your verified receipts will appear here.
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

      {/* ========================================================
          SECTION 4: MANAGE PROFILE
      ======================================================== */}
      {activeTab === 'profile' && (
        <section aria-labelledby="profile-section-title">
          <div className="mb-6">
            <h2 id="profile-section-title" className="text-2xl font-bold font-serif text-text">
              Donor Profile & Account Settings
            </h2>
            <p className="text-text-muted text-sm mt-1">
              Manage your personal information and contact preferences.
            </p>
          </div>

          <div className="max-w-2xl bg-surface p-6 sm:p-8 rounded-2xl border border-border">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
              <div className="w-16 h-16 rounded-2xl bg-primary-soft text-primary font-bold text-2xl flex items-center justify-center font-serif">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'DN'}
              </div>
              <div>
                <h3 className="font-bold text-xl text-text font-serif">{user?.name}</h3>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-soft text-primary mt-1">
                  <HeartHandshake size={12} /> Registered SevaVoice Supporter
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  disabled
                  value={user?.name || ''}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-muted text-text text-sm cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
                  Registered Mobile Phone
                </label>
                <input
                  type="tel"
                  disabled
                  value={user?.phone || ''}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-muted text-text text-sm cursor-not-allowed"
                />
                <span className="text-[11px] text-text-muted mt-1 block">
                  Primary identifier used for logging into SevaVoice
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || '—'}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-muted text-text text-sm cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
                  Preferred Language
                </label>
                <input
                  type="text"
                  disabled
                  value={user?.preferredLanguage?.toUpperCase() || 'EN'}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-muted text-text text-sm cursor-not-allowed"
                />
              </div>

              <div className="p-4 rounded-xl bg-surface-muted border border-border text-xs text-text-muted mt-6">
                <div className="flex items-center gap-2 font-bold text-text mb-1">
                  <ShieldCheck size={14} className="text-success" />
                  Account Security
                </div>
                Your donor account is protected with encrypted authentication. If you need to update your registered phone number or linked credentials, please contact support@sevavoice.org.
              </div>
            </div>
          </div>
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
            loadHistory();
          }}
        />
      )}
    </div>
  );
}
