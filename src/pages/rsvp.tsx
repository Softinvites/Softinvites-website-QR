import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-toastify';

import { API_BASE } from 'src/utils/apiBase';

import './rsvp.css';

type AttendanceStatus = 'yes' | 'no';

type RsvpFormResponse = {
  token: string;
  submitted: boolean;
  event: {
    id: string;
    name: string;
    date: string;
    location?: string;
    iv?: string;
    description?: string;
    qrCodeBgColor?: string;
    qrCodeCenterColor?: string;
    qrCodeEdgeColor?: string;
  };
  form: {
    isEditable: boolean;
  };
};

function formatDate(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function rgbString(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  const cleaned = value.trim();
  return cleaned.includes('rgb') ? cleaned : `rgb(${cleaned})`;
}

export default function RsvpPage() {
  const { token = '' } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<RsvpFormResponse | null>(null);

  const [guestName, setGuestName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<AttendanceStatus | ''>('');
  const [comments, setComments] = useState('');

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!token) {
        setError('Missing RSVP token');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get<RsvpFormResponse>(`${API_BASE}/rsvp/form/${token}`);
        if (ignore) return;
        setPayload(res.data);
      } catch (err: any) {
        if (ignore) return;
        setError(err?.response?.data?.message || 'Unable to load RSVP');
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [token]);

  const formLocked = useMemo(() => payload?.submitted === true, [payload]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!payload || !token) return;
    if (!guestName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }
    if (!phone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }
    if (!status) {
      toast.error('Please select an option');
      return;
    }
    if (formLocked) {
      toast.error('This RSVP form is already submitted.');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/rsvp/form/${token}/submit`, {
        guestName,
        email,
        phone,
        attendanceStatus: status,
        comments,
      });
      toast.success('RSVP submitted. Thank you!');
      setPayload((prev) => (prev ? { ...prev, submitted: true } : prev));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit RSVP');
    } finally {
      setSubmitting(false);
    }
  };

  const leftContent = useMemo(() => {
    if (!payload) return null;
    if (payload.event.iv) {
      return <img src={payload.event.iv} alt="Invitation" className="rsvp-iv" />;
    }
    return (
      <div className="rsvp-fallback">
        <div className="rsvp-fallback-pill">Invitation</div>
        <h2>{payload.event.name}</h2>
        <p className="rsvp-meta">{formatDate(payload.event.date)}</p>
        {payload.event.location && <p className="rsvp-meta">{payload.event.location}</p>}
        {payload.event.description && <p className="rsvp-desc">{payload.event.description}</p>}
      </div>
    );
  }, [payload]);

  const accent = rgbString(payload?.event?.qrCodeCenterColor, '#111827');
  const accentAlt = rgbString(payload?.event?.qrCodeEdgeColor, '#0f172a');

  return (
    <div
      className="rsvp-page"
      style={
        {
          '--rsvp-accent': accent,
          '--rsvp-accent-2': accentAlt,
        } as React.CSSProperties
      }
    >
      <Helmet>
        <title>RSVP | Softinvite</title>
      </Helmet>

      <div className="rsvp-shell">
        <div className="rsvp-left">{leftContent}</div>

        <div className="rsvp-right">
          {loading && <p className="rsvp-muted">Loading RSVP...</p>}
          {!loading && error && <p className="rsvp-error">{error}</p>}

          {!loading && !error && payload && (
            <form className="rsvp-form" onSubmit={handleSubmit}>
              <div className="rsvp-header">
                <div className="rsvp-pill">RSVP</div>
                <h1>{payload.event.name}</h1>
                <p className="rsvp-muted">Fill the form to confirm your attendance.</p>
              </div>

              <label className="rsvp-field" htmlFor="rsvp-guest-name">
                <span>Guest Name</span>
                <input
                  id="rsvp-guest-name"
                  type="text"
                  name="guestName"
                  value={guestName}
                  disabled={submitting || formLocked}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                />
              </label>

              <label className="rsvp-field" htmlFor="rsvp-email">
                <span>Email</span>
                <input
                  id="rsvp-email"
                  type="email"
                  name="email"
                  value={email}
                  disabled={submitting || formLocked}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>

              <label className="rsvp-field" htmlFor="rsvp-phone">
                <span>Phone Number</span>
                <input
                  id="rsvp-phone"
                  type="tel"
                  name="phone"
                  value={phone}
                  disabled={submitting || formLocked}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </label>

              <div className="rsvp-field">
                <span>Will you attend?</span>
                <div className="rsvp-statuses">
                  {(['yes', 'no'] as AttendanceStatus[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`rsvp-chip ${status === opt ? 'active' : ''} ${opt}`}
                      onClick={() => setStatus(opt)}
                      disabled={submitting || formLocked}
                    >
                      {opt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <label className="rsvp-field" htmlFor="rsvp-comments">
                <span>Additional Comments</span>
                <textarea
                  id="rsvp-comments"
                  name="comments"
                  value={comments}
                  disabled={submitting || formLocked}
                  onChange={(e) => setComments(e.target.value)}
                  rows={4}
                />
              </label>

              {formLocked && (
                <p className="rsvp-warning">This form has already been submitted.</p>
              )}

              <button type="submit" className="rsvp-submit" disabled={submitting || formLocked}>
                {submitting ? 'Submitting...' : 'Submit RSVP'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
