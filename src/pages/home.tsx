import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { OverviewAnalyticsView } from 'src/sections/overview/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <Helmet>
        <title> Softinvite</title>
        <meta
          name="description"
          content="Guest Management, QR Code Generation, RSVP Management, E-Invitation Distribution, Event Management @shoriaevents"
        />
        <meta name="keywords" content="Guest Management, QR Code Generation, RSVP Management, E-Invitation Distribution, Event Management" />
      </Helmet>

      <OverviewAnalyticsView />
    </>
  );
}
