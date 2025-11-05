import { useEffect, useState } from 'react';
import SupersetDashboard from '../components/SupersetDashboard';
import './OneChartDashboardsPage.css';

const BACKEND_URL = 'http://localhost:3001';
const DASHBOARD_SLUG = 'iceberg-demo-dashboard';

function OneChartDashboardsPage() {
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
        console.error('[OneChartDashboardsPage] Error fetching dashboard UUID:', err);
      } finally {
        setLoading(false);
      }
    }

    void fetchDashboardUuid();
  }, []);

  if (loading) {
    return (
      <div className="one-chart-dashboards-page">
        <div style={{ padding: '20px', textAlign: 'center' }}>
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (error || !dashboardId) {
    return (
      <div className="one-chart-dashboards-page">
        <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
          {error || 'Dashboard UUID not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="one-chart-dashboards-page">
      <div className="one-chart-dashboards-page__container">
        <div className="one-chart-dashboards-page__dashboard-block">
          <SupersetDashboard dashboardId={dashboardId} hideControls={true} />
        </div>
        <div className="one-chart-dashboards-page__dashboard-block">
          <SupersetDashboard dashboardId={dashboardId} hideControls={true} />
        </div>
      </div>
    </div>
  );
}

export default OneChartDashboardsPage;

