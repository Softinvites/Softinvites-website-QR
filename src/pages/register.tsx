import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { RegisterPage } from 'src/sections/aut';


// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {`Register - ${CONFIG.appName}`}</title>
      </Helmet>

      <RegisterPage />
    </>
  );
}
