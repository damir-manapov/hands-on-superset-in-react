import SupersetDashboard from '../components/SupersetDashboard';
import './RestrictedDashboardPage.css';

function RestrictedDashboardPage() {
  // Dashboard UUID - use UUID instead of numeric ID for embedded SDK
  // Get this from Superset UI: Dashboard > Settings > Embedded Dashboard
  const dashboardId = '535afce7-d1d2-4774-9707-d7bc3929c8e0';

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
          <SupersetDashboard dashboardId={dashboardId} />
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
