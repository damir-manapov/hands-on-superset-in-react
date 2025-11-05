import { useEffect, useState } from 'react';
import SupersetDashboard from '../components/SupersetDashboard';
import './DashboardPage.css';

const BACKEND_URL = 'http://localhost:3001';
const DASHBOARD_SLUG = 'iceberg-demo-dashboard';

function DashboardPage() {
  const [dashboardId, setDashboardId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Calculate header height - we'll measure it dynamically
  // For now, use approximate value: header padding (40px) + h1 (~30px) + nav margin (15px) + nav buttons (~40px) + spacing
  const headerHeight = 160;

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
        console.error('[DashboardPage] Error fetching dashboard UUID:', err);
      } finally {
        setLoading(false);
      }
    }

    void fetchDashboardUuid();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-page">
        <div style={{ padding: '20px', textAlign: 'center' }}>
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (error || !dashboardId) {
    return (
      <div className="dashboard-page">
        <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
          {error || 'Dashboard UUID not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <SupersetDashboard dashboardId={dashboardId} offsetTop={headerHeight} />
    </div>
  );
}

export default DashboardPage;
