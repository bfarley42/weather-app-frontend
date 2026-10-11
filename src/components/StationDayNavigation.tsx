import { useEffect, useState, type ReactNode } from 'react';
import './StationDayNavigation.css';
import { fetchHistoricalDay, type HistoricalDay } from '../api/historicalDay';

function HistoricalObservations({ stationId, date, render }: {
  stationId: string;
  date: string;
  render: (day: HistoricalDay) => ReactNode;
}) {
  const [day, setDay] = useState<HistoricalDay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    fetchHistoricalDay(stationId, date).then(value => {
      if (active) setDay(value);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Unable to load historical observations');
    });
    return () => { active = false; };
  }, [stationId, date, attempt]);
  if (error) return <div className="station-day-placeholder" role="alert">
    <p>{error}</p>
    <button type="button" onClick={() => { setError(null); setAttempt(value => value + 1); }}>Retry</button>
  </div>;
  if (!day) return <div className="station-day-placeholder" role="status">Loading historical observations…</div>;
  return <>
    <p role="status">{day.has_observations
      ? `${day.coverage.hourly_observation_count} hourly records. Observation completeness is not guaranteed.`
      : 'No observations available for this date.'} Historical detail modals are not connected yet.</p>
    {render(day)}
  </>;
}

function localDate(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find(value => value.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export default function StationDayNavigation({ timezone, darkMode, children, stationId, renderHistorical }: {
  timezone: string | null;
  darkMode: boolean;
  children: ReactNode;
  stationId: string;
  renderHistorical: (day: HistoricalDay) => ReactNode;
}) {
  const [now, setNow] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Match the API's fallback when a station has no valid timezone.
  let today: string;
  try {
    today = localDate(now, timezone || 'America/New_York');
  } catch {
    today = localDate(now, 'America/New_York');
  }
  const date = selectedDate && selectedDate < today ? selectedDate : today;
  const isToday = date === today;
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC', weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
  }).format(new Date(`${date}T12:00:00Z`));
  const heading = isToday ? 'Today' : date === shiftDate(today, -1) ? 'Yesterday' : formattedDate;

  return (
    <section className={`station-day-navigation ${darkMode ? 'dark' : ''}`}>
      <nav className="station-day-controls" aria-label="Dashboard date">
        <button type="button" onClick={() => setSelectedDate(shiftDate(date, -1))}>Previous day</button>
        <div aria-live="polite">
          <h2>{heading}</h2>
          {heading !== formattedDate && <time dateTime={date}>{formattedDate}</time>}
        </div>
        <button type="button" disabled={isToday} onClick={() => {
          const next = shiftDate(date, 1);
          setSelectedDate(next >= today ? null : next);
        }}>Next day</button>
      </nav>
      {isToday ? children : (
        <HistoricalObservations key={`${stationId}:${date}`} stationId={stationId} date={date} render={renderHistorical} />
      )}
    </section>
  );
}
