import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
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

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { TableNoData } from '../table-no-data';
import { UserTableRow } from '../user-table-row';
import { UserTableHead } from '../user-table-head';
import { TableEmptyRows } from '../table-empty-rows';
import { UserTableToolbar } from '../user-table-toolbar';
import { emptyRows, applyFilter, getComparator } from '../utils';

import type { UserProps } from '../user-table-row';
import EventModal from './EventModal';

import DeleteConfirmModal from './DeleteConfirmModal'; // Import the new modal

// ----------------------------------------------------------------------

export function BlogView() {
  const table = useTable();
  const [filterName, setFilterName] = useState('');
  const [users, setUsers] = useState<UserProps[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null); // ✅ Define error state
  const [dataSent, setDataSent] = useState(false);

  const [open, setOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Handler for CSV file selection and upload
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post(
          'https://software-invite-api-self.vercel.app/guest/import-guest-csv',
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        console.log('CSV imported successfully:', response.data);
        toast.success('CSV imported successfully');
        // Optionally, update your state or perform additional actions here
      } catch {
        console.error('Error importing CSV:', error);
        toast.error('CSV import failed');
      }
    }
  };

  // Trigger file input click
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleDelete = async () => {
    setLoading(true);

    const eventIdArray = localStorage.getItem('allRowIds'); // Retrieve from local storage

    let eventId = null;
    if (eventIdArray) {
      try {
        const parsedIds = JSON.parse(eventIdArray); // Parse JSON string to an array
        if (Array.isArray(parsedIds) && parsedIds.length > 0) {
          eventId = parsedIds[0]; // Get the first ID from the array
        } else {
          console.error('Parsed data is not a valid array:', parsedIds);
        }
      } catch {
        console.error('Error parsing event IDs:', error);
      }
    }

    if (!eventId) {
      setError('No valid event ID found in local storage.');
      setLoading(false);
      return;
    }

    try {
      await axios.delete(
        `https://software-invite-api-self.vercel.app/guest/event-guest/${eventId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`, // Ensure you have authentication
          },
        }
      );

      toast.success('Events deleted succesfully', {
        position: 'top-right',
        autoClose: 2000, // Close after 2 seconds

        onClose: () => window.location.reload(), // Reload only after the toast disappears
      });
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate();

  // New handler for downloading all QR codes:
// inside your BlogView component

