import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import * as Sentry from '@sentry/react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import Stack from '@mui/material/Stack';

import {  toast } from 'react-toastify';

import { useNavigate } from "react-router-dom";
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

import DeleteConfirmModal from "./DeleteConfirmModal"; // Import the new modal


// ----------------------------------------------------------------------

export function UserView() {
  const table = useTable();
  const [filterName, setFilterName] = useState('');
  const [users, setUsers] = useState<UserProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // ✅ Define error state
 
  const [open, setOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);




  
  const handleDelete = async () => {
    setLoading(true);
    try {
      await axios.delete("https://292x833w13.execute-api.us-east-2.amazonaws.com/events/events/", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      localStorage.removeItem("allRowIds");

      toast.success('Events deleted succesfully', {
        position: 'top-right',
        autoClose: 2000,
        onClose: () => window.location.reload(),
      });
      setOpen(false);
    } catch (error) {
      Sentry.captureException(error, {
        tags: { section: 'events', action: 'delete_all' },
        user: { id: localStorage.getItem('token')?.substring(0, 10) }
      });
      toast.error('Failed to delete events');
    } finally {
      setLoading(false);
    }
  };

    const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null); // ✅ Reset error before fetching

      try {
        const token = localStorage.getItem('token');
        //    console.log('Token:', token); // Debugging

        const response = await fetch('https://292x833w13.execute-api.us-east-2.amazonaws.com/events/events', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          const error = new Error(`Failed to fetch data (Status: ${response.status})`);
          Sentry.captureException(error, {
            tags: { section: 'events', action: 'fetch' },
            extra: { status: response.status, statusText: response.statusText }
          });
          throw error;
        }

        const data = await response.json();
        console.log('Fetched Data:', data); // Debugging log
        
        

        // ✅ Check if "events" exists and is an array
        if (!data?.events || !Array.isArray(data.events)) {
          const error = new Error('Invalid API response format');
          Sentry.captureException(error, {
            tags: { section: 'events', action: 'parse' },
            extra: { receivedData: data }
          });
          setError('Invalid API response format');
          return;
        }

        const formattedData: UserProps[] = data.events.map((event: any) => {
          // Calculate event status based on date (2 days after event date)
          // Handle ordinal dates like "November 1st, 2025" by removing ordinal suffixes
          const cleanedDate = event.date.replace(/(\d+)(st|nd|rd|th)/g, '$1');
          const eventDate = new Date(cleanedDate);
          const expirationDate = new Date(eventDate.getTime() + (2 * 24 * 60 * 60 * 1000));
          const now = new Date();
          const isExpired = now > expirationDate;
          
          // Determine status with priority: Expired > Inactive > Active
          let status = 'Active';
          if (isExpired) {
            status = 'Expired';
          } else if (!event.isActive) {
            status = 'Inactive';
          }
          
          return {
            id: event._id,
            name: event.name,
            date: event.date,
            description: event.description,
            location: event.location,
            createdAt: new Date(event.createdAt).toLocaleDateString(),
            status,
          };
        });
        

        console.log('Formatted Data:', formattedData);
        setUsers(formattedData);
        
      } catch (error) {
        Sentry.captureException(error, {
          tags: { section: 'events', action: 'fetch_all' }
        });
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    };
    

    fetchUsers();

    
    const timer = setTimeout(() => {
      localStorage.removeItem("token");
      navigate("/sign-in"); // Redirect to sign-in page
    }, 1800000); // 30 minutes (1,800,000 ms)
    

    return () => clearTimeout(timer); // Cleanup timeout if component unmounts
  }, [navigate]);


  

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
      <Typography variant="h4" flexGrow={1} padding={1}>
        Events
      </Typography>
      <Stack direction="row" spacing={1}>
      <Button
            variant="contained"
            color="success"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => setOpen(true)}
            sx={{
              fontSize: { xs: "0.75rem", sm: "0.875rem", md: "1rem" },
              padding: { xs: "2px 6px", sm: "6px 8px", md: "8px 10px" }, // Reduced horizontal padding
              letterSpacing: "0.2px", // Reduced letter spacing
              textTransform: "none", // Keep text as is, without auto-uppercase
              minWidth: { xs: "auto", sm: "auto" },
              
      height: { xs: "52px", sm: "40px", md: "48px" },
            }}
          >
          New Event
          </Button>
         

          <EventModal open={open} handleClose={() => setOpen(false)}>
            {/* Add form elements inside if needed */}
          </EventModal>


      
        <Button
            variant="contained"
            color="error"
            startIcon={<Iconify icon="mingcute:delete-line" />}
            onClick={() => setDeleteModalOpen(true)} // Open delete confirmation modal
            
          
             sx={{
              fontSize: { xs: "0.75rem", sm: "0.875rem", md: "1rem" },
              padding: { xs: "2px 6px", sm: "6px 8px", md: "8px 10px" }, // Reduced horizontal padding
              letterSpacing: "0.2px", // Reduced letter spacing
              textTransform: "none", // Keep text as is, without auto-uppercase
            
      height: { xs: "52px", sm: "40px", md: "48px" },
          }}
        >
            Delete all Events
          </Button>

          {/* Delete Confirmation Modal */}
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
                  
                  { id: 'id', label: 'Event-id' },
                  { id: 'name', label: 'Event-Name' },
                  { id: 'location', label: 'Location' },

                  { id: 'date', label: 'Date' },
                  { id: 'createdAt', label: 'CreatedAt' },

                  { id: 'description', label: 'Description' },

                  { id: 'status', label:"Status" },
                  { id: 'action', label:"Action" },
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