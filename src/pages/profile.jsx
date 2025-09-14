import { UserView } from 'src/sections/Profile/view';

import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {`Profile - ${CONFIG.appName}`}</title>
      </Helmet>

      <UserView />
    </>
  );
}
