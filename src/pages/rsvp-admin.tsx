import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { RsvpAdminView } from 'src/sections/rsvp-admin/view';

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{`RSVP - ${CONFIG.appName}`}</title>
      </Helmet>
      <RsvpAdminView />
    </>
  );
}
