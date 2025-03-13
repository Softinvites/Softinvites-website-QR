import type { StackProps } from '@mui/material/Stack';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';


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
     
      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
        {`Working In Progress `}
    
      </Typography>

      <Box
        component="img"
        alt="Soft Invites"
        src="/assets/illustrations/illustration-dashboard.webp"
        sx={{ width: 200, my: 2 }}
      />

     
    </Box>
  );
}
