// days_to_expiry is computed live on the backend (today vs expiry_date), so it
// naturally goes negative once a product passes its expiry date. This turns
// that into a readable phrase instead of a bare "-3d" — the risk badge next
// to it already shows LOW/MEDIUM/HIGH/EXPIRED, so this just tells the story.
export function formatDaysToExpiry(days) {
  if (days == null || days >= 9999) return '—'
  if (days > 1) return `${days}d`
  if (days === 1) return '1 day left'
  if (days === 0) return 'Expires today'
  const daysAgo = Math.abs(days)
  return `Expired ${daysAgo} ${daysAgo === 1 ? 'day' : 'days'} ago`
}

// Compact version for the Inventory table, used now that the Expiry risk
// badge sits right before this column — the badge already says EXPIRED/HIGH/etc,
// so this just needs the number, not a repeated "Expired ... ago" sentence.
export function formatDaysCompact(days) {
  if (days == null || days >= 9999) return '—'
  if (days > 1) return `${days}d`
  if (days === 1) return '1d'
  if (days === 0) return 'Today'
  return `${Math.abs(days)}d ago`
}

// Returns null when there's no real expiry date to report (the 9999 sentinel),
// so the caller can just omit the day count entirely instead of showing a
// meaningless number like "9999 days to expiry".
export function formatDaysToExpiryShort(days) {
  if (days == null || days >= 9999) return null
  if (days > 1) return `${days}d left`
  if (days === 1) return '1 day left'
  if (days === 0) return 'Expires today'
  return `Expired ${Math.abs(days)}d ago`
}
