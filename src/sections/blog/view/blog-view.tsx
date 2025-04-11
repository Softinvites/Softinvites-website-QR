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
import DeleteConfirmModal from './DeleteConfirmModal';

interface HeadCell {
  id: string;
  label: string;
  align?: 'left' | 'center' | 'right';
}

export function BlogView() {
  const table = useTable();
  const [filterName, setFilterName] = useState('');
  const [users, setUsers] = useState<UserProps[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const token = localStorage.getItem("token");
        const response = await axios.post(
          "https://software-invite-api-self.vercel.app/guest/import-guest-csv",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        toast.success("CSV imported successfully");
        window.location.reload();
      } catch (err) {
        console.error("Error importing CSV:", err);
        toast.error("CSV import failed");
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const eventIdArray = localStorage.getItem('allRowIds');
      
      if (!token || !eventIdArray) {
        toast.error("Authentication required");
        return;
      }

      const parsedIds = JSON.parse(eventIdArray);
      const eventId = Array.isArray(parsedIds) && parsedIds.length > 0 ? parsedIds[0] : null;

      if (!eventId) {
        toast.error("No event ID found");
        return;
      }

      await axios.delete(`https://software-invite-api-self.vercel.app/guest/event-guest/${eventId}`, {
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
      console.error("Error deleting guests:", err);
      toast.error('Failed to delete guests');
    } finally {
      setLoading(false);
      setDeleteModalOpen(false);
    }
  };

  const handleDownloadAllQRCodes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const eventIdArray = localStorage.getItem('allRowIds');
      
      if (!token || !eventIdArray) {
        toast.error("Authentication required");
        return;
      }

      const parsedIds = JSON.parse(eventIdArray);
      const eventId = Array.isArray(parsedIds) && parsedIds.length > 0 ? parsedIds[0] : null;

      if (!eventId) {
        toast.error("No event ID found");
        return;
      }

      const response = await axios.get(
        `https://software-invite-api-self.vercel.app/guest/download-all-qrcode/${eventId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data?.zipDownloadLink) {
        window.open(response.data.zipDownloadLink, "_blank");
        toast.success('QR codes downloaded successfully');
      } else {
        toast.error('Failed to download QR codes');
      }
    } catch (err) {
      console.error("Error downloading QR codes:", err);
      toast.error('Failed to download QR codes');
    } finally {
      setLoading(false);
    }
  };

  function tryDecodeToken(token: string) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch (e) {
      console.error("Failed to decode token:", e);
      return null;
    }
  }

useEffect(() => {
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tokenFromUrl = urlParams.get("token");
      const tokenFromStorage = localStorage.getItem("token");
      const token = tokenFromStorage || tokenFromUrl;

      if (!token) {
        setError("No token found. Please log in again.");
        setLoading(false);
        return;
      }

      // Determine if this is an admin (has localStorage token)
      setIsAdmin(!!tokenFromStorage);

      let eventId;
      if (tokenFromStorage) {
        // For admin - get eventId from localStorage
        const eventIdArray = localStorage.getItem('allRowIds');
        if (eventIdArray) {
          try {
            const parsedIds = JSON.parse(eventIdArray);
            eventId = Array.isArray(parsedIds) && parsedIds.length > 0 ? parsedIds[0] : null;
          } catch (err) {
            console.error("Error parsing event IDs:", err);
          }
        }
      } else {
        // For temporary users - get eventId from token
        const decoded = tryDecodeToken(token);
        if (decoded) {
          eventId = decoded?.eventId || decoded?.event?._id;
          
          if (!eventId) {
            console.warn("Token payload doesn't contain event ID:", decoded);
          }
        }
      }

      if (!eventId) {
        console.error("Event ID search details:", {
          tokenSource: tokenFromStorage ? "localStorage" : "URL",
          allRowIds: localStorage.getItem('allRowIds'),
          decodedToken: tokenFromUrl ? tryDecodeToken(tokenFromUrl) : null
        });
        setError("No valid event ID found. Please ensure you're using a valid invitation link.");
        setLoading(false);
        return;
      }

      // If token came from URL and we don't have one in storage, store it
      if (tokenFromUrl && !tokenFromStorage) {
        localStorage.setItem("token", tokenFromUrl);
      }

      const response = await fetch(
        `https://software-invite-api-self.vercel.app/guest/events-guest/${eventId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error(response.statusText || "Failed to fetch guests");
      }

      const data = await response.json();

      if (!data?.guests || !Array.isArray(data.guests)) {
        throw new Error("Invalid API response format");
      }

      const formattedData: UserProps[] = data.guests.map((guest: any) => ({
        id: guest._id,
        _id: guest._id,
        name: `${guest.firstName} ${guest.lastName}`,
        email: guest.email,
        phone: guest.phone,
        createdAt: new Date(guest.createdAt).toLocaleDateString(),
        status: guest.status,
        qrCode: guest.qrCode,
      }));

      setUsers(formattedData);
    } catch (err: any) {
      setError(err.message || "Failed to load guests");
    } finally {
      setLoading(false);
    }
  };

  fetchUsers();

  // Set timeout for token expiration (30 minutes)
  const timer = setTimeout(() => {
    localStorage.removeItem("token");
    navigate("/sign-in");
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
                  <EventModal open={open} handleClose={() => setOpen(false)} />
                </Grid>

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

                <Grid item xs={6} md={3}>
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

                <Grid item xs={6} md={3}>
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
              </>
            )}

            <Grid item xs={isAdmin ? 12 : 6} md={isAdmin ? 12 : 3}>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<Iconify icon="fluent:qr-code-28-filled" />}
                onClick={() => {
                  const urlParams = new URLSearchParams(window.location.search);
                  const tokenFromUrl = urlParams.get("token");
                  const tokenFromStorage = localStorage.getItem("token");
                  const tokenToUse = tokenFromUrl || tokenFromStorage;

                  if (tokenToUse) {
                    window.location.href = `https://softinvite-scan.vercel.app?token=${tokenToUse}`;
                  } else {
                    toast.error("No token found. Please login again.");
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
                Scan Guest QR
              </Button>
            </Grid>
          </Grid>
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
                onSelectAllRows={isAdmin ? (checked) => 
                  table.onSelectAllRows(checked, users.map((user) => user.id))
                  : undefined
                }
                headLabel={[
                  ...(isAdmin ? [{ id: 'checkbox', label: '', align: 'center' }] : []),
                  { id: 'name', label: 'Name' },
                  { id: 'phone', label: 'Number' },
                  { id: 'email', label: 'Email' },
                  { id: 'createdAt', label: 'CreatedAt' },
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