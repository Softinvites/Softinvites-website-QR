import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-toastify';

import { API_BASE } from 'src/utils/apiBase';

import './rsvp.css';

type Status = 'yes' | 'no' | 'maybe' | 'pending';

type RSVPField = {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'number';
  required?: boolean;
  options?: string[];
};

type RSVPForm = {
  fields: RSVPField[];
  allowUpdates: boolean;
  enableNameValidation: boolean;
};

type RsvpResponse = {
  guest: { id: string; fullname: string };
  event: {
    id: string;
    name: string;
    date: string;
    location?: string;
    iv?: string;
    description?: string;
  };
  rsvp: { status: Status; responses: Record<string, any>; respondedAt?: string };
  form: RSVPForm;
};

const STATUS_OPTIONS: Status[] = ['yes', 'no', 'maybe'];

function formatDate(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function RsvpPage() {
  const { token: tokenFromPath } = useParams();
  const [searchParams] = useSearchParams();
  const token = useMemo(
    () => tokenFromPath || searchParams.get('token') || '',
    [tokenFromPath, searchParams]
  );

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<RsvpResponse | null>(null);

  const [fullname, setFullname] = useState('');
  const [status, setStatus] = useState<Status>('pending');
  const [responses, setResponses] = useState<Record<string, any>>({});

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
        const res = await axios.get<RsvpResponse>(`${API_BASE}/rsvp/${token}`);
        if (ignore) return;
        const data = res.data;
        const nextStatus = (data.rsvp.status || 'pending') as Status;
        setPayload(data);
        setFullname(data.guest.fullname || '');
        setStatus(nextStatus);
        setResponses({
          ...data.rsvp.responses,
          attendance:
            data.rsvp.responses?.attendance || (nextStatus !== 'pending' ? nextStatus : ''),
        });
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

  const formLocked = useMemo(() => {
    if (!payload) return false;
    return payload.form.allowUpdates === false && payload.rsvp.status !== 'pending';
  }, [payload]);

  const filteredFields = useMemo(() => {
    if (!payload) return [] as RSVPField[];
    return (payload.form.fields || []).filter((field) => field.name !== 'attendance');
  }, [payload]);

  const handleFieldChange = (field: RSVPField, value: any) => {
    setResponses((prev) => ({ ...prev, [field.name]: value }));
  };

  const toggleCheckbox = (field: RSVPField, option: string) => {
    setResponses((prev) => {
      const current = Array.isArray(prev[field.name]) ? (prev[field.name] as string[]) : [];
      const next = current.includes(option)
        ? current.filter((v) => v !== option)
        : [...current, option];
      return { ...prev, [field.name]: next };
    });
  };

  const validateNameIfNeeded = async () => {
    if (!payload || payload.form.enableNameValidation === false) return true;
    try {
      await axios.post(`${API_BASE}/rsvp/${token}/validate`, { fullname });
      return true;
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Name validation failed');
      return false;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!payload || !token) return;
    if (!fullname.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!STATUS_OPTIONS.includes(status)) {
      toast.error('Please select an option');
      return;
    }
    if (formLocked) {
      toast.error('Updates are disabled for this RSVP');
      return;
    }

    const nameOk = await validateNameIfNeeded();
    if (!nameOk) return;

    setSubmitting(true);
    try {
      const submission = {
        fullname,
        status,
        responses: { ...responses, attendance: status },
      };
      const res = await axios.post(`${API_BASE}/rsvp/${token}/submit`, submission);
      toast.success('RSVP submitted. Thank you!');
      setPayload((prev) =>
        prev
          ? {
              ...prev,
              rsvp: {
                status,
                responses: { ...responses, attendance: status },
                respondedAt: res.data?.rsvp?.respondedAt || prev.rsvp.respondedAt,
              },
            }
          : prev
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit RSVP');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: RSVPField, fieldId: string, labelledBy?: string) => {
    const value = responses[field.name];
    const commonProps = {
      name: field.name,
      required: field.required,
      disabled: submitting || formLocked,
    } as const;

    if (field.type === 'textarea') {
      return (
        <textarea
          id={fieldId}
          {...commonProps}
          value={value || ''}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          rows={4}
        />
      );
    }

    if (field.type === 'select') {
      return (
        <select
          id={fieldId}
          {...commonProps}
          value={value || ''}
          onChange={(e) => handleFieldChange(field, e.target.value)}
        >
          <option value="">Select an option</option>
          {(field.options || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === 'radio') {
      return (
        <div className="rsvp-radio-group" role="radiogroup" aria-labelledby={labelledBy}>
          {(field.options || []).map((opt, index) => {
            const optionId = `${fieldId}-${index}`;
            return (
              <label key={opt} className="rsvp-radio" htmlFor={optionId}>
                <input
                  id={optionId}
                  type="radio"
                  {...commonProps}
                  value={opt}
                  checked={value === opt}
                  onChange={() => handleFieldChange(field, opt)}
                />
                <span>{opt}</span>
              </label>
            );
          })}
        </div>
      );
    }

    if (field.type === 'number') {
      return (
        <input
          id={fieldId}
          type="number"
          min={0}
          step={1}
          {...commonProps}
          value={value ?? ''}
          onChange={(e) =>
            handleFieldChange(field, e.target.value === '' ? '' : Number(e.target.value))
          }
        />
      );
    }

    if (field.type === 'checkbox') {
      const current = Array.isArray(value) ? value : [];
      return (
        <div className="rsvp-checkbox-group" role="group" aria-labelledby={labelledBy}>
          {(field.options || []).map((opt, index) => {
            const optionId = `${fieldId}-${index}`;
            return (
              <label key={opt} className="rsvp-checkbox" htmlFor={optionId}>
                <input
                  id={optionId}
                  type="checkbox"
                  {...commonProps}
                  checked={current.includes(opt)}
                  onChange={() => toggleCheckbox(field, opt)}
                />
                <span>{opt}</span>
              </label>
            );
          })}
        </div>
      );
    }

    return (
      <input
        id={fieldId}
        type="text"
        {...commonProps}
        value={value || ''}
        onChange={(e) => handleFieldChange(field, e.target.value)}
      />
    );
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

  return (
    <div className="rsvp-page">
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
                <div className="rsvp-pill">Special RSVP</div>
                <h1>{payload.event.name}</h1>
                <p className="rsvp-muted">Fill the form to confirm your attendance.</p>
              </div>

              <label className="rsvp-field" htmlFor="rsvp-fullname">
                <span>Guest Name</span>
                <input
                  id="rsvp-fullname"
                  type="text"
                  name="fullname"
                  value={fullname}
                  disabled={submitting || formLocked}
                  onChange={(e) => setFullname(e.target.value)}
                  required
                />
              </label>

              <div className="rsvp-field">
                <span>Will you attend?</span>
                <div className="rsvp-statuses">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`rsvp-chip ${status === opt ? 'active' : ''} ${opt}`}
                      onClick={() => {
                        setStatus(opt);
                        setResponses((prev) => ({ ...prev, attendance: opt }));
                      }}
                      disabled={submitting || formLocked}
                    >
                      {opt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {filteredFields.map((field) => {
                const fieldId = `rsvp-${field.name}`;
                const isGrouped = field.type === 'radio' || field.type === 'checkbox';
                const labelId = `${fieldId}-label`;
                if (isGrouped) {
                  return (
                    <div key={field.name} className="rsvp-field">
                      <span id={labelId}>
                        {field.label}
                        {field.required ? ' *' : ''}
                      </span>
                      {renderField(field, fieldId, labelId)}
                    </div>
                  );
                }

                return (
                  <label key={field.name} className="rsvp-field" htmlFor={fieldId}>
                    <span>
                      {field.label}
                      {field.required ? ' *' : ''}
                    </span>
                    {renderField(field, fieldId)}
                  </label>
                );
              })}

              {payload.rsvp.respondedAt && (
                <p className="rsvp-muted small">
                  Last response: {formatDate(payload.rsvp.respondedAt)}
                </p>
              )}

              {formLocked && (
                <p className="rsvp-warning">This RSVP is locked and cannot be updated.</p>
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
