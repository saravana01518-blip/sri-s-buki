import { useEffect, useState } from 'react';
import QueryAssistant from './QueryAssistant';
import { checkBukiHealth, fetchHealth } from '../services/api';

const INITIAL_MAPPINGS = [
  {
    id: 'map-1',
    bukiCategory: 'Software & Subscriptions',
    sageCode: '6240-00',
    sageName: 'SaaS & Cloud Infrastructure',
    taxMapping: 'VAT-20 (Standard)',
    status: 'mapped',
  },
  {
    id: 'map-2',
    bukiCategory: 'Airfare & Rail Travel',
    sageCode: '6410-00',
    sageName: 'Travel & Lodging Expense',
    taxMapping: 'ZERO-RATED (0%)',
    status: 'mapped',
  },
  {
    id: 'map-3',
    bukiCategory: 'Client Dining & Events',
    sageCode: '6520-00',
    sageName: 'Client Meals & Entertainment',
    taxMapping: 'US-CA-SALES (8.25%)',
    status: 'mapped',
  },
  {
    id: 'map-4',
    bukiCategory: 'External Legal Counsel',
    sageCode: '',
    sageName: 'Not assigned',
    taxMapping: '',
    status: 'unmapped',
  },
  {
    id: 'map-5',
    bukiCategory: 'Paid Search & Ads',
    sageCode: '',
    sageName: 'Not assigned',
    taxMapping: '',
    status: 'unmapped',
  },
];

const INITIAL_LOGS = [
  {
    id: 'log-1',
    timestamp: '08:34:12',
    batchId: 'EXP-2026-1184',
    vendor: 'AWS Europe',
    direction: 'Buki → Sage',
    status: 'failed',
    httpCode: 'HTTP 422',
    errorTitle: 'Tax code mismatch',
    errorDetail:
      "Sage Intacct rejected line #1: Buki tax code 'VAT-20-UK' is not mapped to active tax schedule 'US-CA-SALES' in entity US-CORP-01.",
  },
  {
    id: 'log-2',
    timestamp: '08:31:05',
    batchId: 'EXP-2026-1183',
    vendor: 'Delta Corporate',
    direction: 'Buki → Sage',
    status: 'success',
    httpCode: '',
    errorTitle: '',
    errorDetail: '',
  },
  {
    id: 'log-3',
    timestamp: '08:15:40',
    batchId: 'COA-SYNC-092',
    vendor: 'Ledger Refresh',
    direction: 'Sage → Buki',
    status: 'warning',
    httpCode: 'SYNC WARN',
    errorTitle: '2 unmapped Buki categories detected',
    errorDetail:
      'New Sage ledger accounts 6310-00 and 6750-00 were imported, but 2 Buki categories remain unmapped.',
  },
  {
    id: 'log-4',
    timestamp: '07:45:00',
    batchId: 'EXP-2026-1182',
    vendor: 'Figma Enterprise',
    direction: 'Buki → Sage',
    status: 'failed',
    httpCode: 'HTTP 409',
    errorTitle: 'Accounting period closed',
    errorDetail:
      'Posting date 2026-10-31 falls in a closed accounting period. Re-open period or override posting date to 2026-11-01.',
  },
  {
    id: 'log-5',
    timestamp: '07:00:02',
    batchId: 'BATCH-HOURLY-0700',
    vendor: '42 documents',
    direction: 'Buki → Sage',
    status: 'success',
    httpCode: '',
    errorTitle: '',
    errorDetail: '',
  },
];

const VIEW_META = {
  dashboard: {
    title: 'Integration Overview',
    subtitle: 'Monitor Sage ledger health, expense category mappings, and automated sync activity.',
  },
  assistant: {
    title: 'Buki × Sage Assistant',
    subtitle: 'Ask questions against your connected Buki & Sage workspace.',
  },
  mappings: {
    title: 'Account & Tax Mappings',
    subtitle: 'Map Buki expense categories and tax codes to your Sage Intacct Chart of Accounts.',
  },
  logs: {
    title: 'Sync Logs & Diagnostics',
    subtitle: 'Inspect batch history, diagnose Sage API errors, and retry failed transactions.',
  },
  settings: {
    title: 'Connector Settings',
    subtitle: 'Configure automated sync schedules, Sage API credentials, and webhook endpoints.',
  },
};

