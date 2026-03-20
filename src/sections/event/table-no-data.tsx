import type { TableRowProps } from '@mui/material/TableRow';

import Box from '@mui/material/Box';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

type TableNoDataProps = TableRowProps & {
  searchQuery: string;
  statusFilterLabel?: string;
};

export function TableNoData({ searchQuery, statusFilterLabel, ...other }: TableNoDataProps) {
  const trimmedQuery = searchQuery.trim();
  const hasSearchQuery = Boolean(trimmedQuery);
  const hasStatusFilter = Boolean(statusFilterLabel);

  return (
    <TableRow {...other}>
      <TableCell align="center" colSpan={7}>
        <Box sx={{ py: 15, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Not found
          </Typography>

          <Typography variant="body2">
            {hasStatusFilter
              ? `No ${statusFilterLabel?.toLowerCase()} events found`
              : 'No matching events found'}
            {hasSearchQuery && (
              <>
                {' '}
                for <strong>&quot;{trimmedQuery}&quot;</strong>
              </>
            )}
            .
            <br />
            Try checking for typos or changing the event status filter.
          </Typography>
        </Box>
      </TableCell>
    </TableRow>
  );
}
