import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { GuestView } from 'src/sections/guest/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {`Guest - ${CONFIG.appName}`}</title>
      </Helmet>

      <GuestView />
    </>
  );
}
