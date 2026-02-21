import { getStatusPillClass } from '../utils/validators';

export default function StatusPill({ status }) {
  return <span className={`pill ${getStatusPillClass(status)}`}>{status}</span>;
}
