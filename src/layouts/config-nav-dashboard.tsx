import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor width="100%" height="100%" src={`/assets/icons/navbar/${name}.svg`} />
);

export const navData = [
  {
    title: 'Dashboard',
    path: '/',
    icon: icon('ic-analytics'),
  },
  {
    title: 'Event',
    path: '/event',
    icon: icon('ic-user'),
  },
  {
    title: 'RSVP',
    path: '/rsvp-admin',
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
