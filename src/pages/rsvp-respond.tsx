import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from 'src/utils/apiBase';

type Stage = 'loading' | 'submitting' | 'success' | 'error';

export default function RsvpRespondPage() {
  const { rsvpId } = useParams<{ rsvpId: string }>();
  const [searchParams] = useSearchParams();
  const status = (searchParams.get('status') || '') as 'yes' | 'no' | '';

  const [stage, setStage] = useState<Stage>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [eventName, setEventName] = useState('');
  const [rsvpCalendarId, setRsvpCalendarId] = useState('');
  const [hasEmail, setHasEmail] = useState(true);

  // Email save state
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);

  const isYes = status === 'yes';

  useEffect(() => {
    if (!rsvpId || !status) {
      setStage('error');
      setErrorMsg('Invalid RSVP link — missing required information.');
      return;
    }

    const tryRespond = async () => {
      try {
        const res = await axios.get(
          `${API_BASE}/rsvp/respond/${rsvpId}?status=${encodeURIComponent(status)}&format=json`
        );
        setEventName(res.data?.eventName || '');
        setRsvpCalendarId(res.data?.rsvpId || rsvpId!);
        setHasEmail(!!res.data?.hasEmail);
        setStage('success');
      } catch (err: any) {
        const code = err?.response?.status;
        if (code === 404) {
          setStage('error');
          setErrorMsg('RSVP not found. This link may be invalid or expired.');
        } else {
          // Fallback: treat as success (old HTML behaviour)
          setRsvpCalendarId(rsvpId!);
          setHasEmail(false);
          setStage('success');
        }
      }
    };

    tryRespond();
  }, [rsvpId, status]);

  const handleSaveEmail = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError('');
    setEmailSaving(true);
    try {
      await axios.post(`${API_BASE}/rsvp/respond/${rsvpId}/email`, {
        status,
        email: trimmed,
      });
      setEmailSaved(true);
      setHasEmail(true);
    } catch (err: any) {
      setEmailError(err?.response?.data?.message || 'Failed to save email. Please try again.');
    } finally {
      setEmailSaving(false);
    }
  };

  const calendarUrl =
    isYes && rsvpCalendarId
      ? `${API_BASE}/rsvp/${encodeURIComponent(rsvpCalendarId)}/calendar`
      : '';

  const accentColor = isYes ? '#2e7d32' : '#c62828';
  const bgColor = isYes ? '#e8f5e9' : '#ffebee';

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: bgColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    fontFamily: '"Roboto","Helvetica","Arial",sans-serif',
  };

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 480,
    background: '#fff',
    borderRadius: 18,
    boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
    padding: '32px 28px',
    textAlign: 'center',
  };

  const iconStyle: React.CSSProperties = {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: accentColor,
    color: '#fff',
    fontSize: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  };

  const btnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '13px 24px',
    borderRadius: 999,
    fontSize: 15,
    fontWeight: 700,
    textDecoration: 'none',
    background: accentColor,
    color: '#fff',
    boxShadow: '0 10px 28px rgba(0,0,0,0.2)',
    marginTop: 20,
    cursor: 'pointer',
    border: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    border: '1px solid #d1d5db',
    borderRadius: 8,
    padding: '11px 14px',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const saveBtn: React.CSSProperties = {
    padding: '11px 18px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 700,
    border: 'none',
    background: emailSaved ? '#6b7280' : accentColor,
    color: '#fff',
    cursor: emailSaving || emailSaved ? 'default' : 'pointer',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  };

  if (stage === 'loading' || stage === 'submitting') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <p style={{ color: '#6b7280', fontSize: 15 }}>Updating your RSVP...</p>
        </div>
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ ...iconStyle, background: '#c62828' }}>⚠️</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 24 }}>Something went wrong</h2>
          <p style={{ color: '#6b7280', fontSize: 15 }}>{errorMsg}</p>
        </div>
      </div>
    );
  }

  // success
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={iconStyle}>{isYes ? '🎉' : '💌'}</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 26, color: '#1f2937' }}>
          {isYes ? "You're confirmed!" : "We'll miss you!"}
        </h2>
        <p style={{ color: '#6b7280', fontSize: 15, margin: '0 0 4px' }}>
          {isYes
            ? `Thank you! Your attendance${eventName ? ` at ${eventName}` : ''} has been confirmed.`
            : `Thank you for letting us know. We hope to see you next time.`}
        </p>
        <div style={{ fontWeight: 700, color: accentColor, fontSize: 16, margin: '16px 0' }}>
          Status: {status.toUpperCase()}
        </div>

        {/* Email field — only shown if guest has no email yet */}
        {!hasEmail && (
          <div style={{ marginTop: 20, textAlign: 'left' }}>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
              {emailSaved
                ? '✅ Email saved! You can now add the event to your calendar.'
                : 'Add your email to receive event updates and add to calendar.'}
            </p>
            {!emailSaved && (
              <>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    style={inputStyle}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEmail(); }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveEmail}
                    disabled={emailSaving}
                    style={saveBtn}
                  >
                    {emailSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
                {emailError && (
                  <p style={{ color: '#c62828', fontSize: 13, marginTop: 6 }}>{emailError}</p>
                )}
              </>
            )}
          </div>
        )}

        {/* Add to Calendar — only for yes + has email (or just saved one) */}
        {isYes && calendarUrl && (hasEmail || emailSaved) && (
          <>
            <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 16 }}>
              Save the event to your calendar so you don&apos;t miss it.
            </p>
            <a href={calendarUrl} style={btnStyle} target="_blank" rel="noreferrer">
              📅 Add to Calendar
            </a>
          </>
        )}
      </div>
    </div>
  );
}
