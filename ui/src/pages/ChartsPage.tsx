import SupersetChart from '../components/SupersetChart';
import './ChartsPage.css';

function ChartsPage() {
  // Chart IDs - replace these with actual chart IDs from your Superset instance
  // You can find chart IDs in Superset UI: Chart > Edit > Chart ID
  const chart1Id = '1'; // Replace with actual chart ID
  const chart2Id = '2'; // Replace with actual chart ID

  return (
    <div className="charts-page">
      <h1>Superset Charts</h1>
      <p className="charts-page__description">
        This page displays two Superset charts side by side.
      </p>
      <div className="charts-page__grid">
        <div className="charts-page__chart">
          <h2>Chart 1</h2>
          <SupersetChart chartId={chart1Id} height={500} />
        </div>
        <div className="charts-page__chart">
          <h2>Chart 2</h2>
          <SupersetChart chartId={chart2Id} height={500} />
        </div>
      </div>
    </div>
  );
}

export default ChartsPage;
