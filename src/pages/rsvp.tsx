import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-toastify';

import { API_BASE } from 'src/utils/apiBase';

import './rsvp.css';

type AttendanceStatus = 'yes' | 'no';
type RsvpCustomFieldType = 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'number';
type RsvpCustomField = {
  id: string;
  label: string;
  type: RsvpCustomFieldType;
  required: boolean;
  placeholder: string;
  options: string[];
};
type CustomResponseValue = string | string[];
type RsvpFormSettings = {
  guestNameLabel: string;
  guestNamePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  attendanceEnabled: boolean;
  attendanceLabel: string;
  attendanceYesLabel: string;
  attendanceNoLabel: string;
  commentsLabel: string;
  commentsPlaceholder: string;
  submitLabel: string;
  customFields: RsvpCustomField[];
};

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

const SUPPORTED_CUSTOM_FIELD_TYPES = new Set<RsvpCustomFieldType>([
  'text',
  'textarea',
  'select',
  'radio',
  'checkbox',
  'number',
]);

const defaultFormSettings: RsvpFormSettings = {
  guestNameLabel: 'Guest Name',
  guestNamePlaceholder: '',
  emailLabel: 'Email',
  emailPlaceholder: '',
  phoneLabel: 'Phone Number',
  phonePlaceholder: '',
  attendanceEnabled: true,
  attendanceLabel: 'Will you attend?',
  attendanceYesLabel: 'YES, I WILL ATTEND',
  attendanceNoLabel: 'UNABLE TO ATTEND',
  commentsLabel: 'Additional Comments',
  commentsPlaceholder: '',
  submitLabel: 'Submit',
  customFields: [],
};

const customFieldNeedsOptions = (type: RsvpCustomFieldType) =>
  type === 'select' || type === 'radio' || type === 'checkbox';

const normalizeCustomFields = (value: any): RsvpCustomField[] => {
  if (!Array.isArray(value)) return [];
  return value.map((field, index) => {
    const type = SUPPORTED_CUSTOM_FIELD_TYPES.has(field?.type) ? field.type : 'text';
    return {
      id:
        typeof field?.id === 'string' && field.id.trim()
          ? field.id.trim()
          : `custom_field_${index + 1}`,
      label:
        typeof field?.label === 'string' && field.label.trim()
          ? field.label.trim()
          : `Question ${index + 1}`,
      type,
      required: field?.required === true,
      placeholder: typeof field?.placeholder === 'string' ? field.placeholder : '',
      options: customFieldNeedsOptions(type)
        ? Array.isArray(field?.options)
            ? field.options.map((option: any) => String(option || '').trim()).filter(Boolean)
            : []
        : [],
    };
  });
};

