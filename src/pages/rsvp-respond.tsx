import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import { API_BASE } from 'src/utils/apiBase';

export default function RsvpRespondPage() {
  const { rsvpId } = useParams();
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status');

  useEffect(() => {
    if (!rsvpId || !status) return;
    const next = `${API_BASE}/rsvp/respond/${rsvpId}?status=${encodeURIComponent(status)}`;
    window.location.replace(next);
  }, [rsvpId, status]);

  if (!rsvpId || !status) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Invalid RSVP link</h1>
        <p>This RSVP link is missing required information.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Updating your RSVP...</h1>
      <p>You will be redirected shortly.</p>
    </div>
  );
}
