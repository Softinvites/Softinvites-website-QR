import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { WhatsAppTemplatesView } from 'src/sections/whatsapp-templates/view/whatsapp-templates-view';

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{`WhatsApp Templates - ${CONFIG.appName}`}</title>
      </Helmet>

      <WhatsAppTemplatesView />
    </>
  );
}