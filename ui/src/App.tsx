import { Routes, Route } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Superset Embedded in React</h1>
        <p>This dashboard is embedded using @superset-ui/embedded-sdk</p>
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
      </Routes>
    </div>
  );
}

export default App;
