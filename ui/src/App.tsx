import SupersetDashboard from './components/SupersetDashboard';
import './App.css';

function App() {
  // Dashboard UUID - use UUID instead of numeric ID for embedded SDK
  // Get this from Superset UI: Dashboard > Settings > Embedded Dashboard
  const dashboardId = '3a504031-72ab-4f46-bfb7-277051c5919b';

  return (
    <div className="App">
      <header className="App-header">
        <h1>Superset Dashboard Embedded in React</h1>
        <p>This dashboard is embedded using @superset-ui/embedded-sdk</p>
      </header>
      <main style={{ padding: '20px', width: '100%' }}>
        <SupersetDashboard dashboardId={dashboardId} />
      </main>
    </div>
  );
}

export default App;
