import type { BoxProps } from '@mui/material/Box';

import { forwardRef } from 'react';

import Box from '@mui/material/Box';

import { RouterLink } from 'src/routes/components';


// ----------------------------------------------------------------------

export type LogoProps = BoxProps & {
  href?: string;
  isSingle?: boolean;
  disableLink?: boolean;
};

export const Logo = forwardRef<HTMLDivElement, LogoProps>(
  (
    { href = '/', isSingle = true, disableLink = false, className, sx, ...other },
    ref
  ) => {

    // Define the logo components using public folder images
    const singleLogo = (
      <Box
        component="img"
        alt="Single logo"
        src="/apple-touch-icon.png"
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
      />
    );

    const fullLogo = (
      <Box
        component="img"
        alt="Full logo"
        src="/apple-touch-icon.png"
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
      />
    );

    const logoContent = isSingle ? singleLogo : fullLogo;

    return disableLink ? (
      <Box
        ref={ref}
        className={className}
        sx={{
          width: 40,
          height: 40,
          display: 'inline-flex',
          ...sx,
        }}
        {...other}
      >
        {logoContent}
      </Box>
    ) : (
      <Box
        component={RouterLink}
        to={href}
        ref={ref}
        className={className}
        sx={{
          width: 40,
          height: 40,
          display: 'inline-flex',
          ...sx,
        }}
        {...other}
      >
        {logoContent}
      </Box>
    );
  }
);

Logo.displayName = 'Logo';
