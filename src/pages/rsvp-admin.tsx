import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { CONFIG } from 'src/config-global';
import { RsvpAdminView } from 'src/sections/rsvp-admin/view';

export default function Page() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const eventIds = localStorage.getItem('allRowIds');
    if (!eventIds) {
      navigate('/event', { replace: true });
      return;
    }
    setReady(true);
  }, [navigate]);

  if (!ready) return null;

  return (
    <>
      <Helmet>
        <title>{`RSVP - ${CONFIG.appName}`}</title>
      </Helmet>
      <RsvpAdminView />
    </>
  );
}
