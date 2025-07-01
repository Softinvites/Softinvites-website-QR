import { Label } from 'src/components/label';
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
    title: 'Sign in',
    path: '/sign-in',
    icon: icon('ic-lock'),
  },

  {
    title: 'Not found',
    path: '/404',
    icon: icon('ic-disabled'),
  },
];
