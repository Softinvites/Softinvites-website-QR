import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor width="100%" height="100%" src={`/assets/icons/navbar/${name}.svg`} />
);

export const navData = [
  {
    // '/home', not '/'. On softinvite.com the root belongs to the brand site,
    // so '/' would leave the app on a refresh or open-in-new-tab. Pointing here
    // also makes the active-state highlight work, since the page really is /home.
    title: 'Dashboard',
    path: '/home',
    icon: icon('ic-analytics'),
  },
  {
    title: 'Event',
    path: '/event',
    icon: icon('ic-user'),
  },
  // {
  //   title: 'WhatsApp Templates',
  //   path: '/whatsapp-templates',
  //   icon: icon('ic-cart'),
  // },

  {
    title: 'Enquiries',
    path: '/enquiries',
    icon: icon('ic-blog'),
  },

    {
    title: 'Change Password',
    path: '/change-password',
    icon: icon('ic-lock'),
  },

      {
    title: 'Profile',
    path: '/profile',
    icon: icon('ic-lock'),
  },

];
