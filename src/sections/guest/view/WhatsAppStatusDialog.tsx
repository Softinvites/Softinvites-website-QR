import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
  Box,
  Grid,
  TextField,
  MenuItem,
  Stack,
  InputAdornment,
  TablePagination,
} from '@mui/material';
import { Iconify } from 'src/components/iconify/iconify';
import axios from 'axios';
import { API_BASE } from 'src/utils/apiBase';

interface WhatsAppMessage {
  id: string;
  guestName: string;
  phoneNumber: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'not_on_whatsapp';
  templateName: string;
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
  errorMessage?: string;
}

interface WhatsAppStats {
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  not_on_whatsapp: number;
}

interface WhatsAppStatusDialogProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'sent', label: 'Sent' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'read', label: 'Read' },
  { value: 'failed', label: 'Failed' },
  { value: 'not_on_whatsapp', label: 'No WhatsApp' },
];

export default function WhatsAppStatusDialog({
  open,
  onClose,
  eventId,
}: WhatsAppStatusDialogProps) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [stats, setStats] = useState<WhatsAppStats>({
    total: 0, sent: 0, delivered: 0, read: 0, failed: 0, not_on_whatsapp: 0,
  });
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const fetchWhatsAppStatus = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/whatsapp/status/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(response.data.stats);
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Error fetching WhatsApp status:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (open && eventId) {
      fetchWhatsAppStatus();
      // Reset filters on open
      setSearchName('');
      setSearchPhone('');
      setFilterStatus('');
      setDateFrom('');
      setDateTo('');
      setPage(0);
    }
  }, [open, eventId, fetchWhatsAppStatus]);

  // Apply filters
  const filteredMessages = useMemo(() => {
    const nameQuery = searchName.trim().toLowerCase();
    const phoneQuery = searchPhone.trim().toLowerCase();
    const fromTs = dateFrom ? new Date(dateFrom).getTime() : null;
    const toTs = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;

    return messages.filter((msg) => {
      if (nameQuery && !msg.guestName?.toLowerCase().includes(nameQuery)) return false;
      if (phoneQuery && !msg.phoneNumber?.toLowerCase().includes(phoneQuery)) return false;
      if (filterStatus && msg.status !== filterStatus) return false;
      if (fromTs && new Date(msg.sentAt).getTime() < fromTs) return false;
      if (toTs && new Date(msg.sentAt).getTime() > toTs) return false;
      return true;
    });
  }, [messages, searchName, searchPhone, filterStatus, dateFrom, dateTo]);

  const paginatedMessages = useMemo(
    () => filteredMessages.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredMessages, page, rowsPerPage]
  );

  const handleClearFilters = () => {
    setSearchName('');
    setSearchPhone('');
    setFilterStatus('');
    setDateFrom('');
    setDateTo('');
    setPage(0);
  };

  // CSV Export — matches Twilio messaging log format
  const handleExportCsv = () => {
    const headers = ['Guest Name', 'Phone Number', 'Status', 'Template', 'Sent At', 'Delivered At', 'Read At', 'Error'];
    const escape = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };
    const rows = filteredMessages.map((msg) => [
      escape(msg.guestName),
      escape(msg.phoneNumber),
      escape(msg.status),
      escape(msg.templateName),
      escape(msg.sentAt ? new Date(msg.sentAt).toISOString() : ''),
      escape(msg.deliveredAt ? new Date(msg.deliveredAt).toISOString() : ''),
      escape(msg.readAt ? new Date(msg.readAt).toISOString() : ''),
      escape(msg.errorMessage || ''),
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `whatsapp-log-${eventId}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'info';
      case 'delivered': return 'warning';
      case 'read': return 'success';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return 'material-symbols:send';
      case 'delivered': return 'material-symbols:check';
      case 'read': return 'material-symbols:done-all';
      case 'failed': return 'material-symbols:error';
      default: return 'material-symbols:phone-disabled';
    }
  };

  const hasActiveFilters = searchName || searchPhone || filterStatus || dateFrom || dateTo;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <Iconify icon="logos:whatsapp-icon" />
            WhatsApp Message Log
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<Iconify icon="mdi:download" />}
            onClick={handleExportCsv}
            disabled={filteredMessages.length === 0}
            sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#128C7E' } }}
          >
            Export CSV ({filteredMessages.length})
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Stats */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total', value: stats.total, bg: '#f5f5f5' },
            { label: 'Sent', value: stats.sent, bg: '#e3f2fd' },
            { label: 'Delivered', value: stats.delivered, bg: '#fff3e0' },
            { label: 'Read', value: stats.read, bg: '#e8f5e8' },
            { label: 'Failed', value: stats.failed, bg: '#ffebee' },
            { label: 'No WhatsApp', value: stats.not_on_whatsapp, bg: '#fafafa' },
          ].map((stat) => (
            <Grid item xs={6} sm={2} key={stat.label}>
              <Paper
                sx={{ p: 2, textAlign: 'center', bgcolor: stat.bg, cursor: 'pointer',
                  outline: filterStatus === stat.label.toLowerCase().replace(' ', '_') ? '2px solid #25D366' : 'none' }}
                onClick={() => {
                  const val = stat.label === 'Total' ? '' : stat.label.toLowerCase().replace(' ', '_');
                  setFilterStatus((prev) => prev === val ? '' : val);
                  setPage(0);
                }}
              >
                <Typography variant="h6">{stat.value}</Typography>
                <Typography variant="caption">{stat.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Filters */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            size="small"
            label="Search by name"
            value={searchName}
            onChange={(e) => { setSearchName(e.target.value); setPage(0); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="solar:magnifer-linear" width={16} />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 180 }}
          />
          <TextField
            size="small"
            label="Search by phone"
            value={searchPhone}
            onChange={(e) => { setSearchPhone(e.target.value); setPage(0); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="solar:phone-linear" width={16} />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 180 }}
          />
          <TextField
            select
            size="small"
            label="Status"
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}
            sx={{ minWidth: 150 }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="From date"
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />
          <TextField
            size="small"
            label="To date"
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />
          {hasActiveFilters && (
            <Button size="small" variant="outlined" onClick={handleClearFilters}>
              Clear
            </Button>
          )}
        </Stack>

        {hasActiveFilters && (
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Showing {filteredMessages.length} of {messages.length} messages
          </Typography>
        )}

        {/* Table */}
        <TableContainer component={Paper} sx={{ maxHeight: 380 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Guest Name</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Template</TableCell>
                <TableCell>Sent At</TableCell>
                <TableCell>Delivered At</TableCell>
                <TableCell>Read At</TableCell>
                <TableCell>Error</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">Loading...</TableCell>
                </TableRow>
              ) : paginatedMessages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    {hasActiveFilters ? 'No messages match your filters.' : 'No WhatsApp messages found.'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedMessages.map((message) => (
                  <TableRow key={message.id} hover>
                    <TableCell>{message.guestName}</TableCell>
                    <TableCell>{message.phoneNumber}</TableCell>
                    <TableCell>
                      <Chip
                        icon={<Iconify icon={getStatusIcon(message.status)} />}
                        label={message.status.replace('_', ' ')}
                        color={getStatusColor(message.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{message.templateName}</TableCell>
                    <TableCell>{message.sentAt ? new Date(message.sentAt).toLocaleString() : '—'}</TableCell>
                    <TableCell>{message.deliveredAt ? new Date(message.deliveredAt).toLocaleString() : '—'}</TableCell>
                    <TableCell>{message.readAt ? new Date(message.readAt).toLocaleString() : '—'}</TableCell>
                    <TableCell>
                      {message.errorMessage && (
                        <Typography variant="caption" color="error">{message.errorMessage}</Typography>
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
          count={filteredMessages.length}
          page={page}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={fetchWhatsAppStatus} disabled={loading} startIcon={<Iconify icon="mdi:refresh" />}>
          Refresh
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
