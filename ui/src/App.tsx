import { NavLink, Routes, Route } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import RestrictedDashboardPage from './pages/RestrictedDashboardPage';
import ChartsPage from './pages/ChartsPage';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Superset Embedded in React</h1>
        <p>This dashboard is embedded using @superset-ui/embedded-sdk</p>
        <nav className="App-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/restricted"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Restricted Dashboard
          </NavLink>
          <NavLink
            to="/charts"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Charts
          </NavLink>
        </nav>
      </header>
      <Routes>
        <Route
          path="/"
          element={
            <main style={{ width: '100%', boxSizing: 'border-box' }}>
              <DashboardPage />
            </main>
          }
        />
        <Route
          path="/dashboard"
          element={
            <main style={{ width: '100%', boxSizing: 'border-box' }}>
              <DashboardPage />
            </main>
          }
        />
        <Route
          path="/restricted"
          element={
            <main style={{ width: '100%', boxSizing: 'border-box' }}>
              <RestrictedDashboardPage />
            </main>
          }
        />
        <Route
          path="/charts"
          element={
            <main style={{ width: '100%', boxSizing: 'border-box' }}>
              <ChartsPage />
            </main>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
