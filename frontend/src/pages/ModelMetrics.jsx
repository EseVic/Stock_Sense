import { useState, useEffect } from 'react'
import axios from 'axios'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
         BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts'
import './ModelMetrics.css'

// Recharts colors (grid lines, axis ticks) are inline SVG props, not CSS —
// a CSS dark-mode rule can never reach them. This reads the same
// html.app-dark class Layout.jsx toggles, and re-checks it whenever that
// class changes, so switching theme updates the chart without a reload.
function useIsDark() {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains('app-dark')
  )
  useEffect(() => {
    const el = document.documentElement
    const obs = new MutationObserver(
      () => setIsDark(el.classList.contains('app-dark'))
    )
    obs.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return isDark
}

const TASK_LABELS = {
  expiry_risk:         'Expiry Risk',
  sales_velocity:      'Sales Velocity',
  customer_preference: 'Customer Preference',
  slow_mover:          'Slow Mover Detection',
}

const GREEN = '#1B7A5A'
const AMBER = '#C47D0E'

function MetricBadge({ value, threshold=0.80 }) {
  const pct = Number(value * 100)
  const color = pct >= threshold*100 ? GREEN : pct >= 70 ? AMBER : '#C0392B'
  return <span className="metric-badge" style={{ background: color+'18', color }}>{pct.toFixed(1)}%</span>
}

// Macro averages give every class equal importance. Prefer the explicit values
// returned by the ML service, with the classification report as a fallback.
const macroPrecision = m => m.precision_macro ?? m.report?.['macro avg']?.precision ?? 0
const macroRecall = m => m.recall_macro ?? m.report?.['macro avg']?.recall ?? 0
const macroF1 = m => m.f1_macro ?? m.report?.['macro avg']?.['f1-score'] ?? 0

function TaskCard({ task, data }) {
  const dt = data.decision_tree
  const lr = data.logistic_regression
  const winner = data.best_model
  const isDark = useIsDark()
  const gridStroke = isDark ? '#30363d' : '#e2e8f0'
  const tickFill   = isDark ? '#8b949e' : '#4A5568'

  const radarData = [
    { metric: 'Accuracy', DT: Math.round(dt.accuracy*100), LR: Math.round(lr.accuracy*100) },
    { metric: 'F1 (weighted)', DT: Math.round(dt.f1_weighted*100), LR: Math.round(lr.f1_weighted*100) },
    { metric: 'Precision (macro)', DT: Math.round(macroPrecision(dt)*100), LR: Math.round(macroPrecision(lr)*100) },
    { metric: 'Recall (macro)', DT: Math.round(macroRecall(dt)*100), LR: Math.round(macroRecall(lr)*100) },
    { metric: 'F1 (macro)', DT: Math.round(macroF1(dt)*100), LR: Math.round(macroF1(lr)*100) },
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
        <p className="metrics-explanation">
          Evaluated on a stratified 70/30 split of the augmented modelling data.
          Decision Tree probabilities use five-fold sigmoid calibration, so confidence is not raw leaf purity.
          Summary precision, recall and macro F1 give every class equal importance; the per-class table below shows where errors occur.
          Green is at least 80%, amber is 70-79.9%, and red is below 70%; these colours report performance and do not change the scores.
        </p>
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
                  <span className="mm-label">F1 (weighted)</span>
                  <MetricBadge value={m.f1_weighted} />
                </div>
                <div className="mm-row">
                  <span className="mm-label">Precision (macro)</span>
                  <MetricBadge value={macroPrecision(m)} />
                </div>
                <div className="mm-row">
                  <span className="mm-label">Recall (macro)</span>
                  <MetricBadge value={macroRecall(m)} />
                </div>
                <div className="mm-row">
                  <span className="mm-label">F1 (macro)</span>
                  <MetricBadge value={macroF1(m)} />
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
              <PolarGrid stroke={gridStroke} />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: tickFill }} />
              <Radar name="Decision Tree" dataKey="DT" stroke={GREEN} fill={GREEN} fillOpacity={0.15} strokeWidth={2} />
              <Radar name="Log. Regression" dataKey="LR" stroke={AMBER} fill={AMBER} fillOpacity={0.1} strokeWidth={2} strokeDasharray="4 2" />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Tooltip
                formatter={v => v + '%'}
                contentStyle={{
                  background: isDark ? '#161b22' : '#ffffff',
                  border: `1px solid ${gridStroke}`,
                  borderRadius: 8,
                  color: isDark ? '#e6edf3' : '#1f2937',
                }}
                labelStyle={{ color: isDark ? '#e6edf3' : '#1f2937' }}
              />
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
  const isDark = useIsDark()
  const tickFill = isDark ? '#8b949e' : '#4A5568'

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
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: tickFill }} />
                <YAxis domain={[0, 100]} tickFormatter={v => v + '%'} tick={{ fontSize: 11, fill: tickFill }} />
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
          <p>Click "Train / Retrain models" above to train all models.</p>
          {/* <p style={{ marginTop: 8, fontSize: 12, color: 'var(--gray)' }}>
            Make sure <code>StockSense-Inventory.csv</code> is in the <code>ml-service/data/</code> folder first.
          </p> */}
        </div>
      )}
    </div>
  )
}