export default function IntegrationDashboard({ token, onUnauthorized, onSignOut }) {
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [connected, setConnected] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [healthInfo, setHealthInfo] = useState(null);

  const [totalDocs, setTotalDocs] = useState(14826);
  const [pendingDocs, setPendingDocs] = useState(18);
  const [lastSynced, setLastSynced] = useState('Nov 25, 2026 · 08:34:12 PST');

  const [mappings, setMappings] = useState(INITIAL_MAPPINGS);
  const [mappingSearch, setMappingSearch] = useState('');
  const [mappingFilter, setMappingFilter] = useState('all');
  const [editingMapping, setEditingMapping] = useState(null);
  const [drawerAccount, setDrawerAccount] = useState('');
  const [drawerTaxCode, setDrawerTaxCode] = useState('');

  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [logsFilter, setLogsFilter] = useState('all');
  const [expandedLogIds, setExpandedLogIds] = useState(() => new Set(['log-1']));

  const [toggles, setToggles] = useState({ realtime: true, hourly: true, daily: false });
  const [showSecret, setShowSecret] = useState(false);

  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchHealth()
      .then((data) => setHealthInfo(data))
      .catch(() => {});
  }, []);

  function showToast(message, tone = 'success') {
    setToast({ message, tone });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  }

  function handleSyncNow() {
    if (!connected) {
      showToast('Reconnect to Sage Intacct before running a manual sync.', 'warning');
      return;
    }
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      const now = new Date();
      const ts = now.toTimeString().slice(0, 8);
      setLastSynced(`Nov 25, 2026 · ${ts} PST`);
      setTotalDocs((prev) => prev + pendingDocs);
      setPendingDocs(0);
      showToast(`Synced ${pendingDocs} queued documents to Sage Intacct.`, 'success');
    }, 800);
  }

  async function handleTestConnection() {
    if (!connected) {
      showToast('Connection test failed: integration is currently disconnected.', 'error');
      return;
    }
    setTestingConn(true);
    try {
      const res = await checkBukiHealth(token);
      showToast(
        `Connected to ${res.target} (status: ${res.upstream?.status || 'ok'}).`,
        'success'
      );
    } catch (err) {
      if (err.status === 401) {
        onUnauthorized(err.message);
        return;
      }
      showToast(err.message || 'Failed to reach upstream Buki backend.', 'error');
    } finally {
      setTestingConn(false);
    }
  }

  function handleToggleConnect() {
    setConnected((prev) => {
      const next = !prev;
      showToast(
        next
          ? 'Reconnected to Sage Intacct (US-CORP-01).'
          : 'Disconnected from Sage Intacct. Automated sync paused.',
        next ? 'success' : 'warning'
      );
      return next;
    });
  }

  function openMappingDrawer(item) {
    setEditingMapping(item);
    setDrawerAccount(item.sageCode ? `${item.sageCode}|${item.sageName}` : '');
    setDrawerTaxCode(item.taxMapping || '');
  }

  function saveMappingDrawer() {
    if (!editingMapping) return;
    setMappings((prev) =>
      prev.map((m) => {
        if (m.id !== editingMapping.id) return m;
        if (drawerAccount) {
          const [code, name] = drawerAccount.split('|');
          showToast(`Mapped "${m.bukiCategory}" to ${code}.`, 'success');
          return {
            ...m,
            sageCode: code,
            sageName: name,
            taxMapping: drawerTaxCode || 'TAX-EXEMPT (0%)',
            status: 'mapped',
          };
        }
        showToast(`Cleared mapping for "${m.bukiCategory}".`, 'warning');
        return {
          ...m,
          sageCode: '',
          sageName: 'Not assigned',
          taxMapping: '',
          status: 'unmapped',
        };
      })
    );
    setEditingMapping(null);
  }

  function retryLog(id) {
    setLogs((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, status: 'success', httpCode: '', errorTitle: '', errorDetail: '' } : l
      )
    );
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    const target = logs.find((l) => l.id === id);
    if (target) showToast(`Retried "${target.batchId}" — posted to Sage Intacct.`, 'success');
  }

  const unmappedCount = mappings.filter((m) => m.status === 'unmapped').length;
  const failedCount = logs.filter((l) => l.status === 'failed').length;

  const filteredMappings = mappings.filter((m) => {
    const matchesStatus = mappingFilter === 'all' || m.status === mappingFilter;
    const q = mappingSearch.trim().toLowerCase();
    const matchesQuery =
      !q ||
      m.bukiCategory.toLowerCase().includes(q) ||
      m.sageCode.toLowerCase().includes(q) ||
      m.sageName.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const filteredLogs = logs.filter((l) => logsFilter === 'all' || l.status === logsFilter);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'assistant', label: 'Sage Assistant', icon: 'sparkles' },
    { id: 'mappings', label: 'Mappings', icon: 'account_tree', badge: unmappedCount, badgeTone: 'warning' },
    { id: 'logs', label: 'Sync Logs', icon: 'receipt_long', badge: failedCount, badgeTone: 'error' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  const meta = VIEW_META[activeView];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-light-surface text-light-on-surface font-body antialiased">
      {/* Mobile Top Bar */}
      <header className="md:hidden flex items-center justify-between px-gutter-lg py-gutter-md bg-light-surface-container-lowest border-b border-light-outline-variant sticky top-0 z-30">
        <div className="flex items-center gap-gutter-sm">
          <div className="w-8 h-8 rounded-sm bg-light-primary text-light-on-primary flex items-center justify-center font-headline text-[15px] font-semibold">
            B
          </div>
          <div className="flex flex-col">
            <span className="font-headline text-[15px] font-semibold">Buki Sage Connector</span>
            <span className="font-mono text-[12px] text-light-on-surface-variant">v2.4 · Intacct</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Toggle navigation menu"
          className="p-gutter-sm rounded-sm text-light-on-surface-variant hover:bg-light-surface-container"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>
      </header>

      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-light-scrim/40 z-30 md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen ${
          sidebarCollapsed ? 'w-[68px]' : 'w-60'
        } bg-light-surface-container-lowest border-r border-light-outline-variant flex flex-col justify-between transition-all duration-150 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } shrink-0`}
      >
        <div className="flex flex-col gap-gutter-lg p-gutter-lg">
          <div className="flex items-center justify-between gap-gutter-sm">
            <div className="flex items-center gap-gutter-md overflow-hidden">
              <div className="w-8 h-8 shrink-0 rounded-sm bg-light-primary text-light-on-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">sync_alt</span>
              </div>
              {!sidebarCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="font-headline text-[15px] font-semibold truncate">Buki × Sage</span>
                  <span className="font-mono text-[12px] text-light-on-surface-variant truncate">
                    Connector v2.4
                  </span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              aria-label="Collapse sidebar"
              className="hidden md:inline-flex p-gutter-xs rounded-sm text-light-outline hover:bg-light-surface-container"
            >
              <span className="material-symbols-outlined text-[20px]">
                {sidebarCollapsed ? 'chevron_right' : 'chevron_left'}
              </span>
            </button>
          </div>

          <nav className="flex flex-col gap-gutter-xs" aria-label="Dashboard sections">
            {navItems.map((item) => {
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveView(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between gap-gutter-md px-gutter-md py-gutter-sm rounded-sm text-[13px] font-medium transition-colors text-left ${
                    active
                      ? 'bg-light-primary-container text-light-on-primary-container'
                      : 'text-light-on-surface-variant hover:bg-light-surface-container hover:text-light-on-surface'
                  }`}
                >
                  <span className="flex items-center gap-gutter-md">
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </span>
                  {!sidebarCollapsed && item.badge > 0 && (
                    <span
                      className={`px-gutter-xs py-0.5 rounded-full font-mono text-[11px] font-semibold ${
                        item.badgeTone === 'error'
                          ? 'bg-light-error-container text-light-on-error-container'
                          : 'bg-warning-container text-on-warning-container'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-gutter-lg border-t border-light-outline-variant flex items-center justify-between gap-gutter-sm">
          <div className="flex items-center gap-gutter-md min-w-0">
            <div className="w-8 h-8 shrink-0 rounded-full bg-light-surface-container flex items-center justify-center text-[11px] font-semibold border border-light-outline-variant">
              AC
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-medium truncate">Acme Finance Ltd</span>
                <span className="font-mono text-[12px] text-light-on-surface-variant truncate">
                  {healthInfo?.bukiUrl ? new URL(healthInfo.bukiUrl).host : 'US-CORP-01'}
                </span>
              </div>
            )}
          </div>
          {!sidebarCollapsed && onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              title="Sign out"
              className="p-1.5 rounded-sm text-light-outline hover:text-light-error hover:bg-light-error-container"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto px-gutter-lg md:px-page-margin py-gutter-xl flex flex-col gap-gutter-xl">
          {/* Header + Top Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-gutter-md">
            <div className="flex flex-col gap-gutter-xs">
              <h1 className="font-headline text-[24px] font-semibold tracking-tight">{meta.title}</h1>
              <p className="text-[14px] text-light-on-surface-variant">{meta.subtitle}</p>
            </div>
            <div className="inline-flex flex-wrap items-center p-gutter-xs rounded-sm bg-light-surface-container border border-light-outline-variant self-start">
              {[
                { id: 'dashboard', label: 'Overview' },
                { id: 'assistant', label: 'Sage Assistant' },
                { id: 'mappings', label: 'Mappings' },
                { id: 'logs', label: 'Sync Logs' },
                { id: 'settings', label: 'Settings' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveView(t.id)}
                  className={`px-gutter-md py-gutter-xs rounded-xs text-[13px] font-medium transition-colors ${
                    activeView === t.id
                      ? 'bg-light-surface-container-lowest text-light-on-surface shadow-sm'
                      : 'text-light-on-surface-variant hover:text-light-on-surface'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {toast && (
            <div
              role="status"
              className="flex items-center justify-between gap-gutter-md px-gutter-lg py-gutter-md rounded bg-light-inverse-surface text-light-inverse-on-surface"
            >
              <div className="flex items-center gap-gutter-sm">
                <span
                  className={`material-symbols-outlined text-[18px] ${
                    toast.tone === 'error'
                      ? 'text-light-error'
                      : toast.tone === 'warning'
                        ? 'text-warning'
                        : 'text-success'
                  }`}
                >
                  {toast.tone === 'error' ? 'error' : toast.tone === 'warning' ? 'warning' : 'check_circle'}
                </span>
                <span className="text-[14px]">{toast.message}</span>
              </div>
              <button type="button" onClick={() => setToast(null)} aria-label="Dismiss notification">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          )}

          {/* Assistant View */}
          {activeView === 'assistant' && (
            <div className="bg-light-surface-container-lowest border border-light-outline-variant rounded overflow-hidden">
              <QueryAssistant token={token} onUnauthorized={onUnauthorized} onSignOut={onSignOut} />
            </div>
          )}

          {/* Overview Section */}
          {activeView === 'dashboard' && (
            <section className="flex flex-col gap-gutter-xl">
              <div className="bg-light-surface-container-lowest border border-light-outline-variant rounded p-gutter-xl flex flex-col lg:flex-row lg:items-center justify-between gap-gutter-lg">
                <div className="flex items-start sm:items-center gap-gutter-lg">
                  <div
                    className={`w-11 h-11 shrink-0 rounded flex items-center justify-center ${
                      connected
                        ? 'bg-success-container text-on-success-container'
                        : 'bg-light-error-container text-light-on-error-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[22px]">
                      {connected ? 'link' : 'link_off'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-gutter-xs">
                    <div className="flex flex-wrap items-center gap-gutter-sm">
                      <span
                        className={`inline-flex items-center gap-gutter-xs px-gutter-sm py-gutter-xs rounded-full text-[11px] font-semibold ${
                          connected
                            ? 'bg-success-container text-on-success-container'
                            : 'bg-light-error-container text-light-on-error-container'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-current" />
                        <span>{connected ? 'Connected' : 'Disconnected'}</span>
                      </span>
                      <h2 className="font-headline text-[18px] font-semibold">
                        Sage Intacct · {healthInfo?.bukiUrl || 'https://my-buki.onrender.com'}
                      </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-gutter-md text-[13px] text-light-on-surface-variant">
                      <span>
                        Last synced <span className="font-mono text-[12px] text-light-on-surface">{lastSynced}</span>
                      </span>
                      <span className="hidden sm:inline text-light-outline-variant">|</span>
                      <span>
                        Mode:{' '}
                        <span className="font-mono text-[12px] text-light-on-surface">
                          {healthInfo?.sageMode || 'buki-upstream'}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-gutter-sm">
                  <button
                    type="button"
                    onClick={handleSyncNow}
                    disabled={syncing}
                    className="inline-flex items-center gap-gutter-sm px-gutter-lg py-gutter-sm rounded-sm bg-light-primary text-light-on-primary text-[13px] font-medium hover:opacity-90"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${syncing ? 'animate-spin' : ''}`}>
                      sync
                    </span>
                    <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingConn}
                    className="inline-flex items-center gap-gutter-sm px-gutter-lg py-gutter-sm rounded-sm bg-light-surface-container-lowest border border-light-outline-variant text-[13px] font-medium hover:bg-light-surface-container"
                  >
                    <span className="material-symbols-outlined text-[18px] text-light-on-surface-variant">speed</span>
                    <span>{testingConn ? 'Testing...' : 'Test Connection'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleConnect}
                    className="inline-flex items-center gap-gutter-sm px-gutter-lg py-gutter-sm rounded-sm bg-light-surface-container-lowest text-light-error border border-light-outline-variant text-[13px] font-medium hover:bg-light-error-container"
                  >
                    <span className="material-symbols-outlined text-[18px]">link_off</span>
                    <span>{connected ? 'Disconnect' : 'Reconnect'}</span>
                  </button>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter-lg">
                <article className="bg-light-surface-container-lowest border border-light-outline-variant rounded p-gutter-xl flex flex-col justify-between gap-gutter-md">
                  <header className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-light-on-surface-variant">
                      Total Documents Processed
                    </span>
                    <span className="material-symbols-outlined text-[20px] text-light-outline">description</span>
                  </header>
                  <div className="flex items-baseline justify-between">
                    <p className="font-mono text-[32px] font-bold tabular-nums">{totalDocs.toLocaleString()}</p>
                    <span className="inline-flex items-center gap-1 px-gutter-sm py-0.5 rounded-full bg-success-container text-on-success-container font-mono text-[11px] font-semibold">
                      +12.4%
                    </span>
                  </div>
                  <p className="text-[13px] text-light-outline">Invoices, receipts &amp; credit notes synced MTD</p>
                </article>

                <article className="bg-light-surface-container-lowest border border-light-outline-variant rounded p-gutter-xl flex flex-col justify-between gap-gutter-md">
                  <header className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-light-on-surface-variant">Pending Syncs</span>
                    <span className="material-symbols-outlined text-[20px] text-warning">schedule</span>
                  </header>
                  <div className="flex items-baseline justify-between">
                    <p className="font-mono text-[32px] font-bold tabular-nums">{pendingDocs}</p>
                    <span className="px-gutter-sm py-0.5 rounded-full bg-warning-container text-on-warning-container text-[11px] font-semibold">
                      Queued
                    </span>
                  </div>
                  <p className="text-[13px] text-light-outline">Awaiting next hourly batch or manual trigger</p>
                </article>

                <article className="bg-light-surface-container-lowest border border-light-outline-variant rounded p-gutter-xl flex flex-col justify-between gap-gutter-md">
                  <header className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-light-on-surface-variant">
                      Failed Transactions Today
                    </span>
                    <span className="material-symbols-outlined text-[20px] text-light-error">error</span>
                  </header>
                  <div className="flex items-baseline justify-between">
                    <p className="font-mono text-[32px] font-bold tabular-nums">{failedCount}</p>
                    <span className="px-gutter-sm py-0.5 rounded-full bg-light-error-container text-light-on-error-container text-[11px] font-semibold">
                      Action needed
                    </span>
                  </div>
                  <p className="text-[13px] text-light-outline">Review tax mismatches in Sync Logs below</p>
                </article>
              </div>
            </section>
          )}

          {/* Mappings Section */}
          {(activeView === 'dashboard' || activeView === 'mappings') && (
            <section className="flex flex-col gap-gutter-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-gutter-md">
                <div>
                  <h2 className="font-headline text-[18px] font-semibold">Account &amp; Tax Mappings</h2>
                  <p className="text-[13px] text-light-on-surface-variant">
                    Click any row to map Buki expense categories and tax codes to Sage Ledger Accounts.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-gutter-sm">
                  <input
                    type="search"
                    value={mappingSearch}
                    onChange={(e) => setMappingSearch(e.target.value)}
                    placeholder="Filter categories or codes..."
                    className="px-gutter-md py-gutter-sm rounded-sm bg-light-surface-container-lowest border border-light-outline-variant text-[13px] w-56"
                  />
                  <select
                    value={mappingFilter}
                    onChange={(e) => setMappingFilter(e.target.value)}
                    className="px-gutter-md py-gutter-sm rounded-sm bg-light-surface-container-lowest border border-light-outline-variant text-[13px]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="mapped">Mapped</option>
                    <option value="unmapped">Unmapped</option>
                  </select>
                </div>
              </div>

              <div className="bg-light-surface-container-lowest border border-light-outline-variant rounded overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-light-surface-container-low border-b border-light-outline-variant">
                      <tr>
                        <th className="px-gutter-lg py-gutter-md text-[11px] font-semibold text-light-on-surface-variant uppercase">
                          Buki Category
                        </th>
                        <th className="px-gutter-lg py-gutter-md text-[11px] font-semibold text-light-on-surface-variant uppercase">
                          Sage Account Code
                        </th>
                        <th className="px-gutter-lg py-gutter-md text-[11px] font-semibold text-light-on-surface-variant uppercase">
                          Sage Account Name
                        </th>
                        <th className="px-gutter-lg py-gutter-md text-[11px] font-semibold text-light-on-surface-variant uppercase">
                          Tax Mapping
                        </th>
                        <th className="px-gutter-lg py-gutter-md text-[11px] font-semibold text-light-on-surface-variant uppercase">
                          Status
                        </th>
                        <th className="px-gutter-lg py-gutter-md text-[11px] font-semibold text-light-on-surface-variant uppercase text-right">
                          Edit
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-light-outline-variant">
                      {filteredMappings.map((m) => (
                        <tr
                          key={m.id}
                          onClick={() => openMappingDrawer(m)}
                          className="hover:bg-light-surface-container-low cursor-pointer"
                        >
                          <td className="px-gutter-lg py-gutter-md text-[14px] font-medium">{m.bukiCategory}</td>
                          <td className="px-gutter-lg py-gutter-md font-mono text-[13px]">{m.sageCode || '—'}</td>
                          <td className="px-gutter-lg py-gutter-md text-[14px] text-light-on-surface-variant">
                            {m.sageName}
                          </td>
                          <td className="px-gutter-lg py-gutter-md font-mono text-[12px] text-light-on-surface-variant">
                            {m.taxMapping || 'Unassigned'}
                          </td>
                          <td className="px-gutter-lg py-gutter-md">
                            <span
                              className={`inline-flex items-center px-gutter-sm py-0.5 rounded-full text-[11px] font-semibold ${
                                m.status === 'mapped'
                                  ? 'bg-success-container text-on-success-container'
                                  : 'bg-warning-container text-on-warning-container'
                              }`}
                            >
                              {m.status === 'mapped' ? 'Mapped' : 'Unmapped'}
                            </span>
                          </td>
                          <td className="px-gutter-lg py-gutter-md text-right text-[13px] text-light-primary font-medium">
                            {m.status === 'mapped' ? 'Edit' : 'Map'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* Sync Logs Section */}
          {(activeView === 'dashboard' || activeView === 'logs') && (
            <section className="flex flex-col gap-gutter-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-gutter-md">
                <div>
                  <h2 className="font-headline text-[18px] font-semibold">Sync Logs &amp; Error Handling</h2>
                  <p className="text-[13px] text-light-on-surface-variant">
                    Recent ledger synchronization batches. Expand failed rows to inspect diagnostics and retry.
                  </p>
                </div>
                <select
                  value={logsFilter}
                  onChange={(e) => setLogsFilter(e.target.value)}
                  className="px-gutter-md py-gutter-sm rounded-sm bg-light-surface-container-lowest border border-light-outline-variant text-[13px] self-start"
                >
                  <option value="all">All Events</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div className="bg-light-surface-container-lowest border border-light-outline-variant rounded overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-light-surface-container-low border-b border-light-outline-variant">
                      <tr>
                        <th className="px-gutter-lg py-gutter-md text-[11px] font-semibold text-light-on-surface-variant uppercase">
                          Timestamp
                        </th>
                        <th className="px-gutter-lg py-gutter-md text-[11px] font-semibold text-light-on-surface-variant uppercase">
                          Batch / Document
                        </th>
                        <th className="px-gutter-lg py-gutter-md text-[11px] font-semibold text-light-on-surface-variant uppercase">
                          Direction
                        </th>
                        <th className="px-gutter-lg py-gutter-md text-[11px] font-semibold text-light-on-surface-variant uppercase">
                          Status
                        </th>
                        <th className="px-gutter-lg py-gutter-md text-[11px] font-semibold text-light-on-surface-variant uppercase text-right">
                          Details
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-light-outline-variant">
                      {filteredLogs.map((log) => {
                        const hasError = log.status === 'failed' || log.status === 'warning';
                        const isExpanded = expandedLogIds.has(log.id);
                        return (
                          <>
                            <tr
                              key={log.id}
                              onClick={() => {
                                if (!hasError) return;
                                setExpandedLogIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(log.id)) next.delete(log.id);
                                  else next.add(log.id);
                                  return next;
                                });
                              }}
                              className={hasError ? 'cursor-pointer hover:bg-light-surface-container-low' : ''}
                            >
                              <td className="px-gutter-lg py-gutter-md font-mono text-[12px] text-light-outline">
                                {log.timestamp}
                              </td>
                              <td className="px-gutter-lg py-gutter-md text-[14px]">
                                <span className="font-mono text-[13px] font-medium">{log.batchId}</span> ·{' '}
                                <span className="text-light-on-surface-variant">{log.vendor}</span>
                              </td>
                              <td className="px-gutter-lg py-gutter-md font-mono text-[12px] text-light-on-surface-variant">
                                {log.direction}
                              </td>
                              <td className="px-gutter-lg py-gutter-md">
                                <span
                                  className={`inline-flex px-gutter-sm py-0.5 rounded-full text-[11px] font-semibold ${
                                    log.status === 'success'
                                      ? 'bg-success-container text-on-success-container'
                                      : log.status === 'warning'
                                        ? 'bg-warning-container text-on-warning-container'
                                        : 'bg-light-error-container text-light-on-error-container'
                                  }`}
                                >
                                  {log.status}
                                </span>
                              </td>
                              <td className="px-gutter-lg py-gutter-md text-right text-[13px]">
                                {hasError ? (isExpanded ? 'Hide' : 'Inspect') : '—'}
                              </td>
                            </tr>
                            {hasError && isExpanded && (
                              <tr key={`${log.id}-detail`} className="bg-light-surface-container-low">
                                <td colSpan={5} className="px-gutter-lg py-gutter-md">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-gutter-lg p-gutter-lg rounded bg-light-surface-container-lowest border border-light-outline-variant">
                                    <div className="flex flex-col gap-gutter-sm">
                                      <div className="flex items-center gap-gutter-sm">
                                        <span className="px-gutter-sm py-0.5 rounded-xs font-mono text-[12px] bg-light-error-container text-light-on-error-container">
                                          {log.httpCode}
                                        </span>
                                        <span className="text-[15px] font-semibold">{log.errorTitle}</span>
                                      </div>
                                      <div className="px-gutter-md py-gutter-sm rounded-xs bg-light-surface-container-low border border-light-outline-variant font-mono text-[12px] text-light-on-surface-variant">
                                        {log.errorDetail}
                                      </div>
                                    </div>
                                    {log.status === 'failed' && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          retryLog(log.id);
                                        }}
                                        className="shrink-0 inline-flex items-center gap-gutter-xs px-gutter-lg py-gutter-sm rounded-sm bg-light-primary text-light-on-primary text-[13px] font-medium"
                                      >
                                        <span className="material-symbols-outlined text-[18px]">refresh</span>
                                        <span>Retry Sync</span>
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* Settings Section */}
          {activeView === 'settings' && (
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-gutter-xl items-start">
              <div className="bg-light-surface-container-lowest border border-light-outline-variant rounded p-gutter-xl flex flex-col gap-gutter-lg">
                <div className="border-b border-light-outline-variant pb-gutter-md">
                  <h2 className="font-headline text-[18px] font-semibold">Automated Sync Frequency</h2>
                  <p className="text-[13px] text-light-on-surface-variant">
                    Control how often Buki pushes approved expenses and pulls Sage chart-of-accounts updates.
                  </p>
                </div>
                {[
                  {
                    key: 'realtime',
                    label: 'Real-time Sync',
                    desc: 'Push approved Buki transactions to Sage immediately via webhook.',
                  },
                  {
                    key: 'hourly',
                    label: 'Hourly Batch Reconciliation',
                    desc: 'Verify ledger totals and sync pending items at the top of each hour.',
                  },
                  {
                    key: 'daily',
                    label: 'Daily Ledger Digest',
                    desc: 'Full chart-of-accounts refresh and EOD summary at 23:00 UTC.',
                  },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-gutter-lg py-gutter-sm">
                    <div>
                      <div className="text-[14px] font-medium">{item.label}</div>
                      <div className="text-[13px] text-light-on-surface-variant">{item.desc}</div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={toggles[item.key]}
                      onClick={() => setToggles((p) => ({ ...p, [item.key]: !p[item.key] }))}
                      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                        toggles[item.key] ? 'bg-light-primary' : 'bg-light-surface-container-highest'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                          toggles[item.key] ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  showToast('Sage API credentials and webhook configuration saved.', 'success');
                }}
                className="bg-light-surface-container-lowest border border-light-outline-variant rounded p-gutter-xl flex flex-col gap-gutter-lg"
              >
                <div className="border-b border-light-outline-variant pb-gutter-md">
                  <h2 className="font-headline text-[18px] font-semibold">Sage API Credentials &amp; Webhooks</h2>
                  <p className="text-[13px] text-light-on-surface-variant">
                    Target Buki URL: <span className="font-mono">{healthInfo?.bukiUrl || 'https://my-buki.onrender.com'}</span>
                  </p>
                </div>
                <label className="flex flex-col gap-gutter-xs">
                  <span className="text-[13px] font-medium">API Client Secret</span>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      defaultValue="sk_live_sage_98a7f6d4c2b10e4a"
                      className="w-full pl-gutter-md pr-10 py-gutter-sm rounded-sm border border-light-outline-variant font-mono text-[13px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret((s) => !s)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-light-outline"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showSecret ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </label>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-gutter-lg py-gutter-sm rounded-sm bg-light-primary text-light-on-primary text-[13px] font-medium"
                  >
                    Save Configuration
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
      </main>

      {/* Edit Mapping Drawer */}
      {editingMapping && (
        <>
          <div onClick={() => setEditingMapping(null)} className="fixed inset-0 bg-light-scrim/40 z-50" />
          <aside
            role="dialog"
            aria-modal="true"
            className="fixed top-0 right-0 z-50 h-screen w-full max-w-md bg-light-surface-container-lowest border-l border-light-outline-variant shadow-xl flex flex-col justify-between"
          >
            <div className="p-gutter-xl flex flex-col gap-gutter-xl">
              <div className="flex items-start justify-between border-b border-light-outline-variant pb-gutter-lg">
                <div>
                  <span className="text-[11px] font-semibold text-light-primary uppercase">Edit Ledger Mapping</span>
                  <h2 className="font-headline text-[18px] font-semibold">{editingMapping.bukiCategory}</h2>
                </div>
                <button type="button" onClick={() => setEditingMapping(null)}>
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              <div className="flex flex-col gap-gutter-lg">
                <label className="flex flex-col gap-gutter-xs">
                  <span className="text-[13px] font-medium">Sage Ledger Account</span>
                  <select
                    value={drawerAccount}
                    onChange={(e) => setDrawerAccount(e.target.value)}
                    className="w-full px-gutter-md py-gutter-sm rounded-sm border border-light-outline-variant text-[14px]"
                  >
                    <option value="">— Select Sage Ledger Account —</option>
                    <option value="6240-00|SaaS & Cloud Infrastructure">6240-00 · SaaS &amp; Cloud Infrastructure</option>
                    <option value="6410-00|Travel & Lodging Expense">6410-00 · Travel &amp; Lodging Expense</option>
                    <option value="6520-00|Client Meals & Entertainment">6520-00 · Client Meals &amp; Entertainment</option>
                    <option value="6750-00|Professional & Legal Fees">6750-00 · Professional &amp; Legal Fees</option>
                    <option value="6310-00|Marketing & Paid Acquisition">6310-00 · Marketing &amp; Paid Acquisition</option>
                  </select>
                </label>
                <label className="flex flex-col gap-gutter-xs">
                  <span className="text-[13px] font-medium">Sage Tax Code</span>
                  <select
                    value={drawerTaxCode}
                    onChange={(e) => setDrawerTaxCode(e.target.value)}
                    className="w-full px-gutter-md py-gutter-sm rounded-sm border border-light-outline-variant font-mono text-[13px]"
                  >
                    <option value="">— Unassigned —</option>
                    <option value="VAT-20 (Standard)">VAT-20 (Standard)</option>
                    <option value="US-CA-SALES (8.25%)">US-CA-SALES (8.25%)</option>
                    <option value="TAX-EXEMPT (0%)">TAX-EXEMPT (0%)</option>
                    <option value="ZERO-RATED (0%)">ZERO-RATED (0%)</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="p-gutter-xl border-t border-light-outline-variant bg-light-surface-container-low flex justify-end gap-gutter-sm">
              <button
                type="button"
                onClick={() => setEditingMapping(null)}
                className="px-gutter-lg py-gutter-sm rounded-sm border border-light-outline-variant text-[13px] font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveMappingDrawer}
                className="px-gutter-lg py-gutter-sm rounded-sm bg-light-primary text-light-on-primary text-[13px] font-medium"
              >
                Save Mapping
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
