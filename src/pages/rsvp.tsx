import './rsvp.css';

import type { FormEvent } from 'react';
import type { RsvpCustomField } from 'src/utils/rsvp-form';

import axios from 'axios';
import { toast } from 'react-toastify';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import { useMemo, useState, useEffect } from 'react';

import { API_BASE } from 'src/utils/apiBase';
import { fieldIsVisible, normalizeRsvpFormSettings } from 'src/utils/rsvp-form';

type AttendanceStatus = 'yes' | 'no';
type CustomResponseValue = string | string[];
type PlusOne = { name: string; phone: string; email: string };

type RsvpFormResponse = {
  token: string;
  submitted: boolean;
  redirectUrl?: string | null;
  event: {
    id: string;
    name: string;
    date: string;
    location?: string;
    iv?: string;
    description?: string;
    rsvpFormSettings?: Record<string, any>;
    servicePackage?: string;
    channelConfig?: Record<string, any>;
  };
  form: {
    isEditable: boolean;
  };
};

// Google Forms purple, used for every event (custom colours no longer apply).
const G_PURPLE = '#673ab7';
const REQUIRED_MESSAGE = 'This is a required question';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createInitialResponses = (fields: RsvpCustomField[]) =>
  fields.reduce<Record<string, CustomResponseValue>>((acc, field) => {
    acc[field.id] = field.type === 'checkbox' ? [] : '';
    return acc;
  }, {});

const INPUT_TYPE: Record<string, string> = {
  text: 'text',
  number: 'number',
  email: 'email',
  phone: 'tel',
  date: 'date',
  time: 'time',
};

const RSVP_FORM_DEVICE_KEY_PREFIX = 'softinvite:rsvp-form-device:';
const RSVP_FORM_SUBMISSION_PREFIX = 'softinvite:rsvp-form-submission:';
const DUPLICATE_SUBMISSION_MESSAGE =
  'This form has already been submitted on this device for this name. If you are responding for someone else, enter their name instead.';

function normalizeEmailAddress(value: string) {
  return value.trim().toLowerCase();
}

/**
 * Submissions are tracked per guest NAME, not per email. Families and couples
 * routinely share one address, and keying on email meant the first person to
 * respond locked everyone else on that device out of the form.
 */
