import SupersetDashboard from '../components/SupersetDashboard';
import './DashboardPage.css';

function DashboardPage() {
  // Dashboard UUID - use UUID instead of numeric ID for embedded SDK
  // Get this from Superset UI: Dashboard > Settings > Embedded Dashboard
  const dashboardId = 'a9d150c3-bb84-467c-9fc6-821a3c14ccd5';

  // Calculate header height - we'll measure it dynamically
  // For now, use approximate value: header padding (40px) + h1 (~30px) + nav margin (15px) + nav buttons (~40px) + spacing
  const headerHeight = 160;

  return (
    <div className="dashboard-page">
      <SupersetDashboard dashboardId={dashboardId} offsetTop={headerHeight} />
    </div>
  );
}

export default DashboardPage;
