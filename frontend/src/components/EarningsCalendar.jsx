import { useState, useEffect, memo } from 'react';
import './EarningsCalendar.css';

/**
 * Earnings Calendar Component
 * Track upcoming earnings, dividends, and corporate events
 */

function EarningsCalendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'earnings', 'dividend', 'board'
  const [view, setView] = useState('list'); // 'list', 'calendar'

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/earnings/calendar');
      if (!res.ok) throw new Error('Failed to load calendar');
      const data = await res.json();
      const events = Array.isArray(data.events) ? data.events : [];
      setEvents(events.sort((a, b) => new Date(a.date) - new Date(b.date)));
      setError(null);
    } catch (err) {
      console.error('Error loading events:', err);
      setError('Unable to fetch calendar events. Showing local data only.');
      const fallbackEvents = [
        {
          symbol: 'OGDC',
          eventType: 'earnings',
          title: 'Q1 2026 Results',
          date: '2026-05-20',
          volatilityExpectation: 'high',
          description: 'OGDC Q1 earnings announcement expected to shift energy sector sentiment.',
        },
        {
          symbol: 'HBL',
          eventType: 'dividend',
          title: 'Dividend Ex-date',
          date: '2026-05-15',
          dividendPerShare: 5.5,
          description: 'HBL dividend record date for the upcoming payout.',
        },
      ];
      setEvents(fallbackEvents);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredEvents = () => {
    if (filter === 'all') return events;
    return events.filter((e) => e.eventType === filter);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00Z');
    return date.toLocaleDateString('en-PK', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysUntil = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    return days;
  };

  const filteredEvents = getFilteredEvents();
  const upcomingCount = filteredEvents.filter((e) => getDaysUntil(e.date) >= 0).length;

  if (loading) return <div className="ec-loading">Loading earnings calendar...</div>;

  return (
    <div className="earnings-calendar">
      <div className="ec-header">
        <div className="header-content">
          <h2>📅 Earnings Calendar</h2>
          <p className="header-subtitle">Track corporate events and announcements</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="ec-stats">
        <StatCard label="Upcoming Events" value={upcomingCount} icon="🔔" />
        <StatCard label="Earnings" value={events.filter((e) => e.eventType === 'earnings').length} icon="📊" />
        <StatCard label="Dividends" value={events.filter((e) => e.eventType === 'dividend').length} icon="💰" />
        <StatCard label="Board Meetings" value={events.filter((e) => e.eventType === 'board').length} icon="🏢" />
      </div>

      {/* Filters */}
      <div className="ec-controls">
        <div className="filter-buttons">
          {['all', 'earnings', 'dividend', 'board'].map((f) => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="view-toggle">
          <button
            className={`view-btn ${view === 'list' ? 'active' : ''}`}
            onClick={() => setView('list')}
          >
            📋 List
          </button>
          <button
            className={`view-btn ${view === 'calendar' ? 'active' : ''}`}
            onClick={() => setView('calendar')}
          >
            📅 Calendar
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="ec-list">
        {filteredEvents.length === 0 ? (
          <p className="ec-empty">No events found</p>
        ) : (
          filteredEvents.map((event, idx) => {
            const daysUntil = getDaysUntil(event.date);
            const isPast = daysUntil < 0;
            const isIminent = daysUntil <= 7 && daysUntil >= 0;

            return (
              <div
                key={idx}
                className={`event-card ${isPast ? 'past' : ''} ${isIminent ? 'imminent' : ''}`}
              >
                <div className="event-date-section">
                  <p className="event-date">{formatDate(event.date)}</p>
                  <p className={`event-countdown ${isIminent ? 'urgent' : ''}`}>
                    {isPast ? '✓ Past' : `${daysUntil} days`}
                  </p>
                </div>

                <div className="event-content">
                  <div className="event-header">
                    <h4 className="event-symbol">{event.symbol}</h4>
                    <span className={`event-type event-type-${event.eventType}`}>
                      {event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}
                    </span>
                  </div>
                  <p className="event-title">{event.title}</p>
                  <p className="event-description">{event.description}</p>

                  {event.eventType === 'earnings' && event.volatilityExpectation && (
                    <div className="event-meta">
                      <span className="meta-label">Expected Volatility:</span>
                      <span className={`meta-value volatility-${event.volatilityExpectation}`}>
                        {event.volatilityExpectation.toUpperCase()}
                      </span>
                    </div>
                  )}

                  {event.eventType === 'dividend' && event.dividendPerShare && (
                    <div className="event-meta">
                      <span className="meta-label">Dividend:</span>
                      <span className="meta-value dividend">{event.dividendPerShare} PKR/share</span>
                    </div>
                  )}
                </div>

                <button className="event-action">View →</button>
              </div>
            );
          })
        )}
      </div>

      {/* Info Box */}
      <div className="ec-info">
        <h4>💡 Why Track Earnings?</h4>
        <ul>
          <li><strong>Earnings announcements</strong> often trigger significant price movements.</li>
          <li><strong>Dividend dates</strong> help you plan for income and make reinvestment decisions.</li>
          <li><strong>Volatility expectations</strong> help you manage risk during announcements.</li>
          <li><strong>Board meetings</strong> may lead to policy changes or dividend decisions.</li>
        </ul>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
      </div>
    </div>
  );
}

export default memo(EarningsCalendar);
