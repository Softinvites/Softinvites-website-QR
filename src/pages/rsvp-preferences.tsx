import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

import { API_BASE } from 'src/utils/apiBase';

export default function RsvpPreferencesPage() {
  const { token = '' } = useParams();
  const [loading, setLoading] = useState(true);
  const [preferredChannels, setPreferredChannels] = useState<string[]>(['email']);
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/rsvp/preferences/${token}`);
        const prefs = res.data?.preferences || {};
        setPreferredChannels(prefs.preferredChannels || ['email']);
        setWhatsappOptIn(!!prefs.whatsappOptIn);
        setSmsOptIn(!!prefs.smsOptIn);
        setWhatsappNumber(prefs.whatsappNumber || '');
        setMobileNumber(prefs.mobileNumber || '');
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Failed to load preferences');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleSave = async () => {
    try {
      await axios.post(`${API_BASE}/rsvp/preferences/${token}`, {
        preferredChannels,
        whatsappOptIn,
        smsOptIn,
        whatsappNumber,
        mobileNumber,
      });
      toast.success('Preferences saved');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save preferences');
    }
  };

  if (!token) {
    return <div style={{ padding: 24 }}>Invalid preference link.</div>;
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <h2>Communication Preferences</h2>
      {loading ? (
        <p>Loading preferences...</p>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <input
              id="pref-email-required"
              type="checkbox"
              checked
              disabled
              aria-label="Email (required)"
            />
            <span style={{ marginLeft: 8 }}>Email (required)</span>
          </div>
          <div style={{ marginBottom: 16 }}>
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
            <span style={{ marginLeft: 8 }}>WhatsApp</span>
          </div>
          <div style={{ marginBottom: 16 }}>
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
            <span style={{ marginLeft: 8 }}>SMS</span>
          </div>
          <div style={{ marginBottom: 16 }}>
            <input
              id="pref-whatsapp-optin"
              type="checkbox"
              checked={whatsappOptIn}
              aria-label="WhatsApp Opt-In"
              onChange={(e) => setWhatsappOptIn(e.target.checked)}
            />
            <span style={{ marginLeft: 8 }}>WhatsApp Opt-In</span>
            <div>
              <input
                type="tel"
                placeholder="WhatsApp number"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                style={{ width: '100%', marginTop: 8, padding: 8 }}
              />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <input
              id="pref-sms-optin"
              type="checkbox"
              checked={smsOptIn}
              aria-label="SMS Opt-In"
              onChange={(e) => setSmsOptIn(e.target.checked)}
            />
            <span style={{ marginLeft: 8 }}>SMS Opt-In</span>
            <div>
              <input
                type="tel"
                placeholder="Mobile number"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                style={{ width: '100%', marginTop: 8, padding: 8 }}
              />
            </div>
          </div>
          <button type="button" onClick={handleSave} style={{ padding: '10px 16px' }}>
            Save Preferences
          </button>
        </>
      )}
    </div>
  );
}
