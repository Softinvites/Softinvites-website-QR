import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { EnquiriesView } from 'src/sections/enquiries/view/enquiries-view';

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{`Enquiries - ${CONFIG.appName}`}</title>
      </Helmet>

      <EnquiriesView />
    </>
  );
}
