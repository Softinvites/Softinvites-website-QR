import { UserView } from 'src/sections/ChangePassword/view';

import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {`Change Password - ${CONFIG.appName}`}</title>
      </Helmet>

      <UserView />
    </>
  );
}
