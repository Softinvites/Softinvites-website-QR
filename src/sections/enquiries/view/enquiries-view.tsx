import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import Pagination from '@mui/material/Pagination';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from 'src/components/iconify';
import { DashboardContent } from 'src/layouts/dashboard';
import { API_BASE } from 'src/utils/apiBase';

// ----------------------------------------------------------------------

type Enquiry = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  eventType: string;
  eventDate?: string;
  location?: string;
  guestCount?: string;
  services: string[];
  message?: string;
  status: 'new' | 'read' | 'responded' | 'archived';
  adminNotes?: string;
  notified: boolean;
  notificationError?: string | null;
  createdAt: string;
};

type Counts = Record<string, number>;

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'responded', label: 'Responded' },
  { value: 'archived', label: 'Archived' },
] as const;

const STATUS_COLOR: Record<Enquiry['status'], 'info' | 'default' | 'success' | 'warning'> = {
  new: 'info',
  read: 'default',
  responded: 'success',
  archived: 'warning',
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

// ----------------------------------------------------------------------

export function EnquiriesView() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem('token');
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadEnquiries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/contact`, {
        headers: authHeaders,
        params: { status, search: debouncedSearch || undefined, page, limit: 25 },
      });
      setEnquiries(Array.isArray(res.data?.messages) ? res.data.messages : []);
      setCounts(res.data?.counts || {});
      setPages(res.data?.pagination?.pages || 1);
      setTotal(res.data?.pagination?.total || 0);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load enquiries');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, status, debouncedSearch, page]);

  useEffect(() => {
    loadEnquiries();
  }, [loadEnquiries]);

  const openEnquiry = async (enquiry: Enquiry) => {
    setSelected(enquiry);
    setNotes(enquiry.adminNotes || '');

    // Opening marks it read server-side; reflect that locally without a refetch.
    if (enquiry.status === 'new') {
      try {
        await axios.get(`${API_BASE}/contact/${enquiry._id}`, { headers: authHeaders });
        setEnquiries((prev) =>
          prev.map((row) => (row._id === enquiry._id ? { ...row, status: 'read' } : row))
        );
        setCounts((prev) => ({
          ...prev,
          new: Math.max(0, (prev.new || 1) - 1),
          read: (prev.read || 0) + 1,
        }));
      } catch {
        // Non-fatal — the detail dialog is already populated from the list row.
      }
    }
  };

  const updateEnquiry = async (
    id: string,
    patch: { status?: Enquiry['status']; adminNotes?: string }
  ) => {
    setSaving(true);
    try {
      await axios.patch(`${API_BASE}/contact/${id}`, patch, { headers: authHeaders });
      toast.success('Enquiry updated');
      setSelected(null);
      loadEnquiries();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update enquiry');
    } finally {
      setSaving(false);
    }
  };

  const deleteEnquiry = async (id: string) => {
    if (!window.confirm('Delete this enquiry permanently?')) return;
    try {
      await axios.delete(`${API_BASE}/contact/${id}`, { headers: authHeaders });
      toast.success('Enquiry deleted');
      setSelected(null);
      loadEnquiries();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete enquiry');
    }
  };

  const exportCsv = async () => {
    try {
      const res = await axios.get(`${API_BASE}/contact/export`, {
        headers: authHeaders,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `softinvites-enquiries-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to export enquiries');
    }
  };

  return (
    <DashboardContent>
      <Box display="flex" alignItems="center" flexWrap="wrap" gap={2} mb={4}>
        <Box flexGrow={1}>
          <Typography variant="h4">Enquiries</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Contact form submissions from softinvite.com
          </Typography>
        </Box>

        <Button
          variant="outlined"
          color="inherit"
          startIcon={<Iconify icon="solar:download-minimalistic-bold" />}
          onClick={exportCsv}
        >
          Export CSV
        </Button>
        <Button
          variant="contained"
          color="inherit"
          startIcon={<Iconify icon="solar:refresh-bold" />}
          onClick={loadEnquiries}
        >
          Refresh
        </Button>
      </Box>

      <Card>
        <Tabs
          value={status}
          onChange={(_, value) => {
            setStatus(value);
            setPage(1);
          }}
          sx={{ px: 2, boxShadow: (theme) => `inset 0 -2px 0 0 ${theme.palette.divider}` }}
        >
          {STATUS_TABS.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <span>{tab.label}</span>
                  {tab.value !== 'all' && counts[tab.value] ? (
                    <Chip size="small" label={counts[tab.value]} />
                  ) : null}
                </Stack>
              }
            />
          ))}
        </Tabs>

        <Box sx={{ p: 2.5 }}>
          <TextField
            fullWidth
            size="small"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, event type, location…"
            InputProps={{
              startAdornment: (
                <Iconify icon="eva:search-fill" sx={{ mr: 1, color: 'text.disabled' }} />
              ),
            }}
          />
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress />
          </Box>
        ) : enquiries.length === 0 ? (
          <Box textAlign="center" py={8} px={3}>
            <Typography variant="h6" sx={{ color: 'text.secondary' }}>
              No enquiries yet
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.disabled', mt: 1 }}>
              Submissions from the website contact form will appear here.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: 800 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Event</TableCell>
                    <TableCell>Date / Location</TableCell>
                    <TableCell>Guests</TableCell>
                    <TableCell>Received</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {enquiries.map((enquiry) => (
                    <TableRow
                      key={enquiry._id}
                      hover
                      sx={{
                        cursor: 'pointer',
                        ...(enquiry.status === 'new' && { '& td': { fontWeight: 600 } }),
                      }}
                      onClick={() => openEnquiry(enquiry)}
                    >
                      <TableCell>
                        <Typography variant="subtitle2" noWrap>
                          {enquiry.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {enquiry.email}
                        </Typography>
                      </TableCell>
                      <TableCell>{enquiry.eventType}</TableCell>
                      <TableCell>
                        {[enquiry.eventDate, enquiry.location].filter(Boolean).join(' · ') ||
                          '—'}
                      </TableCell>
                      <TableCell>{enquiry.guestCount || '—'}</TableCell>
                      <TableCell>{formatDate(enquiry.createdAt)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={enquiry.status}
                          color={STATUS_COLOR[enquiry.status]}
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteEnquiry(enquiry._id);
                          }}
                        >
                          <Iconify icon="solar:trash-bin-trash-bold" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box display="flex" alignItems="center" justifyContent="space-between" p={2}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {total} enquir{total === 1 ? 'y' : 'ies'}
              </Typography>
              {pages > 1 && (
                <Pagination
                  count={pages}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                />
              )}
            </Box>
          </>
        )}
      </Card>

      {/* ------------------------------------------------------------ Detail */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
        {selected && (
          <>
            <DialogTitle>
              <Typography variant="h6">{selected.name}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {formatDate(selected.createdAt)}
              </Typography>
            </DialogTitle>

            <DialogContent dividers>
              <Stack spacing={2}>
                <Field label="Email">
                  <a href={`mailto:${selected.email}`}>{selected.email}</a>
                </Field>
                {selected.phone && <Field label="Phone">{selected.phone}</Field>}
                <Field label="Event type">{selected.eventType}</Field>
                {selected.eventDate && <Field label="Event date">{selected.eventDate}</Field>}
                {selected.location && <Field label="Location">{selected.location}</Field>}
                {selected.guestCount && (
                  <Field label="Approx. guests">{selected.guestCount}</Field>
                )}
                {selected.services?.length > 0 && (
                  <Field label="Services">
                    <Stack direction="row" flexWrap="wrap" gap={0.75}>
                      {selected.services.map((service) => (
                        <Chip key={service} size="small" label={service} variant="outlined" />
                      ))}
                    </Stack>
                  </Field>
                )}

                {selected.message && (
                  <>
                    <Divider />
                    <Field label="Message">
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {selected.message}
                      </Typography>
                    </Field>
                  </>
                )}

                {!selected.notified && (
                  <Typography variant="caption" sx={{ color: 'warning.dark' }}>
                    Admin notification email failed to send
                    {selected.notificationError ? `: ${selected.notificationError}` : '.'} The
                    enquiry itself was saved.
                  </Typography>
                )}

                <Divider />

                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Status"
                  value={selected.status}
                  onChange={(event) =>
                    setSelected({
                      ...selected,
                      status: event.target.value as Enquiry['status'],
                    })
                  }
                >
                  {['new', 'read', 'responded', 'archived'].map((option) => (
                    <MenuItem key={option} value={option} sx={{ textTransform: 'capitalize' }}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  size="small"
                  label="Internal notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </Stack>
            </DialogContent>

            <DialogActions>
              <Button
                color="error"
                onClick={() => deleteEnquiry(selected._id)}
                sx={{ mr: 'auto' }}
              >
                Delete
              </Button>
              <Button
                href={`mailto:${selected.email}?subject=${encodeURIComponent(
                  `Re: your ${selected.eventType} enquiry — SoftInvites`
                )}`}
              >
                Reply by email
              </Button>
              <Button
                variant="contained"
                disabled={saving}
                onClick={() =>
                  updateEnquiry(selected._id, {
                    status: selected.status,
                    adminNotes: notes,
                  })
                }
              >
                Save
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography
        variant="caption"
        sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.08em' }}
      >
        {label}
      </Typography>
      <Box sx={{ mt: 0.5 }}>{children}</Box>
    </Box>
  );
}