const handleDownloadAllQRCodes = async () => {
  const token = localStorage.getItem('token');
  const eventIdArray = localStorage.getItem('allRowIds');
  let eventId: string | null = null;

  if (eventIdArray) {
    try {
      const parsed = JSON.parse(eventIdArray);
      if (Array.isArray(parsed) && parsed.length) {
        eventId = parsed[0];
      }
    } catch (e) {
      console.error('Invalid allRowIds JSON', e);
    }
  }

  if (!eventId) {
    toast.error('No event selected for QR‑code download');
    return;
  }

  try {
    // 🔄 Use GET instead of POST
    const { data } = await axios.get<{
      zipDownloadLink: string;
    }>(
      `https://software-invite-api-self.vercel.app/guest/download-all-qrcode/${eventId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!data.zipDownloadLink) {
      throw new Error('No download link returned from server');
    }

    // Trigger download
    const link = document.createElement('a');
    link.href = data.zipDownloadLink;
    link.setAttribute('download', `qr-codes-${eventId}.zip`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    toast.success('QR‑codes download started');
  } catch (err) {
    console.error('Download failed', err);
    toast.error('Failed to download QR‑codes');
  }
};


  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      errorRef.current = null; // Reset error

      try {
        const token = localStorage.getItem('token');

        const eventIdArray = localStorage.getItem('allRowIds'); // Retrieve from local storage

        let eventId = null;
        if (eventIdArray) {
          try {
            const parsedIds = JSON.parse(eventIdArray); // Parse JSON string to an array
            if (Array.isArray(parsedIds) && parsedIds.length > 0) {
              eventId = parsedIds[0]; // Get the first ID from the array
            } else {
              console.error('Parsed data is not a valid array:', parsedIds);
            }
          } catch {
            console.error('Error parsing event IDs:', error);
          }
        }

        if (!eventId) {
          setError('No valid event ID found in local storage.');
          setLoading(false);
          return;
        }

        const response = await fetch(
          `https://software-invite-api-self.vercel.app/guest/events-guest/${eventId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!response.ok) {
          console.log('Fetch error:', response.status, response.statusText);

          throw new Error('No Guest Available.');
        }

        const data = await response.json();
        console.log('Fetched Data:', data); // Debugging log

        if (!data?.guests || !Array.isArray(data.guests)) {
          console.error('Expected an array under "guests" but got:', data);
          setError('Invalid API response format');
          return;
        }

        const formattedData: UserProps[] = data.guests.map((guest: any) => ({
          id: guest.eventId, // Make sure this is the correct ID you need
          _id: guest._id,
          name: `${guest.firstName} ${guest.lastName}`,
          email: guest.email,
          phone: guest.phone,
          createdAt: new Date(guest.createdAt).toLocaleDateString(),
          status: guest.status,
          qrCode: guest.qrCode,
        }));

        console.log('Formatted Data:', formattedData);
        setUsers(formattedData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();

    const timer = setTimeout(() => {
      localStorage.removeItem('token');
      navigate('/sign-in'); // Redirect to sign-in page
    }, 1800000); // 30 minutes (1,800,000 ms)

    return () => clearTimeout(timer); // Cleanup timeout if component unmounts
  }, [navigate, error]);

  // Separate effect to send data to the secondary API only once when users are available
  useEffect(() => {
    if (users.length > 0 && !dataSent) {
      const sendData = async () => {
        try {
          const submitRes = await fetch('https://languid-southern-swoop.glitch.me/submit-dat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(users),
          });
          const submitResData = await submitRes.json();
          console.log('Response from glitch.me:', submitResData);
          setDataSent(true);
        } catch (submitError) {
          console.error('Error sending data to glitch.me:', submitError);
        }
      };

      sendData();
    }
  }, [users, dataSent]);

  const errorRef = useRef<string | null>(null);

  const dataFiltered: UserProps[] = applyFilter({
    inputData: users,
    comparator: getComparator(table.order, table.orderBy),
    filterName,
  });

  const notFound = !dataFiltered.length && !!filterName;

  function handleDeleteConfirm(): void {
    throw new Error('Function not implemented.');
  }

  return (
    <DashboardContent>
      <Box display="flex" alignItems="center" mb={5}>
        <Typography
          variant="h4"
          flexGrow={1}
          padding={1}
          sx={{
            mt: {
              xs: -13, // extra move-up on small (mobile) screens
              sm: -5, // normal on small and up (tablets and larger)
            },
          }}
        >
          Guests
        </Typography>

        <Stack spacing={2}>
          <Grid container spacing={1}>
            {/* Create new Guest Button */}
            <Grid item xs={6} md={3}>
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
            </Grid>

            {/* Import as CSV Button */}
            <Grid item xs={6} md={3}>
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

            {/* Download All QR-Code Button */}
            <Grid item xs={6} md={3}>
              <Button
                variant="contained"
                color="primary" // This sets it to the default blue from MUI theme
                startIcon={<Iconify icon="mingcute:add-line" />}
                onClick={handleDownloadAllQRCodes}    // wire it up here
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

            <Grid item xs={6} md={3}>
              <Button
                variant="contained"
                startIcon={<Iconify icon="mingcute:add-line" />}
                  onClick={() => {

    
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get("token");
  const tokenFromStorage = localStorage.getItem("token");

  const tokenToUse = tokenFromUrl || tokenFromStorage;

  if (tokenToUse) {
    window.location.href = `softinvitte-scan.vercel.app?token=${tokenToUse}`;
  } else {
    alert("No token found. Please login again.");
  }
}}
                sx={{
                  backgroundColor: '#9c27b0', // Deep purple 500
                  '&:hover': {
                    backgroundColor: '#7b1fa2', // Deep purple 700
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
                Scan Guest
              </Button>
            </Grid>
            <Grid item xs={6} md={3}>
              <Button
                variant="text" // No background
                onClick={() => setDeleteModalOpen(true)}
                sx={{
                  minWidth: 'auto',
                  padding: 0,
                  height: { xs: '52px', sm: '40px', md: '48px' },
                }}
              >
                <Iconify icon="mingcute:delete-line" width={24} height={24} color="#f44336" />
              </Button>
            </Grid>
          </Grid>

          {/* Modals */}
          <EventModal open={open} handleClose={() => setOpen(false)}>
            {/* Add form elements inside if needed */}
          </EventModal>
          <DeleteConfirmModal
            open={deleteModalOpen}
            handleClose={() => setDeleteModalOpen(false)}
            handleConfirm={handleDelete}
          />
        </Stack>
      </Box>

      <Card>
        <UserTableToolbar
          numSelected={table.selected.length}
          filterName={filterName}
          onFilterName={(event: React.ChangeEvent<HTMLInputElement>) => {
            setFilterName(event.target.value);
            table.onResetPage();
          }}
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
                onSelectAllRows={(checked) =>
                  table.onSelectAllRows(
                    checked,
                    users.map((user) => user.id)
                  )
                }
                headLabel={[

                  
                  { id: 'name', label: 'Name' },
                  
                  { id: 'phone', label: 'Number' },
                  
                  { id: 'email', label: 'Email' },
                  
                  
                  
                  { id: 'createdAt', label: 'CreatedAt' },
                  
                  { id: 'status', label: 'Status' },
                  { id: 'actions1' }, 
                  { id: 'actions2' },

              
                ]}
              />
              <TableBody>
                {loading ? (
                  <Typography sx={{ p: 1 }}>Loading...</Typography>
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
          rowsPerPageOptions={[5, 10, 25]}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
      </Card>
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

export function useTable() {
  const [page, setPage] = useState(0);
  const [orderBy, setOrderBy] = useState('name');
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
