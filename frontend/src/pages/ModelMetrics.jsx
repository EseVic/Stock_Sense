import { useState, useEffect } from 'react'
import axios from 'axios'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
         BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts'
import './ModelMetrics.css'

const TASK_LABELS = {
  expiry_risk:         'Expiry Risk',
  sales_velocity:      'Sales Velocity',
  customer_preference: 'Customer Preference',
  slow_mover:          'Slow Mover Detection',
}

const GREEN = '#1B7A5A'
const AMBER = '#C47D0E'

function MetricBadge({ value, threshold=0.80 }) {
  const pct = Math.round(value * 100)
  const color = pct >= threshold*100 ? GREEN : pct >= 70 ? AMBER : '#C0392B'
  return <span className="metric-badge" style={{ background: color+'18', color }}>{pct}%</span>
}

function TaskCard({ task, data }) {
  const dt = data.decision_tree
  const lr = data.logistic_regression
  const winner = data.best_model

  const radarData = [
    { metric: 'Accuracy', DT: Math.round(dt.accuracy*100), LR: Math.round(lr.accuracy*100) },
    { metric: 'F1 Score', DT: Math.round(dt.f1_weighted*100), LR: Math.round(lr.f1_weighted*100) },
    { metric: 'Precision', DT: Math.round((dt.report?.['weighted avg']?.precision||0)*100), LR: Math.round((lr.report?.['weighted avg']?.precision||0)*100) },
    { metric: 'Recall', DT: Math.round((dt.report?.['weighted avg']?.recall||0)*100), LR: Math.round((lr.report?.['weighted avg']?.recall||0)*100) },
  ]

  const classRows = data.classes || []

  return (
    <div className="task-card">
      <div className="task-hd">
        <h3 className="task-title">{TASK_LABELS[task] || task}</h3>
        <div className="task-winner">
          Best model: <strong>{winner}</strong>
        </div>
      </div>

      <div className="task-body">
        {/* Summary metrics */}
        <div className="model-compare">
          {[['Decision Tree', dt, 'dt'], ['Logistic Regression', lr, 'lr']].map(([name, m, key]) => (
            <div key={key} className={`model-col${winner===name?' model-winner':''}`}>
              <div className="model-name">
                {name}
                {winner === name && <span className="winner-tag">✓ Best</span>}
              </div>
              <div className="model-metrics">
                <div className="mm-row">
                  <span className="mm-label">Accuracy</span>
                  <MetricBadge value={m.accuracy} />
                </div>
                <div className="mm-row">
                  <span className="mm-label">F1 Score</span>
                  <MetricBadge value={m.f1_weighted} />
                </div>
                <div className="mm-row">
                  <span className="mm-label">Precision</span>
                  <MetricBadge value={m.report?.['weighted avg']?.precision||0} />
                </div>
                <div className="mm-row">
                  <span className="mm-label">Recall</span>
                  <MetricBadge value={m.report?.['weighted avg']?.recall||0} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Radar chart */}
        <div className="radar-wrap">
          <p className="chart-sub">DT vs LR comparison</p>
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
              <Radar name="Decision Tree" dataKey="DT" stroke={GREEN} fill={GREEN} fillOpacity={0.15} strokeWidth={2} />
              <Radar name="Log. Regression" dataKey="LR" stroke={AMBER} fill={AMBER} fillOpacity={0.1} strokeWidth={2} strokeDasharray="4 2" />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Tooltip formatter={v => v + '%'} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Per-class breakdown */}
        {classRows.length > 0 && (
          <div className="class-table-wrap">
            <p className="chart-sub">Per-class F1 scores (Decision Tree)</p>
            <table className="class-table">
              <thead>
                <tr><th>Class</th><th>Precision</th><th>Recall</th><th>F1</th><th>Support</th></tr>
              </thead>
              <tbody>
                {classRows.map(cls => {
                  const row = dt.report?.[cls]
                  if (!row) return null
                  return (
                    <tr key={cls}>
                      <td><span className="class-label">{cls}</span></td>
                      <td><MetricBadge value={row.precision||0} threshold={0.7} /></td>
                      <td><MetricBadge value={row.recall||0} threshold={0.7} /></td>
                      <td><MetricBadge value={row['f1-score']||0} threshold={0.7} /></td>
                      <td className="td-support">{row.support}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ModelMetrics() {
  const [metrics,  setMetrics]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [training, setTraining] = useState(false)
  const [error,    setError]    = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try {
      const r = await axios.get('/api/metrics')
      setMetrics(r.data)
    } catch (e) {
      setError('ML service is not running or models have not been trained yet.')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const train = async () => {
    setTraining(true); setError('')
    try {
      await axios.post('/api/train')
      await load()
    } catch (e) {
      setError('Training failed: ' + (e.response?.data?.error || e.message))
    } finally { setTraining(false) }
  }

  const tasks = metrics ? Object.keys(TASK_LABELS).filter(k => metrics[k]) : []

  // Overall summary bar chart data
  const summaryData = tasks.map(task => ({
    name: TASK_LABELS[task].replace(' ', '\n'),
    'DT Accuracy':  Math.round((metrics[task]?.decision_tree?.accuracy || 0) * 100),
    'LR Accuracy':  Math.round((metrics[task]?.logistic_regression?.accuracy || 0) * 100),
  }))

  return (
    <div className="metrics-page">
      <div className="page-hd">
        <div>
          <h1 className="page-title">Model Metrics</h1>
          <p className="page-sub">Performance evaluation — Decision Tree vs Logistic Regression</p>
        </div>
        <button className="train-btn" onClick={train} disabled={training}>
          {training ? '⟳ Training…' : '▶ Train / Retrain models'}
        </button>
      </div>

      {error && (
        <div className="metrics-error">
          <strong>⚠️ {error}</strong>
          <p>Make sure the ML service is running: <code>python app.py</code> in the ml-service folder</p>
          <p>Then click "Train / Retrain models" above.</p>
        </div>
      )}

      {loading && <div className="loading">Loading metrics…</div>}

      {!loading && metrics && tasks.length > 0 && (
        <>
          {/* Overall comparison bar chart */}
          <div className="overview-card">
            <h3 className="chart-title">Overall accuracy — all tasks</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={summaryData} margin={{ left: 0, right: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tickFormatter={v => v + '%'} tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => v + '%'} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="DT Accuracy" fill={GREEN} radius={[4,4,0,0]} />
                <Bar dataKey="LR Accuracy" fill={AMBER} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
            {metrics.trained_at && (
              <p className="trained-at">Last trained: {new Date(metrics.trained_at).toLocaleString()}</p>
            )}
          </div>

          {/* Per-task cards */}
          <div className="task-grid">
            {tasks.map(task => (
              <TaskCard key={task} task={task} data={metrics[task]} />
            ))}
          </div>
        </>
      )}

      {!loading && !error && tasks.length === 0 && (
        <div className="empty-metrics">
          <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
          <h2>No models trained yet</h2>
          <p>Click "Train / Retrain models" above to train all 8 models on your dataset.</p>
          <p style={{ marginTop: 8, fontSize: 12, color: 'var(--gray)' }}>
            Make sure <code>03_inventory_cleaned.csv</code> is in the <code>ml-service/data/</code> folder first.
          </p>
        </div>
      )}
    </div>
  )
}
