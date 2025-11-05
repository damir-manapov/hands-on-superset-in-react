import SupersetDashboard from './components/SupersetDashboard';
import './App.css';

function App() {
  // Dashboard UUID - use UUID instead of numeric ID for embedded SDK
  // Get this from Superset UI: Dashboard > Settings > Embedded Dashboard
  const dashboardId = '535afce7-d1d2-4774-9707-d7bc3929c8e0';

  return (
    <div className="App">
      <header className="App-header">
        <h1>Superset Dashboard Embedded in React</h1>
        <p>This dashboard is embedded using @superset-ui/embedded-sdk</p>
      </header>
      <main style={{ width: '100%', boxSizing: 'border-box' }}>
        <SupersetDashboard dashboardId={dashboardId} />
      </main>
    </div>
  );
}

export default App;