function normalizeGuestNameKey(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function createSubmissionKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function getDeviceKeyStorageKey(token: string) {
  return `${RSVP_FORM_DEVICE_KEY_PREFIX}${token}`;
}

function getSubmissionStorageKey(token: string, guestName: string) {
  return `${RSVP_FORM_SUBMISSION_PREFIX}${token}:${normalizeGuestNameKey(guestName)}`;
}

function getOrCreateDeviceSubmissionKey(token: string) {
  if (typeof window === 'undefined' || !token) return '';
  try {
    const storageKey = getDeviceKeyStorageKey(token);
    const existingKey = window.localStorage.getItem(storageKey);
    if (existingKey) {
      return existingKey;
    }
    const nextKey = createSubmissionKey();
    window.localStorage.setItem(storageKey, nextKey);
    return nextKey;
  } catch {
    return '';
  }
}

function hasStoredSubmission(token: string, guestName: string) {
  const normalizedName = normalizeGuestNameKey(guestName);
  if (typeof window === 'undefined' || !token || !normalizedName) return false;
  try {
    return Boolean(window.localStorage.getItem(getSubmissionStorageKey(token, normalizedName)));
  } catch {
    return false;
  }
}

function storeSubmission(
  token: string,
  guestName: string,
  submissionKey: string,
  rsvpId?: string
) {
  const normalizedName = normalizeGuestNameKey(guestName);
  if (typeof window === 'undefined' || !token || !normalizedName) return;
  try {
    window.localStorage.setItem(
      getSubmissionStorageKey(token, normalizedName),
      JSON.stringify({
        guestName: normalizedName,
        rsvpId: rsvpId || null,
        submissionKey: submissionKey || null,
        submittedAt: new Date().toISOString(),
      })
    );
  } catch {
    // Ignore storage failures and allow the backend to handle duplicate checks when possible.
  }
}

function formatDate(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function Question({
  title,
  description,
  required,
  error,
  htmlFor,
  children,
}: {
  title: string;
  description?: string;
  required?: boolean;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  const Title = htmlFor ? 'label' : 'div';
  return (
    <div className={`gf-card gf-question${error ? ' gf-has-error' : ''}`} data-error={error ? 'true' : undefined}>
      <Title className="gf-q-title" {...(htmlFor ? { htmlFor } : {})}>
        {title}
        {required && <span className="gf-required"> *</span>}
      </Title>
      {description && <div className="gf-q-desc">{description}</div>}
      <div className="gf-q-body">{children}</div>
      {error && (
        <div className="gf-error" role="alert">
          <span aria-hidden="true">ⓘ</span> {error}
        </div>
      )}
    </div>
  );
}

export default function RsvpPage() {
  const { token = '' } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<RsvpFormResponse | null>(null);
  const [deviceSubmissionKey, setDeviceSubmissionKey] = useState('');
  const [deviceNameLocked, setDeviceNameLocked] = useState(false);
  const [submitted, setSubmitted] = useState<{ status: AttendanceStatus; rsvpId: string } | null>(null);

  const [guestName, setGuestName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<AttendanceStatus | ''>('');
  const [comments, setComments] = useState('');
  const [responses, setResponses] = useState<Record<string, CustomResponseValue>>({});
  const [plusOnes, setPlusOnes] = useState<PlusOne[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const formSettings = useMemo(
    () => normalizeRsvpFormSettings(payload?.event?.rsvpFormSettings),
    [payload]
  );
  const attendanceEnabled = formSettings.attendanceEnabled !== false;
  const formInvalidated =
    formSettings.isInvalidated === true ||
    payload?.event?.rsvpFormSettings?.acceptingSubmissions === false;
  const plusOnesVisible =
    formSettings.plusOnesEnabled && (!attendanceEnabled || status === 'yes');
  const visibleFields = formSettings.customFields.filter((field) =>
    fieldIsVisible(field, attendanceEnabled, status)
  );

  useEffect(() => {
    setResponses(createInitialResponses(formSettings.customFields));
  }, [formSettings.customFields]);

  useEffect(() => {
    setDeviceSubmissionKey(getOrCreateDeviceSubmissionKey(token));
  }, [token]);

  const isRedirecting = Boolean(payload?.redirectUrl);

  useEffect(() => {
    if (payload?.redirectUrl) {
      window.location.href = payload.redirectUrl;
    }
  }, [payload]);

  useEffect(() => {
    setDeviceNameLocked(hasStoredSubmission(token, guestName));
  }, [token, guestName]);

  const clearError = (key: string) =>
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const setResponse = (id: string, value: CustomResponseValue) => {
    setResponses((prev) => ({ ...prev, [id]: value }));
    clearError(id);
  };

  const updatePlusOne = (index: number, patch: Partial<PlusOne>) => {
    setPlusOnes((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
    clearError(`plusOne_${index}`);
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!guestName.trim()) next.guestName = REQUIRED_MESSAGE;
    if (formSettings.emailMode === 'required' && !email.trim()) next.email = REQUIRED_MESSAGE;
    else if (formSettings.emailMode !== 'hidden' && email.trim() && !EMAIL_RE.test(email.trim()))
      next.email = 'Enter a valid email address';
    if (formSettings.phoneMode === 'required' && !phone.trim()) next.phone = REQUIRED_MESSAGE;
    if (attendanceEnabled && !status) next.attendance = REQUIRED_MESSAGE;
    visibleFields.forEach((field) => {
      if (field.type === 'section') return;
      const value = responses[field.id];
      const empty =
        field.type === 'checkbox'
          ? !Array.isArray(value) || value.length === 0
          : typeof value !== 'string' || !value.trim();
      if (field.required && empty) next[field.id] = REQUIRED_MESSAGE;
      else if (
        field.type === 'email' &&
        typeof value === 'string' &&
        value.trim() &&
        !EMAIL_RE.test(value.trim())
      )
        next[field.id] = 'Enter a valid email address';
    });
    if (plusOnesVisible) {
      plusOnes.forEach((p, i) => {
        if (!p.name.trim()) next[`plusOne_${i}`] = 'Enter a name or remove this guest';
        else if (p.email.trim() && !EMAIL_RE.test(p.email.trim()))
          next[`plusOne_${i}`] = 'Enter a valid email address';
      });
    }
    return next;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!payload || !token) return;
    if (formInvalidated) {
      toast.error('This form is no longer receiving submissions');
      return;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.error('No internet connection. Please try again when you are online.');
      return;
    }
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      toast.error('Please complete the highlighted questions');
      requestAnimationFrame(() => {
        document
          .querySelector('[data-error="true"]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }
    if (deviceNameLocked) {
      toast.error(DUPLICATE_SUBMISSION_MESSAGE);
      return;
    }

    setSubmitting(true);
    try {
      // Only answers to questions the guest could see are sent.
      const responsePayload = visibleFields.reduce<Record<string, CustomResponseValue>>(
        (acc, field) => {
          if (field.type === 'section') return acc;
          const value = responses[field.id];
          acc[field.id] =
            field.type === 'checkbox'
              ? Array.isArray(value)
                ? value
                : []
              : typeof value === 'string'
                ? value
                : '';
          return acc;
        },
        {}
      );
      const { data } = await axios.post(`${API_BASE}/rsvp/form/${token}/submit`, {
        guestName,
        email: formSettings.emailMode === 'hidden' ? '' : email,
        phone: formSettings.phoneMode === 'hidden' ? '' : phone,
        attendanceStatus: attendanceEnabled ? status : undefined,
        comments: formSettings.commentsEnabled ? comments : '',
        submissionKey: deviceSubmissionKey || undefined,
        responses: responsePayload,
        ...(plusOnesVisible && plusOnes.length
          ? {
              plusOnes: plusOnes.map((p) => ({
                name: p.name.trim(),
                phone: p.phone.trim(),
                email: p.email.trim(),
              })),
            }
          : {}),
      });
      storeSubmission(token, guestName, deviceSubmissionKey, data?.rsvp?.id);
      setSubmitted({
        status: (attendanceEnabled ? status : 'yes') as AttendanceStatus,
        rsvpId: data?.rsvp?.id || '',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        toast.error('No internet connection. Please try again when you are online.');
      } else {
        const message = err?.response?.data?.message || 'Failed to submit RSVP';
        // Match loosely: the server's duplicate wording is not byte-identical
        // to the client copy, and an exact compare silently failed to lock.
        if (/already been submitted on this device/i.test(String(message))) {
          setDeviceNameLocked(true);
        }
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const invitation = useMemo(() => {
    if (!payload) return null;
    if (payload.event.iv) {
      return <img src={payload.event.iv} alt="Invitation" className="gf-iv" />;
    }
    return null;
  }, [payload]);

  const renderField = (field: RsvpCustomField) => {
    const value = responses[field.id];
    const inputId = `rsvp-custom-${field.id}`;

    if (field.type === 'section') {
      return (
        <div className="gf-card gf-section" key={field.id}>
          {field.label && <h2>{field.label}</h2>}
          {field.description && <p>{field.description}</p>}
        </div>
      );
    }

    const common = {
      title: field.label,
      description: field.description,
      required: field.required,
      error: errors[field.id],
    };

    if (field.type === 'textarea') {
      return (
        <Question key={field.id} {...common} htmlFor={inputId}>
          <textarea
            id={inputId}
            className="gf-input"
            value={typeof value === 'string' ? value : ''}
            disabled={submitting}
            placeholder={field.placeholder || 'Your answer'}
            onChange={(e) => setResponse(field.id, e.target.value)}
            rows={3}
          />
        </Question>
      );
    }

    if (field.type === 'select') {
      return (
        <Question key={field.id} {...common} htmlFor={inputId}>
          <select
            id={inputId}
            className="gf-select"
            value={typeof value === 'string' ? value : ''}
            disabled={submitting}
            onChange={(e) => setResponse(field.id, e.target.value)}
          >
            <option value="">{field.placeholder || 'Choose'}</option>
            {field.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Question>
      );
    }

    if (field.type === 'radio') {
      return (
        <Question key={field.id} {...common}>
          <div className="gf-choices" role="radiogroup">
            {field.options.map((option, i) => (
              <label className="gf-choice" key={option} htmlFor={`${inputId}-${i}`}>
                <input
                  id={`${inputId}-${i}`}
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={value === option}
                  disabled={submitting}
                  onChange={(e) => setResponse(field.id, e.target.value)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
          {!field.required && typeof value === 'string' && value && (
            <button type="button" className="gf-link" onClick={() => setResponse(field.id, '')}>
              Clear selection
            </button>
          )}
        </Question>
      );
    }

    if (field.type === 'checkbox') {
      const selected = Array.isArray(value) ? value : [];
      return (
        <Question key={field.id} {...common}>
          <div className="gf-choices">
            {field.options.map((option, i) => (
              <label className="gf-choice" key={option} htmlFor={`${inputId}-${i}`}>
                <input
                  id={`${inputId}-${i}`}
                  type="checkbox"
                  value={option}
                  checked={selected.includes(option)}
                  disabled={submitting}
                  onChange={(e) =>
                    setResponse(
                      field.id,
                      e.target.checked
                        ? [...selected, option]
                        : selected.filter((entry) => entry !== option)
                    )
                  }
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </Question>
      );
    }

    return (
      <Question key={field.id} {...common} htmlFor={inputId}>
        <input
          id={inputId}
          className="gf-input"
          type={INPUT_TYPE[field.type] || 'text'}
          value={typeof value === 'string' ? value : ''}
          disabled={submitting}
          placeholder={
            field.type === 'date' || field.type === 'time' ? undefined : field.placeholder || 'Your answer'
          }
          onChange={(e) => setResponse(field.id, e.target.value)}
        />
      </Question>
    );
  };

  const title = formSettings.formTitle.trim() || payload?.event?.name || 'RSVP';
  const showForm = !loading && !isRedirecting && !error && payload && !formInvalidated;

  return (
    <div className="gf-page">
      <Helmet>
        <title>RSVP | Softinvite</title>
      </Helmet>

      <div className={`gf-shell${invitation ? ' gf-shell--with-iv' : ''}`}>
        {invitation && <div className="gf-left">{invitation}</div>}

        <div className="gf-right">
          {(loading || isRedirecting) && (
            <div className="gf-card gf-header">
              <p className="gf-muted">{isRedirecting ? 'Redirecting...' : 'Loading RSVP...'}</p>
            </div>
          )}
          {!loading && !isRedirecting && error && (
            <div className="gf-card gf-header">
              <p className="gf-error-text">{error}</p>
            </div>
          )}
          {!loading && !isRedirecting && !error && payload && formInvalidated && (
            <div className="gf-card gf-header">
              <h1>{title}</h1>
              <p className="gf-muted">This form is no longer receiving submissions.</p>
            </div>
          )}

          {showForm && submitted && (
            <div className="gf-card gf-header">
              <SuccessScreen
                status={submitted.status}
                rsvpId={submitted.rsvpId}
                eventName={payload.event.name}
                accentColor={G_PURPLE}
                accentTextColor="#ffffff"
              />
            </div>
          )}

          {showForm && !submitted && (
            <form className="gf-form" onSubmit={handleSubmit} noValidate>
              <div className="gf-card gf-header">
                <h1>{title}</h1>
                {formSettings.formDescription ? (
                  <p className="gf-desc">{formSettings.formDescription}</p>
                ) : (
                  <p className="gf-desc">
                    {[formatDate(payload.event.date), payload.event.location]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
                <p className="gf-required-note">* Indicates required question</p>
              </div>

              <Question
                title={formSettings.guestNameLabel}
                required
                error={errors.guestName}
                htmlFor="rsvp-guest-name"
              >
                <input
                  id="rsvp-guest-name"
                  className="gf-input"
                  type="text"
                  autoComplete="name"
                  value={guestName}
                  disabled={submitting}
                  placeholder={formSettings.guestNamePlaceholder || 'Your answer'}
                  onChange={(e) => {
                    setGuestName(e.target.value);
                    clearError('guestName');
                  }}
                />
              </Question>

              {formSettings.emailMode !== 'hidden' && (
                <Question
                  title={formSettings.emailLabel}
                  required={formSettings.emailMode === 'required'}
                  error={errors.email}
                  htmlFor="rsvp-email"
                >
                  <input
                    id="rsvp-email"
                    className="gf-input"
                    type="email"
                    autoComplete="email"
                    value={email}
                    disabled={submitting}
                    placeholder={formSettings.emailPlaceholder || 'Your answer'}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearError('email');
                    }}
                  />
                </Question>
              )}

              {formSettings.phoneMode !== 'hidden' && (
                <Question
                  title={formSettings.phoneLabel}
                  required={formSettings.phoneMode === 'required'}
                  error={errors.phone}
                  htmlFor="rsvp-phone"
                >
                  <input
                    id="rsvp-phone"
                    className="gf-input"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    disabled={submitting}
                    placeholder={formSettings.phonePlaceholder || 'Your answer'}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      clearError('phone');
                    }}
                  />
                </Question>
              )}

              {attendanceEnabled && (
                <Question title={formSettings.attendanceLabel} required error={errors.attendance}>
                  <div className="gf-choices" role="radiogroup">
                    {(
                      [
                        ['yes', formSettings.attendanceYesLabel],
                        ['no', formSettings.attendanceNoLabel],
                      ] as const
                    ).map(([opt, label]) => (
                      <label className="gf-choice" key={opt} htmlFor={`rsvp-attendance-${opt}`}>
                        <input
                          id={`rsvp-attendance-${opt}`}
                          type="radio"
                          name="attendance"
                          value={opt}
                          checked={status === opt}
                          disabled={submitting}
                          onChange={() => {
                            setStatus(opt);
                            clearError('attendance');
                          }}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </Question>
              )}

              {plusOnesVisible && (
                <Question
                  title={formSettings.plusOnesLabel}
                  description={`You can add up to ${formSettings.plusOnesMax} guest${
                    formSettings.plusOnesMax === 1 ? '' : 's'
                  }. Phone and email are optional.`}
                >
                  {plusOnes.map((p, i) => (
                    <div
                      className={`gf-plusone${errors[`plusOne_${i}`] ? ' gf-has-error' : ''}`}
                      data-error={errors[`plusOne_${i}`] ? 'true' : undefined}
                      key={i}
                    >
                      <div className="gf-plusone-head">
                        <strong>Guest {i + 1}</strong>
                        <button
                          type="button"
                          className="gf-link"
                          disabled={submitting}
                          onClick={() => {
                            setPlusOnes((prev) => prev.filter((_, j) => j !== i));
                            setErrors((prev) => {
                              const next: Record<string, string> = {};
                              Object.entries(prev).forEach(([k, v]) => {
                                if (!k.startsWith('plusOne_')) next[k] = v;
                              });
                              return next;
                            });
                          }}
                        >
                          Remove
                        </button>
                      </div>
                      <input
                        className="gf-input"
                        type="text"
                        placeholder="Full name *"
                        aria-label={`Guest ${i + 1} name`}
                        value={p.name}
                        disabled={submitting}
                        onChange={(e) => updatePlusOne(i, { name: e.target.value })}
                      />
                      <div className="gf-plusone-row">
                        <input
                          className="gf-input"
                          type="tel"
                          placeholder="Phone (optional)"
                          aria-label={`Guest ${i + 1} phone`}
                          value={p.phone}
                          disabled={submitting}
                          onChange={(e) => updatePlusOne(i, { phone: e.target.value })}
                        />
                        <input
                          className="gf-input"
                          type="email"
                          placeholder="Email (optional)"
                          aria-label={`Guest ${i + 1} email`}
                          value={p.email}
                          disabled={submitting}
                          onChange={(e) => updatePlusOne(i, { email: e.target.value })}
                        />
                      </div>
                      {errors[`plusOne_${i}`] && (
                        <div className="gf-error">
                          <span aria-hidden="true">ⓘ</span> {errors[`plusOne_${i}`]}
                        </div>
                      )}
                    </div>
                  ))}
                  {plusOnes.length < formSettings.plusOnesMax ? (
                    <button
                      type="button"
                      className="gf-add"
                      disabled={submitting}
                      onClick={() => setPlusOnes((prev) => [...prev, { name: '', phone: '', email: '' }])}
                    >
                      + Add {plusOnes.length ? 'another guest' : 'a guest'}
                    </button>
                  ) : (
                    <p className="gf-muted small">
                      Maximum of {formSettings.plusOnesMax} extra guest
                      {formSettings.plusOnesMax === 1 ? '' : 's'} reached.
                    </p>
                  )}
                </Question>
              )}

              {visibleFields.map(renderField)}

              {formSettings.commentsEnabled && (
                <Question title={formSettings.commentsLabel} htmlFor="rsvp-comments">
                  <textarea
                    id="rsvp-comments"
                    className="gf-input"
                    value={comments}
                    disabled={submitting}
                    placeholder={formSettings.commentsPlaceholder || 'Your answer'}
                    onChange={(e) => setComments(e.target.value)}
                    rows={3}
                  />
                </Question>
              )}

              {deviceNameLocked && normalizeGuestNameKey(guestName) && (
                <div className="gf-card gf-warning">{DUPLICATE_SUBMISSION_MESSAGE}</div>
              )}

              <div className="gf-actions">
                <button type="submit" className="gf-submit" disabled={submitting || deviceNameLocked}>
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
              <p className="gf-footer">
                Powered by <strong>SoftInvites</strong>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Success screen shown after a successful RSVP submission
// ---------------------------------------------------------------------------
function SuccessScreen({
  status,
  rsvpId,
  eventName,
  accentColor,
  accentTextColor,
}: {
  status: AttendanceStatus;
  rsvpId: string;
  eventName: string;
  accentColor: string;
  accentTextColor: string;
}) {
  const isYes = status === 'yes';
  const calendarUrl = isYes && rsvpId
    ? `${import.meta.env.VITE_API_BASE || 'https://292x833w13.execute-api.us-east-2.amazonaws.com'}/rsvp/${encodeURIComponent(rsvpId)}/calendar`
    : '';

  return (
    <div className="rsvp-success">
      <div className="rsvp-success-confetti" aria-hidden="true">
        {isYes ? '🎊 🎉 🎊' : ''}
      </div>

      <div
        className="rsvp-success-icon"
        style={{ background: accentColor, color: accentTextColor }}
      >
        {isYes ? '✓' : '💌'}
      </div>

      <h2 className="rsvp-success-title">
        {isYes ? "You're confirmed!" : "We'll miss you!"}
      </h2>

      <div className="rsvp-success-badge" style={{ borderColor: accentColor, color: accentColor }}>
        {isYes ? 'Attendance Confirmed ✓' : 'Response Received'}
      </div>

      <p className="rsvp-success-msg">
        {isYes
          ? `Thank you! Your attendance at ${eventName} has been confirmed. We look forward to celebrating with you.`
          : `Thank you for letting us know. We hope to see you at a future event.`}
      </p>

      {isYes && calendarUrl && (
        <div className="rsvp-success-calendar-wrap">
          <p className="rsvp-success-hint">
            📌 Don&apos;t forget — save the event to your calendar.
          </p>
          {/*
            Google Calendar first: guests almost always arrive from WhatsApp,
            whose in-app browser ignores Content-Disposition and renders the
            .ics as plain text instead of downloading it. A redirect to Google
            Calendar opens correctly in every webview.
          */}
          <a
            href={`${calendarUrl}?format=google`}
            className="rsvp-calendar-btn"
            style={{ background: accentColor, color: accentTextColor }}
            target="_blank"
            rel="noreferrer"
          >
            📅 Add to Google Calendar
          </a>
          <button
            type="button"
            className="rsvp-calendar-btn rsvp-calendar-btn--secondary"
            onClick={async () => {
              // Fetch as a blob so the download works cross-origin; the
              // `download` attribute alone is ignored on cross-origin hrefs.
              try {
                const res = await fetch(calendarUrl);
                if (!res.ok) throw new Error('Calendar download failed');
                const blob = await res.blob();
                const objectUrl = URL.createObjectURL(
                  new Blob([blob], { type: 'text/calendar' })
                );
                const link = document.createElement('a');
                link.href = objectUrl;
                link.download = 'event.ics';
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(objectUrl);
              } catch {
                // Webviews that block blob downloads still get the raw link.
                window.open(calendarUrl, '_blank', 'noopener,noreferrer');
              }
            }}
          >
            Apple / Outlook (.ics)
          </button>
        </div>
      )}

      <p className="rsvp-success-footer">
        Powered by <strong>SoftInvites</strong>
      </p>
    </div>
  );
}
