import { useEffect, useState, type ReactNode } from 'react';
import './StationDayNavigation.css';

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

export default function StationDayNavigation({ timezone, darkMode, children }: {
  timezone: string | null;
  darkMode: boolean;
  children: ReactNode;
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
        <div className="station-day-placeholder" role="status">
          <p>Historical daily summary coming next</p>
          <time dateTime={date}>{formattedDate}</time>
        </div>
      )}
    </section>
  );
}
