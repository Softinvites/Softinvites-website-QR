import type { StackProps } from '@mui/material/Stack';

import Box from '@mui/material/Box';


// ----------------------------------------------------------------------

export function NavUpgrade({ sx, ...other }: StackProps) {
  return (
    <Box
      display="flex"
      alignItems="center"
      flexDirection="column"
      sx={{ mb: 4, textAlign: 'center', ...sx }}
      {...other}
    >
     


      <Box
        component="img"
        alt="Soft Invites"
        src="/assets/illustrations/illustration-dashboard.webp"
        sx={{ width: 200, my: 2 }}
      />

     
    </Box>
  );
}
