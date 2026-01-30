import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { CONFIG } from 'src/config-global';

import { GuestView } from 'src/sections/guest/view';

// ----------------------------------------------------------------------

export default function Page() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');
    const eventIds = localStorage.getItem('allRowIds');
    if (!tokenFromUrl && !eventIds) {
      navigate('/event', { replace: true });
      return;
    }
    setReady(true);
  }, [navigate]);

  if (!ready) return null;

  return (
    <>
      <Helmet>
        <title> {`Guest - ${CONFIG.appName}`}</title>
      </Helmet>

      <GuestView />
    </>
  );
}
