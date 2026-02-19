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
    rsvpBgColor?: string;
    rsvpAccentColor?: string;
    qrCodeBgColor?: string;
    qrCodeCenterColor?: string;
    qrCodeEdgeColor?: string;
    rsvpFormSettings?: Record<string, any>;
    servicePackage?: string;
    channelConfig?: Record<string, any>;
  };
  form: {
    isEditable: boolean;
  };
};

const defaultFormSettings = {
  guestNameLabel: 'Guest Name',
  guestNamePlaceholder: '',
  emailLabel: 'Email',
  emailPlaceholder: '',
  phoneLabel: 'Phone Number',
  phonePlaceholder: '',
  attendanceLabel: 'Will you attend?',
  commentsLabel: 'Additional Comments',
  commentsPlaceholder: '',
  submitLabel: 'Submit RSVP',
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
  const [preferredChannels, setPreferredChannels] = useState<string[]>(['email']);
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

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
  const formSettings = useMemo(
    () => ({ ...defaultFormSettings, ...(payload?.event?.rsvpFormSettings || {}) }),
    [payload]
  );
  const servicePackage = payload?.event?.servicePackage || 'standard-rsvp';
  const showPreferences = servicePackage === 'full-rsvp';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!payload || !token) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.error('No internet connection. Please try again when you are online.');
      return;
    }
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
        preferredChannels,
        whatsappOptIn,
        smsOptIn,
        whatsappNumber,
        mobileNumber,
      });
      toast.success('RSVP submitted. Thank you!');
      setPayload((prev) => (prev ? { ...prev, submitted: true } : prev));
    } catch (err: any) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        toast.error('No internet connection. Please try again when you are online.');
      } else {
        toast.error(err?.response?.data?.message || 'Failed to submit RSVP');
      }
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

  const rsvpBg = rgbString(payload?.event?.rsvpBgColor, '#111827');
  const rsvpAccent = rgbString(
    payload?.event?.rsvpAccentColor || payload?.event?.qrCodeCenterColor,
    '#1f2937'
  );

  return (
    <div
      className="rsvp-page"
      style={
        {
          '--rsvp-bg': rsvpBg,
          '--rsvp-accent': rsvpAccent,
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
                <span>{formSettings.guestNameLabel}</span>
                <input
                  id="rsvp-guest-name"
                  type="text"
                  name="guestName"
                  value={guestName}
                  disabled={submitting || formLocked}
                  placeholder={formSettings.guestNamePlaceholder}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                />
              </label>

              <label className="rsvp-field" htmlFor="rsvp-email">
                <span>{formSettings.emailLabel}</span>
                <input
                  id="rsvp-email"
                  type="email"
                  name="email"
                  value={email}
                  disabled={submitting || formLocked}
                  placeholder={formSettings.emailPlaceholder}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>

              <label className="rsvp-field" htmlFor="rsvp-phone">
                <span>{formSettings.phoneLabel}</span>
                <input
                  id="rsvp-phone"
                  type="tel"
                  name="phone"
                  value={phone}
                  disabled={submitting || formLocked}
                  placeholder={formSettings.phonePlaceholder}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </label>

              <div className="rsvp-field">
                <span>{formSettings.attendanceLabel}</span>
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
                <span>{formSettings.commentsLabel}</span>
                <textarea
                  id="rsvp-comments"
                  name="comments"
                  value={comments}
                  disabled={submitting || formLocked}
                  placeholder={formSettings.commentsPlaceholder}
                  onChange={(e) => setComments(e.target.value)}
                  rows={4}
                />
              </label>

              {showPreferences && (
                <div className="rsvp-field">
                  <span>Preferred Contact Channels</span>
                  <div className="rsvp-checkboxes">
                    <div className="rsvp-checkbox">
                      <input
                        id="pref-email-required"
                        type="checkbox"
                        checked
                        disabled
                        aria-label="Email (required)"
                      />
                      <span>Email (required)</span>
                    </div>
                    <div className="rsvp-checkbox">
                      <input
                        id="pref-whatsapp"
                        type="checkbox"
                        checked={preferredChannels.includes('whatsapp')}
                        aria-label="WhatsApp"
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...preferredChannels, 'whatsapp']
                            : preferredChannels.filter((c) => c !== 'whatsapp');
                          setPreferredChannels(next);
                        }}
                      />
                      <span>WhatsApp</span>
                    </div>
                    <div className="rsvp-checkbox">
                      <input
                        id="pref-sms"
                        type="checkbox"
                        checked={preferredChannels.includes('sms')}
                        aria-label="SMS"
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...preferredChannels, 'sms']
                            : preferredChannels.filter((c) => c !== 'sms');
                          setPreferredChannels(next);
                        }}
                      />
                      <span>SMS</span>
                    </div>
                  </div>
                </div>
              )}

              {showPreferences && (
                <>
                  <div className="rsvp-field">
                    <span>WhatsApp Opt-In</span>
                    <div className="rsvp-checkboxes">
                      <div className="rsvp-checkbox">
                        <input
                          id="rsvp-whatsapp-opt"
                          type="checkbox"
                          checked={whatsappOptIn}
                          aria-label="I agree to receive WhatsApp updates"
                          onChange={(e) => setWhatsappOptIn(e.target.checked)}
                        />
                        <span>I agree to receive WhatsApp updates</span>
                      </div>
                    </div>
                  </div>
                  <label className="rsvp-field" htmlFor="rsvp-whatsapp-number">
                    <span>WhatsApp Number</span>
                    <input
                      id="rsvp-whatsapp-number"
                      type="tel"
                      value={whatsappNumber}
                      disabled={submitting || formLocked}
                      placeholder="WhatsApp number"
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                    />
                  </label>
                  <div className="rsvp-field">
                    <span>SMS Opt-In</span>
                    <div className="rsvp-checkboxes">
                      <div className="rsvp-checkbox">
                        <input
                          id="rsvp-sms-opt"
                          type="checkbox"
                          checked={smsOptIn}
                          aria-label="I agree to receive SMS updates"
                          onChange={(e) => setSmsOptIn(e.target.checked)}
                        />
                        <span>I agree to receive SMS updates</span>
                      </div>
                    </div>
                  </div>
                  <label className="rsvp-field" htmlFor="rsvp-mobile-number">
                    <span>Mobile Number</span>
                    <input
                      id="rsvp-mobile-number"
                      type="tel"
                      value={mobileNumber}
                      disabled={submitting || formLocked}
                      placeholder="Mobile number for SMS"
                      onChange={(e) => setMobileNumber(e.target.value)}
                    />
                  </label>
                </>
              )}

              {formLocked && (
                <p className="rsvp-warning">This form has already been submitted.</p>
              )}

              <button type="submit" className="rsvp-submit" disabled={submitting || formLocked}>
                {submitting ? 'Submitting...' : formSettings.submitLabel}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
