// charts.js - Chart.js integration and rendering
import { formatNumber } from './utils.js';

export function renderVideoStatsChart(ctx, views, likes, comments) {
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Views', 'Likes', 'Comments'],
      datasets: [{
        label: 'Stats',
        data: [views, likes, comments],
        backgroundColor: ['#c4302b', '#ffb300', '#228b22'],
        borderRadius: 12,
        barPercentage: 0.7,
        categoryPercentage: 0.7,
        maxBarThickness: 60
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: '#eee' },
          ticks: { color: '#222', font: { size: 15 } }
        },
        y: {
          grid: { display: false },
          ticks: { color: '#222', font: { size: 15 } }
        }
      }
    }
  });
}

export function renderComparisonCharts(comparedChannels) {
  if (!Array.isArray(comparedChannels) || comparedChannels.length < 2) return;
  // Remove existing charts container if present
  const old = document.getElementById('comparisonChartsContainer');
  if (old) old.remove();

  // Create charts container
  const compareSection = document.getElementById('compareSection');
  const chartsContainer = document.createElement('div');
  chartsContainer.id = 'comparisonChartsContainer';
  chartsContainer.className = 'comparison-charts-container';
  chartsContainer.innerHTML = `
    <h3>📊 Channel Comparison Charts</h3>
    <div class="comparison-charts-grid">
      <div class="comparison-chart-card">
        <h4>Subscribers</h4>
        <canvas id="subscribersComparisonChart" width="400" height="300"></canvas>
      </div>
      <div class="comparison-chart-card">
        <h4>Total Views</h4>
        <canvas id="viewsComparisonChart" width="400" height="300"></canvas>
      </div>
      <div class="comparison-chart-card">
        <h4>Video Count</h4>
        <canvas id="videosComparisonChart" width="400" height="300"></canvas>
      </div>
    </div>
  `;
  compareSection.parentNode.insertBefore(chartsContainer, compareSection.nextSibling);

  const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
    '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
  ];

  // Helper to render a chart
  function renderBarChart(canvasId, label, dataArr) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: comparedChannels.map(c => c.title),
        datasets: [{
          label,
          data: dataArr,
          backgroundColor: colors.slice(0, comparedChannels.length),
          borderRadius: 8,
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        animation: { duration: 1000, easing: 'easeInOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${label}: ${formatNumber(context.parsed.y)}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) { return formatNumber(value); }
            }
          }
        }
      }
    });
  }

  // Render all three charts
  renderBarChart('subscribersComparisonChart', 'Subscribers', comparedChannels.map(c => parseInt(c.subs)));
  renderBarChart('viewsComparisonChart', 'Total Views', comparedChannels.map(c => parseInt(c.views)));
  renderBarChart('videosComparisonChart', 'Video Count', comparedChannels.map(c => parseInt(c.videos)));
}
