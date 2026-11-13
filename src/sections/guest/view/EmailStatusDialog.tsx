import axios from 'axios';
import { useMemo, useState, useEffect, useCallback } from 'react';

import {
  Box,
  Chip,
  Grid,
  Table,
  Paper,
  Alert,
  Stack,
  Button,
  Dialog,
  TableRow,
  MenuItem,
  TableBody,
  TableCell,
  TableHead,
  TextField,
  Typography,
  DialogTitle,
  DialogActions,
  DialogContent,
  TableContainer,
  InputAdornment,
  TablePagination,
} from '@mui/material';

import { API_BASE } from 'src/utils/apiBase';

import { Iconify } from 'src/components/iconify/iconify';

type EmailStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'bounced'
  | 'rejected'
  | 'complained'
  | 'failed';

interface EmailRow {
  id: string;
  guestName: string;
  email: string;
  subject: string;
  status: EmailStatus;
  failureReason: string;
  sentAt?: string;
  deliveredAt?: string | null;
  failedAt?: string | null;
  opened: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  eventId: string;
}

const FAILED: EmailStatus[] = ['bounced', 'rejected', 'complained', 'failed'];

const STATUS_LABEL: Record<EmailStatus, string> = {
  pending: 'Pending',
  sent: 'Sent',
  delivered: 'Delivered',
  bounced: 'Bounced',
  rejected: 'Rejected',
  complained: 'Marked as spam',
  failed: 'Failed',
};

const statusColor = (s: EmailStatus) =>
  FAILED.includes(s) ? 'error' : s === 'delivered' ? 'success' : s === 'sent' ? 'info' : 'default';

const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString() : '');

export default function EmailStatusDialog({ open, onClose, eventId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [filter, setFilter] = useState<'all' | 'failed' | EmailStatus>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/guest/email-status/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRows(res.data?.messages || []);
    } catch (e) {
      console.error('Error fetching email status:', e);
      setError('Could not load email status. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (open && eventId) {
      setPage(0);
      load();
    }
  }, [open, eventId, load]);

  const counts = useMemo(() => {
    const c = { total: rows.length, delivered: 0, sent: 0, failed: 0, pending: 0 };
    rows.forEach((r) => {
      if (FAILED.includes(r.status)) c.failed += 1;
      else if (r.status === 'delivered') c.delivered += 1;
      else if (r.status === 'sent') c.sent += 1;
      else c.pending += 1;
    });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === 'failed' && !FAILED.includes(r.status)) return false;
      if (filter !== 'all' && filter !== 'failed' && r.status !== filter) return false;
      if (!q) return true;
      return (
        r.email?.toLowerCase().includes(q) ||
        r.guestName?.toLowerCase().includes(q) ||
        r.subject?.toLowerCase().includes(q)
      );
    });
  }, [rows, filter, search]);

  const summary = [
    { label: 'Total', value: counts.total, bg: '#f5f5f5', key: 'all' as const },
    { label: 'Delivered', value: counts.delivered, bg: '#e8f5e9', key: 'delivered' as const },
    { label: 'Sent (awaiting)', value: counts.sent, bg: '#e3f2fd', key: 'sent' as const },
    { label: 'Failed / Bounced', value: counts.failed, bg: '#ffebee', key: 'failed' as const },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="material-symbols:mail" />
          <span>Email Status</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Bounces can arrive minutes or hours after sending; this list updates when they do.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          {summary.map((s) => (
            <Grid item xs={6} sm={3} key={s.label}>
              <Paper
                onClick={() => {
                  setFilter(s.key);
                  setPage(0);
                }}
                sx={{
                  p: 1.5,
                  bgcolor: s.bg,
                  cursor: 'pointer',
                  outline: filter === s.key ? '2px solid' : 'none',
                  outlineColor: 'primary.main',
                }}
              >
                <Typography variant="h5">{s.value}</Typography>
                <Typography variant="caption">{s.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
          <TextField
            size="small"
            placeholder="Search name, email or subject"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            sx={{ flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            select
            size="small"
            label="Status"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as any);
              setPage(0);
            }}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="failed">All failures</MenuItem>
            {(Object.keys(STATUS_LABEL) as EmailStatus[]).map((s) => (
              <MenuItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="outlined"
            onClick={load}
            disabled={loading}
            startIcon={<Iconify icon="eva:refresh-fill" />}
          >
            Refresh
          </Button>
        </Stack>

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Guest</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Sent</TableCell>
                <TableCell>Reason</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No emails match.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.guestName || '—'}</TableCell>
                    <TableCell sx={{ wordBreak: 'break-all' }}>{r.email}</TableCell>
                    <TableCell>{r.subject}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={STATUS_LABEL[r.status] || r.status}
                        color={statusColor(r.status) as any}
                      />
                      {r.opened && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          Opened
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmt(r.sentAt)}</TableCell>
                    <TableCell>
                      {r.failureReason && (
                        <Box>
                          <Typography variant="caption" color="error">
                            {r.failureReason}
                          </Typography>
                          {r.failedAt && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              {fmt(r.failedAt)}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[25, 50, 100]}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
