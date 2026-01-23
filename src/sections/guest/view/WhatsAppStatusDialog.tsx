import { useState, useEffect, useCallback } from 'react';
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
  Grid
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

export default function WhatsAppStatusDialog({ open, onClose, eventId }: WhatsAppStatusDialogProps) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [stats, setStats] = useState<WhatsAppStats>({
    total: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    not_on_whatsapp: 0
  });
  const [loading, setLoading] = useState(false);

  const fetchWhatsAppStatus = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE}/whatsapp/status/${eventId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

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
    }
  }, [open, eventId, fetchWhatsAppStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'info';
      case 'delivered': return 'warning';
      case 'read': return 'success';
      case 'failed': return 'error';
      case 'not_on_whatsapp': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return 'material-symbols:send';
      case 'delivered': return 'material-symbols:check';
      case 'read': return 'material-symbols:done-all';
      case 'failed': return 'material-symbols:error';
      case 'not_on_whatsapp': return 'material-symbols:phone-disabled';
      default: return 'material-symbols:help';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Iconify icon="logos:whatsapp-icon" />
          WhatsApp Message Status
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {/* Statistics Grid */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={2}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
              <Typography variant="h6">{stats.total}</Typography>
              <Typography variant="caption">Total</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={2}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e3f2fd' }}>
              <Typography variant="h6">{stats.sent}</Typography>
              <Typography variant="caption">Sent</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={2}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff3e0' }}>
              <Typography variant="h6">{stats.delivered}</Typography>
              <Typography variant="caption">Delivered</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={2}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e8' }}>
              <Typography variant="h6">{stats.read}</Typography>
              <Typography variant="caption">Read</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={2}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#ffebee' }}>
              <Typography variant="h6">{stats.failed}</Typography>
              <Typography variant="caption">Failed</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={2}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fafafa' }}>
              <Typography variant="h6">{stats.not_on_whatsapp}</Typography>
              <Typography variant="caption">No WhatsApp</Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Messages Table */}
        <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Guest Name</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Template</TableCell>
                <TableCell>Sent At</TableCell>
                <TableCell>Error</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : messages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No WhatsApp messages found
                  </TableCell>
                </TableRow>
              ) : (
                messages.map((message) => (
                  <TableRow key={message.id}>
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
                    <TableCell>
                      {new Date(message.sentAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {message.errorMessage && (
                        <Typography variant="caption" color="error">
                          {message.errorMessage}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={fetchWhatsAppStatus} disabled={loading}>
          Refresh
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}