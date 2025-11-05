import { useEffect, useState } from 'react';
import SupersetDashboard from '../components/SupersetDashboard';
import './RestrictedDashboardPage.css';

const BACKEND_URL = 'http://localhost:3001';
const DASHBOARD_SLUG = 'iceberg-demo-dashboard';

function RestrictedDashboardPage() {
  const [dashboardId, setDashboardId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardUuid() {
      try {
        const response = await fetch(
          `${BACKEND_URL}/api/superset/dashboard-embed-uuid?slug=${encodeURIComponent(DASHBOARD_SLUG)}`
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch dashboard UUID: ${response.statusText}`);
        }
        const data = await response.json();
        setDashboardId(data.uuid);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load dashboard UUID';
        setError(errorMessage);
        console.error('[RestrictedDashboardPage] Error fetching dashboard UUID:', err);
      } finally {
        setLoading(false);
      }
    }

    void fetchDashboardUuid();
  }, []);

  return (
    <div className="restricted-dashboard-page">
      <div className="restricted-dashboard-page__layout">
        <div className="restricted-dashboard-page__sidebar restricted-dashboard-page__sidebar--left">
          <h2>Left Sidebar</h2>
          <p>
            This is content on the left side of the dashboard. You can add
            filters, controls, or additional information here.
          </p>
          <div className="restricted-dashboard-page__sidebar-content">
            <h3>Quick Actions</h3>
            <ul>
              <li>Filter by date range</li>
              <li>Export data</li>
              <li>Share dashboard</li>
            </ul>
          </div>
        </div>
        <div className="restricted-dashboard-page__dashboard">
          {loading && (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              Loading dashboard...
            </div>
          )}
          {error && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
              {error}
            </div>
          )}
          {dashboardId && !loading && !error && (
            <SupersetDashboard dashboardId={dashboardId} />
          )}
        </div>
        <div className="restricted-dashboard-page__sidebar restricted-dashboard-page__sidebar--right">
          <h2>Right Sidebar</h2>
          <p>
            This is content on the right side of the dashboard. You can add
            additional information, related metrics, or other widgets here.
          </p>
          <div className="restricted-dashboard-page__sidebar-content">
            <h3>Key Metrics</h3>
            <ul>
              <li>Total users: 1,234</li>
              <li>Active sessions: 567</li>
              <li>Conversion rate: 3.2%</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="restricted-dashboard-page__content">
        <h2>Additional Content</h2>
        <p>
          This is content that appears after the dashboard. The dashboard is
          restricted in size and doesn&apos;t fill the entire page.
        </p>
        <p>
          You can add any additional information, controls, or content here that
          should be visible alongside the dashboard.
        </p>
      </div>
    </div>
  );
}

export default RestrictedDashboardPage;
