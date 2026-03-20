import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';

import type { EventStatusFilter } from './utils';

// ----------------------------------------------------------------------

type UserTableToolbarProps = {
  numSelected: number;
  filterName: string;
  filterStatus: EventStatusFilter;
  statusCounts: Record<EventStatusFilter, number>;
  onFilterName: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFilterStatus: (value: EventStatusFilter) => void;
};

export function UserTableToolbar({
  numSelected,
  filterName,
  filterStatus,
  statusCounts,
  onFilterName,
  onFilterStatus,
}: UserTableToolbarProps) {
  return (
    <Toolbar
      sx={{
        minHeight: 96,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        justifyContent: 'space-between',
        p: (theme) => theme.spacing(0, 1, 0, 3),
        ...(numSelected > 0 && {
          color: 'primary.main',
          bgcolor: 'primary.lighter',
        }),
      }}
    >
      {numSelected > 0 ? (
        <Typography component="div" variant="subtitle1">
          {numSelected} selected
        </Typography>
      ) : (
        <OutlinedInput
          fullWidth
          value={filterName}
          onChange={onFilterName}
          placeholder="Search event..."
          startAdornment={
            <InputAdornment position="start">
              <Iconify width={20} icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          }
          sx={{ maxWidth: 320 }}
        />
      )}

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Button
          size="small"
          variant={filterStatus === 'all' ? 'contained' : 'outlined'}
          onClick={() => onFilterStatus('all')}
          sx={{ textTransform: 'none' }}
        >
          All ({statusCounts.all})
        </Button>
        <Button
          size="small"
          color={filterStatus === 'active' ? 'success' : 'inherit'}
          variant={filterStatus === 'active' ? 'contained' : 'outlined'}
          onClick={() => onFilterStatus('active')}
          sx={{ textTransform: 'none' }}
        >
          Active ({statusCounts.active})
        </Button>
        <Button
          size="small"
          color={filterStatus === 'expired' ? 'error' : 'inherit'}
          variant={filterStatus === 'expired' ? 'contained' : 'outlined'}
          onClick={() => onFilterStatus('expired')}
          sx={{ textTransform: 'none' }}
        >
          Expired ({statusCounts.expired})
        </Button>
      </Stack>
    </Toolbar>
  );
}
