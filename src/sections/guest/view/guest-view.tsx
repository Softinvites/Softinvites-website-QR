import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE } from 'src/utils/apiBase';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import { Grid } from '@mui/material';
import TablePagination from '@mui/material/TablePagination';
import Stack from '@mui/material/Stack';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { DashboardContent } from 'src/layouts/dashboard';
import { Iconify } from 'src/components/iconify/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { TableNoData } from '../table-no-data';
import { UserTableRow } from '../user-table-row';
import { UserTableHead } from '../user-table-head';
import { TableEmptyRows } from '../table-empty-rows';
import { UserTableToolbar } from '../user-table-toolbar';
import { emptyRows, applyFilter, getComparator } from '../utils';
import type { UserProps } from '../user-table-row';
import EventModal from './GuestModal';
import BatchDownloadModal from './BatchDownloadModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import BatchDeleteModal from './BatchDeleteModal';
import WhatsAppStatusDialog from './WhatsAppStatusDialog';
import WhatsAppSendDialog from './WhatsAppSendDialog';
import { AnalyticsWidgetSummary } from '../../overview/analytics-widget-summary';

export function GuestView() {
  const table = useTable();
  const [filterName, setFilterName] = useState('');
  const [users, setUsers] = useState<UserProps[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [batchDeleteModalOpen, setBatchDeleteModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState({
    totalGuests: 0,
    checkedInGuests: 0,
    unusedCodes: 0,
    guestStatusBreakdown: {
      checkedIn: 0,
      pending: 0,
    },
    checkInTrend: [],
  });
  const [whatsappStats, setWhatsappStats] = useState({
    total: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    not_on_whatsapp: 0,
  });
  const showOthersColumn = users.some((user) => !!user.others?.trim());

  // ✅ state for eventId and userEmail
  const [eventId, setEventId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [eventName, setEventName] = useState<string>('Event Report');
  const [eventDate, setEventDate] = useState<string>('');
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [whatsappStatusOpen, setWhatsappStatusOpen] = useState(false);
  const [whatsappSendOpen, setWhatsappSendOpen] = useState(false);

  const handleBatchDelete = async () => {
    if (table.selected.length === 0) {
      toast.error('No guests selected');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      await axios.delete(`${API_BASE}/guest/delete-selected`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: {
          guestIds: table.selected,
        },
      });

      toast.success(
        `Successfully deleted ${table.selected.length} guest${table.selected.length > 1 ? 's' : ''}`,
        {
          position: 'top-right',
          autoClose: 2000,
          onClose: () => window.location.reload(),
        }
      );

      table.onSelectAllRows(false, []);
    } catch (err: any) {
      console.error('Error deleting selected guests:', err);
      toast.error(err.response?.data?.message || 'Failed to delete selected guests');
    } finally {
      setLoading(false);
      setBatchDeleteModalOpen(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      if (eventId) formData.append('eventId', eventId);
      if (userEmail) formData.append('userEmail', userEmail);

      try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_BASE}/guest/import-guest-csv`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        });

        console.log('Response from backend:', response.data);

        toast.success(response.data.message || 'CSV imported successfully');
      } catch (err: any) {
        console.error('Error importing CSV:', err);
        toast.error(err.response?.data?.message || 'CSV import failed');
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const eventIdArray = localStorage.getItem('allRowIds');

      if (!token || !eventIdArray) {
        toast.error('Authentication required');
        return;
      }

      const parsedIds = JSON.parse(eventIdArray);
      const derivedEventId = Array.isArray(parsedIds) && parsedIds.length > 0 ? parsedIds[0] : null;

      if (!derivedEventId) {
        toast.error('No event ID found');
        return;
      }

      await axios.delete(`${API_BASE}/guest/event-guest/${derivedEventId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success('All guests deleted successfully', {
        position: 'top-right',
        autoClose: 2000,
        onClose: () => window.location.reload(),
      });
    } catch (err) {
      console.error('Error deleting guests:', err);
      toast.error('Failed to delete guests');
    } finally {
      setLoading(false);
      setDeleteModalOpen(false);
    }
  };

  const handleDownloadAllQRCodes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const eventIdArray = localStorage.getItem('allRowIds');

      if (!token || !eventIdArray) {
        toast.error('Authentication required or no event IDs found');
        return;
      }

      const parsedIds = JSON.parse(eventIdArray);
      const derivedEventId = Array.isArray(parsedIds) && parsedIds.length > 0 ? parsedIds[0] : null;

      if (!derivedEventId) {
        toast.error('No valid event ID found');
        return;
      }

      const response = await axios.get(`${API_BASE}/guest/download-all-qrcode/${derivedEventId}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 300000,
      });

      if (response.data?.zipDownloadLink) {
        window.location.href = response.data.zipDownloadLink;
        toast.success('QR codes download started!');
      } else {
        toast.error('Download link not available');
      }
    } catch (err) {
      console.error('Error downloading QR codes:', err);
      toast.error('Failed to download QR codes');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchDownloadQRCodes = async (startDate: string, endDate: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const eventIdArray = localStorage.getItem('allRowIds');

      if (!token || !eventIdArray) {
        toast.error('Authentication required or no event IDs found');
        return;
      }

      const parsedIds = JSON.parse(eventIdArray);
      const derivedEventId = Array.isArray(parsedIds) && parsedIds.length > 0 ? parsedIds[0] : null;

      if (!derivedEventId) {
        toast.error('No valid event ID found');
        return;
      }

      const response = await axios.post(
        `${API_BASE}/guest/batch-qrcode-download/${derivedEventId}/timestamp`,
        { start: startDate, end: endDate },

        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 60000,
        }
      );

      if (response.data?.zipDownloadLink) {
        window.open(response.data.zipDownloadLink, '_blank');
        toast.success('Batch QR codes download started!');
      } else {
        toast.error('Download link not available');
      }
    } catch (err) {
      console.error('Error downloading batch QR codes:', err);
      toast.error('Failed to download batch QR codes');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmails = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const eventIdArray = localStorage.getItem('allRowIds');

      if (!token || !eventIdArray) {
        toast.error('Authentication required or no event IDs found');
        return;
      }

      const parsedIds = JSON.parse(eventIdArray);
      const derivedEventId = Array.isArray(parsedIds) && parsedIds.length > 0 ? parsedIds[0] : null;

      if (!derivedEventId) {
        toast.error('No valid event ID found');
        return;
      }

      const response = await axios.post(
        `${API_BASE}/guest/resend-all-emails/${derivedEventId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 30000,
        }
      );

      toast.success(response.data?.message || 'Email resend job started successfully!');
    } catch (err: any) {
      console.error('Error resending emails:', err);
      toast.error(err.response?.data?.message || 'Failed to start email resend job');
    } finally {
      setLoading(false);
    }
  };


  const handleSendBulkWhatsApp = () => {
    setWhatsappSendOpen(true);
  };

  const handleConfirmBulkWhatsApp = async (templateName: string) => {
    setLoading(true);
    setWhatsappSendOpen(false);

    try {
      const token = localStorage.getItem('token');
      const eventIdArray = localStorage.getItem('allRowIds');

      if (!token || !eventIdArray) {
        toast.error('Authentication required or no event IDs found');
        return;
      }

      const parsedIds = JSON.parse(eventIdArray);
      const derivedEventId = Array.isArray(parsedIds) && parsedIds.length > 0 ? parsedIds[0] : null;

      if (!derivedEventId) {
        toast.error('No valid event ID found');
        return;
      }

      const response = await axios.post(
        `${API_BASE}/whatsapp/send-bulk`,
        {
          eventId: derivedEventId,
          templateName,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          timeout: 30000,
        }
      );

      toast.success(
        `WhatsApp bulk send completed! Sent: ${response.data.sent}, Failed: ${response.data.failed}`
      );

      // Refresh WhatsApp stats
      fetchWhatsAppStats(derivedEventId);
    } catch (err: any) {
      console.error('Error sending bulk WhatsApp:', err);
      toast.error(err.response?.data?.message || 'Failed to send WhatsApp messages');
    } finally {
      setLoading(false);
    }
  };

  const getGuestsWithPhone = () => users.filter((user) => user.phone && user.phone.trim()).length;

  const fetchWhatsAppStats = async (currentEventId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${API_BASE}/whatsapp/status/${currentEventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setWhatsappStats(response.data.stats);
    } catch (err) {
      console.error('Error fetching WhatsApp stats:', err);
    }
  };

  function tryDecodeToken(token: string) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch (e) {
      console.error('Failed to decode token:', e);
      return null;
    }
  }

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);

      try {
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');
        const tokenFromStorage = localStorage.getItem('token');
        const token = tokenFromStorage || tokenFromUrl;

        if (!token) {
          setError('No token found. Please log in again.');
          setLoading(false);
          return;
        }

        // Determine if this is an admin (has localStorage token)
        setIsAdmin(!!tokenFromStorage);

        let currentEventId: string | null = null;

        if (tokenFromStorage) {
          // For admin - get eventId from localStorage
          const eventIdArray = localStorage.getItem('allRowIds');
          if (eventIdArray) {
            try {
              const parsedIds = JSON.parse(eventIdArray);
              currentEventId =
                Array.isArray(parsedIds) && parsedIds.length > 0 ? parsedIds[0] : null;
            } catch (err) {
              console.error('Error parsing event IDs:', err);
            }
          }
        } else {
          // For temporary users - get eventId and email from token
          const decoded = tryDecodeToken(token);
          if (decoded) {
            currentEventId = decoded?.eventId || decoded?.event?._id;
            setUserEmail(decoded?.email || null);

            if (!currentEventId) {
              console.warn("Token payload doesn't contain event ID:", decoded);
            }
          }
        }

        setEventId(currentEventId);

        if (!currentEventId) {
          setError("No valid event ID found. Please ensure you're using a valid invitation link.");
          setLoading(false);
          return;
        }

        // If token came from URL and we don't have one in storage, store it
        if (tokenFromUrl && !tokenFromStorage) {
          localStorage.setItem('token', tokenFromUrl);
        }

        const response = await fetch(`${API_BASE}/guest/events-guest/${currentEventId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error(response.statusText);
        }

        const data = await response.json();

        if (!data?.guests || !Array.isArray(data.guests)) {
          throw new Error('Invalid API response format');
        }

        const analyticsRes = await axios.get(
          `${API_BASE}/guest/event-analytics/${currentEventId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setAnalytics(analyticsRes.data);

        // Fetch WhatsApp statistics
        fetchWhatsAppStats(currentEventId);

        // Get event details for report
        try {
          const eventRes = await axios.get(`${API_BASE}/events/events/${currentEventId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (eventRes.data?.event) {
            setEventName(eventRes.data.event.name || 'Event Report');
            setEventDate(eventRes.data.event.date || '');
          }
        } catch (eventErr) {
          console.warn('Could not fetch event details:', eventErr);
        }

        const formattedData: UserProps[] = data.guests.map((guest: any) => ({
          id: guest._id,
          _id: guest._id,
          fullname: guest.fullname,
          TableNo: guest.TableNo,
          email: guest.email,
          phone: guest.phone,
          createdAt: new Date(guest.createdAt).toLocaleDateString(),
          checkedInAt: guest.checkedInAt,
          others: guest.others || '',
          status: guest.status,
          qrCode: guest.qrCode,
        }));

        setUsers(formattedData);
      } catch (err: any) {
        setError(err.message || 'Failed to load guests');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();

    const timer = setTimeout(() => {
      localStorage.removeItem('token');
      navigate('/sign-in');
    }, 1800000);

    return () => clearTimeout(timer);
  }, [navigate]);

  const dataFiltered: UserProps[] = applyFilter({
    inputData: users,
    comparator: getComparator(table.order, table.orderBy),
    filterName,
  });

  const notFound = !dataFiltered.length && !!filterName;

  return (
    <DashboardContent>
      <Box display="flex" alignItems="center" mb={5}>
        <Typography
          variant="h4"
          flexGrow={1}
          padding={1}
          sx={{
            mt: {
              xs: -13,
              sm: -5,
            },
          }}
        >
          Guests
        </Typography>

        <Stack spacing={2}>
          <Grid container spacing={1}>
            {isAdmin && (
              <>
                <Grid item xs={6} md={2.4}>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<Iconify icon="mingcute:add-line" />}
                    onClick={() => setOpen(true)}
                    sx={{
                      fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
                      padding: { xs: '2px 6px', sm: '6px 8px', md: '8px 10px' },
                      letterSpacing: '0.2px',
                      textTransform: 'none',
                      minWidth: { xs: 'auto', sm: 'auto' },
                      height: { xs: '52px', sm: '40px', md: '48px' },
                    }}
                  >
                    Create Guest
                  </Button>
                  <EventModal open={open} handleClose={() => setOpen(false)} />
                </Grid>

                <Grid item xs={6} md={2.4}>
                  <Button
                    variant="contained"
                    color="warning"
                    startIcon={<Iconify icon="uil:envelope-download" />}
                    onClick={handleButtonClick}
                    sx={{
                      color: '#ffff',
                      '&:hover': {
                        backgroundColor: '#FFC107',
                      },
                      fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
                      padding: { xs: '2px 6px', sm: '6px 8px', md: '8px 10px' },
                      letterSpacing: '0.2px',
                      textTransform: 'none',
                      minWidth: { xs: 'auto', sm: 'auto' },
                      height: { xs: '52px', sm: '40px', md: '48px' },
                    }}
                  >
                    Import Guest
                  </Button>
                  <input
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </Grid>

                <Grid item xs={6} md={2.4}>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<Iconify icon="mingcute:delete-line" />}
                    onClick={() => setDeleteModalOpen(true)}
                    sx={{
                      fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
                      padding: { xs: '2px 6px', sm: '6px 8px', md: '8px 10px' },
                      letterSpacing: '0.2px',
                      textTransform: 'none',
                      minWidth: { xs: 'auto', sm: 'auto' },
                      height: { xs: '52px', sm: '40px', md: '48px' },
                    }}
                  >
                    Delete All
                  </Button>
                  <DeleteConfirmModal
                    open={deleteModalOpen}
                    handleClose={() => setDeleteModalOpen(false)}
                    handleConfirm={handleDelete}
                  />
                </Grid>

                <Grid item xs={6} md={2.4}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Iconify icon="uil:cloud-download" />}
                    onClick={handleDownloadAllQRCodes}
                    sx={{
                      fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
                      padding: { xs: '2px 6px', sm: '6px 8px', md: '8px 10px' },
                      letterSpacing: '0.2px',
                      textTransform: 'none',
                      minWidth: { xs: 'auto', sm: 'auto' },
                      height: { xs: '52px', sm: '40px', md: '48px' },
                    }}
                  >
                    Download QR
                  </Button>
                </Grid>

                <Grid item xs={6} md={2.4}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Iconify icon="uil:cloud-download" />}
                    onClick={() => setBatchModalOpen(true)}
                    sx={{
                      fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
                      padding: { xs: '2px 6px', sm: '6px 8px', md: '8px 10px' },
                      letterSpacing: '0.2px',
                      textTransform: 'none',
                      minWidth: { xs: 'auto', sm: 'auto' },
                      height: { xs: '52px', sm: '40px', md: '48px' },
                    }}
                  >
                    Batch Download
                  </Button>

                  <BatchDownloadModal
                    open={batchModalOpen}
                    onClose={() => setBatchModalOpen(false)}
                    onSubmit={handleBatchDownloadQRCodes}
                  />
                </Grid>

                <Grid item xs={6} md={2.4}>
                  <Button
                    variant="contained"
                    color="info"
                    startIcon={<Iconify icon="material-symbols:download" />}
                    onClick={() => {
                      const reportDate = new Date().toLocaleDateString();
                      const csvContent = [
                        // Event Header
                        [`EVENT REPORT`],
                        [`Event Name: ${eventName}`],
                        [`Event Date: ${eventDate}`],
                        [`Report Generated: ${reportDate}`],
                        [''],
                        // Metrics Section
                        ['METRICS SUMMARY'],
                        [`Total Guests: ${analytics.totalGuests}`],
                        [`Checked-in Guests: ${analytics.checkedInGuests}`],
                        [`Unchecked Guests: ${analytics.unusedCodes}`],
                        [
                          `Check-in Rate: ${analytics.totalGuests > 0 ? Math.round((analytics.checkedInGuests / analytics.totalGuests) * 100) : 0}%`,
                        ],
                        [''],
                        // Guest List Header
                        ['GUEST LIST'],
                        [
                          'Name',
                          'Table No',
                          'Others',
                          'Email',
                          'Phone',
                          'Status',
                          'Created At',
                          'Checked In At',
                        ],
                        // Guest Data
                        ...users.map((user) => [
                          user.fullname,
                          user.TableNo || 'N/A',
                          user.others || 'N/A',
                          user.email || 'N/A',
                          user.phone || 'N/A',
                          user.status === 'checked-in' ? 'Checked In' : 'Pending',
                          user.createdAt,
                          user.checkedInAt
                            ? new Date(user.checkedInAt).toLocaleString()
                            : 'Not Checked In',
                        ]),
                      ]
                        .map((row) => row.map((cell) => `"${cell}"`).join(','))
                        .join('\n');

                      const blob = new Blob([csvContent], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${eventName.replace(/[^a-zA-Z0-9]/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success('Event report downloaded successfully!');
                    }}
                    sx={{
                      fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
                      padding: { xs: '2px 6px', sm: '6px 8px', md: '8px 10px' },
                      letterSpacing: '0.2px',
                      textTransform: 'none',
                      minWidth: { xs: 'auto', sm: 'auto' },
                      height: { xs: '52px', sm: '40px', md: '48px' },
                    }}
                  >
                    Download Report
                  </Button>
                </Grid>


                <Grid item xs={6} md={2.4}>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<Iconify icon="material-symbols:mail" />}
                    onClick={handleResendEmails}
                    disabled={loading}
                    sx={{
                      backgroundColor: '#ff5722',
                      '&:hover': {
                        backgroundColor: '#e64a19',
                      },
                      fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
                      padding: { xs: '2px 6px', sm: '6px 8px', md: '8px 10px' },
                      letterSpacing: '0.2px',
                      textTransform: 'none',
                      minWidth: { xs: 'auto', sm: 'auto' },
                      height: { xs: '52px', sm: '40px', md: '48px' },
                    }}
                  >
                    Resend Emails
                  </Button>
                </Grid>

                <Grid item xs={6} md={2.4}>
                  <Button
                    variant="contained"
                    startIcon={<Iconify icon="logos:whatsapp-icon" />}
                    onClick={handleSendBulkWhatsApp}
                    disabled={loading}
                    sx={{
                      backgroundColor: '#25D366',
                      '&:hover': {
                        backgroundColor: '#128C7E',
                      },
                      color: '#fff',
                      fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
                      padding: { xs: '2px 6px', sm: '6px 8px', md: '8px 10px' },
                      letterSpacing: '0.2px',
                      textTransform: 'none',
                      minWidth: { xs: 'auto', sm: 'auto' },
                      height: { xs: '52px', sm: '40px', md: '48px' },
                    }}
                  >
                    Send WhatsApp
                  </Button>
                </Grid>
              </>
            )}

            <Grid item xs={isAdmin ? 12 : 6} md={isAdmin ? 12 : 3}>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<Iconify icon="fluent:qr-code-28-filled" />}
                onClick={() => {
                  const urlParams = new URLSearchParams(window.location.search);
                  const tokenFromUrl = urlParams.get('token');
                  const tokenFromStorage = localStorage.getItem('token');
                  const tokenToUse = tokenFromUrl || tokenFromStorage;

                  if (tokenToUse) {
                    window.location.href = `https://softinvite-scan.vercel.app?token=${tokenToUse}`;
                  } else {
                    toast.error('No token found. Please login again.');
                  }
                }}
                sx={{
                  backgroundColor: '#9c27b0',
                  '&:hover': {
                    backgroundColor: '#7b1fa2',
                  },
                  color: '#fff',
                  fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
                  padding: { xs: '2px 6px', sm: '6px 8px', md: '8px 10px' },
                  letterSpacing: '0.2px',
                  textTransform: 'none',
                  minWidth: { xs: 'auto', sm: 'auto' },
                  height: { xs: '52px', sm: '40px', md: '48px' },
                  width: isAdmin ? '100%' : 'auto',
                }}
              >
                Scan Guest
              </Button>
            </Grid>
          </Grid>
        </Stack>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid xs={12} sm={6} md={4}>
          <AnalyticsWidgetSummary
            title="Total Guests"
            total={analytics.totalGuests}
            percent={analytics.totalGuests}
            icon={<img alt="icon" src="/assets/icons/glass/ic-glass-users.svg" />}
            color="primary"
          />
        </Grid>
        <Grid xs={12} sm={6} md={4}>
          <AnalyticsWidgetSummary
            title="Checked-in Guests"
            total={analytics.checkedInGuests}
            percent={analytics.checkedInGuests}
            icon={<img alt="icon" src="/assets/icons/glass/ic-glass-buy.svg" />}
            color="success"
          />
        </Grid>
        <Grid xs={12} sm={6} md={4}>
          <AnalyticsWidgetSummary
            title="Unused Codes"
            total={analytics.unusedCodes}
            percent={analytics.unusedCodes}
            icon={<img alt="icon" src="/assets/icons/glass/ic-glass-message.svg" />}
            color="error"
          />
        </Grid>
        <Grid xs={12} sm={6} md={4}>
          <Box
            onClick={() => setWhatsappStatusOpen(true)}
            sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
          >
            <AnalyticsWidgetSummary
              title="WhatsApp Sent"
              total={whatsappStats.sent}
              percent={whatsappStats.sent}
              icon={<Iconify icon="logos:whatsapp-icon" />}
              color="success"
            />
          </Box>
        </Grid>
      </Grid>

      <Card>
        <UserTableToolbar
          numSelected={table.selected.length}
          filterName={filterName}
          onFilterName={(event: React.ChangeEvent<HTMLInputElement>) => {
            setFilterName(event.target.value);
            table.onResetPage();
          }}
          eventName={eventName}
          onDeleteSelected={isAdmin ? () => setBatchDeleteModalOpen(true) : undefined}
        />

        <Scrollbar>
          <TableContainer sx={{ overflow: 'unset' }}>
            <Table sx={{ minWidth: 800 }}>
              <UserTableHead
                order={table.order}
                orderBy={table.orderBy}
                rowCount={users.length}
                numSelected={table.selected.length}
                onSort={table.onSort}
                onSelectAllRows={
                  isAdmin
                    ? (checked) =>
                        table.onSelectAllRows(
                          checked,
                          users.map((user) => user.id)
                        )
                    : undefined
                }
                headLabel={[
                  ...(isAdmin ? [{ id: 'checkbox', label: '', align: 'center' }] : []),
                  { id: 'fullname', label: 'Full Name' },
                  { id: 'TableNo', label: 'Table No.' },
                  { id: 'phone', label: 'Number' },
                  { id: 'email', label: 'Email' },
                  { id: 'createdAt', label: 'Created At' },
                  { id: 'checkedInAt', label: 'Checked In At' },
                  ...(showOthersColumn ? [{ id: 'others', label: 'Others' }] : []),
                  { id: 'status', label: 'Status' },
                  ...(isAdmin ? [{ id: 'actions', label: 'Actions' }] : []),
                ]}
              />
              <TableBody>
                {loading ? (
                  <Typography sx={{ p: 3 }}>Loading...</Typography>
                ) : error ? (
                  <Typography color="error" sx={{ p: 3 }}>
                    {error}
                  </Typography>
                ) : (
                  dataFiltered
                    .slice(
                      table.page * table.rowsPerPage,
                      table.page * table.rowsPerPage + table.rowsPerPage
                    )
                    .map((row) => (
                      <UserTableRow
                        key={row.id}
                        row={row}
                        selected={table.selected.includes(row.id)}
                        onSelectRow={() => table.onSelectRow(row.id)}
                        showActions={isAdmin}
                        showOthersColumn={showOthersColumn}
                      />
                    ))
                )}

                <TableEmptyRows
                  height={68}
                  emptyRows={emptyRows(table.page, table.rowsPerPage, users.length)}
                />

                {notFound && <TableNoData searchQuery={filterName} />}
              </TableBody>
            </Table>
          </TableContainer>
        </Scrollbar>

        <TablePagination
          component="div"
          page={table.page}
          count={users.length}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          rowsPerPageOptions={[5, 10, 25, 50, 100]}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
      </Card>

      {/* Batch Delete Modal */}
      <BatchDeleteModal
        open={batchDeleteModalOpen}
        handleClose={() => setBatchDeleteModalOpen(false)}
        handleConfirm={handleBatchDelete}
        selectedCount={table.selected.length}
        loading={loading}
      />

      {/* WhatsApp Status Dialog */}
      {eventId && (
        <WhatsAppStatusDialog
          open={whatsappStatusOpen}
          onClose={() => setWhatsappStatusOpen(false)}
          eventId={eventId}
        />
      )}

      {/* WhatsApp Send Dialog */}
      <WhatsAppSendDialog
        open={whatsappSendOpen}
        onClose={() => setWhatsappSendOpen(false)}
        onConfirm={handleConfirmBulkWhatsApp}
        guestCount={getGuestsWithPhone()}
        loading={loading}
      />
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

export function useTable() {
  const [page, setPage] = useState(0);
  const [orderBy, setOrderBy] = useState('fullname');
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selected, setSelected] = useState<string[]>([]);
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  const onSort = useCallback(
    (id: string) => {
      const isAsc = orderBy === id && order === 'asc';
      setOrder(isAsc ? 'desc' : 'asc');
      setOrderBy(id);
    },
    [order, orderBy]
  );

  const onSelectAllRows = useCallback((checked: boolean, newSelecteds: string[]) => {
    setSelected(checked ? newSelecteds : []);
  }, []);

  const onSelectRow = useCallback((inputValue: string) => {
    setSelected((prevSelected) =>
      prevSelected.includes(inputValue)
        ? prevSelected.filter((value) => value !== inputValue)
        : [...prevSelected, inputValue]
    );
  }, []);

  const onResetPage = useCallback(() => setPage(0), []);

  const onChangePage = useCallback((event: unknown, newPage: number) => setPage(newPage), []);

  const onChangeRowsPerPage = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setRowsPerPage(parseInt(event.target.value, 10));
      onResetPage();
    },
    [onResetPage]
  );

  return {
    page,
    order,
    onSort,
    orderBy,
    selected,
    rowsPerPage,
    onSelectRow,
    onResetPage,
    onChangePage,
    onSelectAllRows,
    onChangeRowsPerPage,
  };
}