const createInitialResponses = (fields: RsvpCustomField[]) =>
  fields.reduce<Record<string, CustomResponseValue>>((acc, field) => {
    acc[field.id] = field.type === 'checkbox' ? [] : '';
    return acc;
  }, {});

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
  const [responses, setResponses] = useState<Record<string, CustomResponseValue>>({});

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
  const formSettings = useMemo(() => {
    const savedSettings = payload?.event?.rsvpFormSettings || {};
    return {
      ...defaultFormSettings,
      ...savedSettings,
      submitLabel: 'Submit',
      customFields: normalizeCustomFields(savedSettings.customFields),
    };
  }, [payload]);
  const attendanceEnabled = formSettings.attendanceEnabled !== false;

  useEffect(() => {
    setResponses(createInitialResponses(formSettings.customFields));
  }, [formSettings.customFields]);

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
    if (attendanceEnabled && !status) {
      toast.error('Please select an option');
      return;
    }
    const missingRequiredField = formSettings.customFields.find((field) => {
      if (!field.required) return false;
      const value = responses[field.id];
      if (field.type === 'checkbox') {
        return !Array.isArray(value) || value.length === 0;
      }
      return typeof value !== 'string' || !value.trim();
    });
    if (missingRequiredField) {
      toast.error(`Please complete "${missingRequiredField.label}"`);
      return;
    }
    if (formLocked) {
      toast.error('This RSVP form is already submitted.');
      return;
    }

    setSubmitting(true);
    try {
      const responsePayload = formSettings.customFields.reduce<Record<string, CustomResponseValue>>(
        (acc, field) => {
          const value = responses[field.id];
          acc[field.id] = field.type === 'checkbox' ? (Array.isArray(value) ? value : []) : typeof value === 'string' ? value : '';
          return acc;
        },
        {}
      );
      await axios.post(`${API_BASE}/rsvp/form/${token}/submit`, {
        guestName,
        email,
        phone,
        attendanceStatus: attendanceEnabled ? status : undefined,
        comments,
        responses: responsePayload,
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
                <p className="rsvp-muted">
                  {attendanceEnabled
                    ? 'Fill the form to confirm your attendance.'
                    : 'Fill the form and submit your response.'}
                </p>
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

              {formSettings.customFields.map((field) => {
                const value = responses[field.id];
                const inputId = `rsvp-custom-${field.id}`;

                if (field.type === 'textarea') {
                  return (
                    <label className="rsvp-field" htmlFor={inputId} key={field.id}>
                      <span>{field.label}</span>
                      <textarea
                        id={inputId}
                        name={field.id}
                        value={typeof value === 'string' ? value : ''}
                        disabled={submitting || formLocked}
                        placeholder={field.placeholder}
                        onChange={(e) =>
                          setResponses((prev) => ({ ...prev, [field.id]: e.target.value }))
                        }
                        rows={4}
                      />
                    </label>
                  );
                }

                if (field.type === 'select') {
                  return (
                    <label className="rsvp-field" htmlFor={inputId} key={field.id}>
                      <span>{field.label}</span>
                      <select
                        id={inputId}
                        name={field.id}
                        value={typeof value === 'string' ? value : ''}
                        disabled={submitting || formLocked}
                        onChange={(e) =>
                          setResponses((prev) => ({ ...prev, [field.id]: e.target.value }))
                        }
                      >
                        <option value="">{field.placeholder || `Select ${field.label}`}</option>
                        {field.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                }

                if (field.type === 'radio') {
                  return (
                    <div className="rsvp-field" key={field.id}>
                      <span>{field.label}</span>
                      <div className="rsvp-radio-group">
                        {field.options.map((option) => (
                          <label className="rsvp-radio" key={option} htmlFor={`${inputId}-${option}`}>
                            <input
                              id={`${inputId}-${option}`}
                              type="radio"
                              name={field.id}
                              value={option}
                              checked={value === option}
                              disabled={submitting || formLocked}
                              onChange={(e) =>
                                setResponses((prev) => ({ ...prev, [field.id]: e.target.value }))
                              }
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (field.type === 'checkbox') {
                  const selectedValues = Array.isArray(value) ? value : [];
                  return (
                    <div className="rsvp-field" key={field.id}>
                      <span>{field.label}</span>
                      <div className="rsvp-checkbox-group">
                        {field.options.map((option) => (
                          <label
                            className="rsvp-checkbox"
                            key={option}
                            htmlFor={`${inputId}-${option}`}
                          >
                            <input
                              id={`${inputId}-${option}`}
                              type="checkbox"
                              name={`${field.id}[]`}
                              value={option}
                              checked={selectedValues.includes(option)}
                              disabled={submitting || formLocked}
                              onChange={(e) =>
                                setResponses((prev) => {
                                  const current = Array.isArray(prev[field.id])
                                    ? (prev[field.id] as string[])
                                    : [];
                                  return {
                                    ...prev,
                                    [field.id]: e.target.checked
                                      ? [...current, option]
                                      : current.filter((entry: string) => entry !== option),
                                  };
                                })
                              }
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <label className="rsvp-field" htmlFor={inputId} key={field.id}>
                    <span>{field.label}</span>
                    <input
                      id={inputId}
                      type={field.type === 'number' ? 'number' : 'text'}
                      name={field.id}
                      value={typeof value === 'string' ? value : ''}
                      disabled={submitting || formLocked}
                      placeholder={field.placeholder}
                      onChange={(e) =>
                        setResponses((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                    />
                  </label>
                );
              })}

              {attendanceEnabled && (
                <div className="rsvp-field">
                  <span>{formSettings.attendanceLabel}</span>
                  <div className="rsvp-statuses">
                    {([
                      ['yes', formSettings.attendanceYesLabel],
                      ['no', formSettings.attendanceNoLabel],
                    ] as const).map(([opt, label]) => (
                      <button
                        key={opt}
                        type="button"
                        className={`rsvp-chip ${status === opt ? 'active' : ''} ${opt}`}
                        onClick={() => setStatus(opt)}
                        disabled={submitting || formLocked}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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

              {formLocked && (
                <p className="rsvp-warning">This form has already been submitted.</p>
              )}

              <button type="submit" className="rsvp-submit" disabled={submitting || formLocked}>
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
