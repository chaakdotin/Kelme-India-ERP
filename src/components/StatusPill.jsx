import { toStatusClass } from '../data/mockData'

function StatusPill({ status }) {
  return <span className={`pill ${toStatusClass(status)}`}>{status}</span>
}

export default StatusPill
