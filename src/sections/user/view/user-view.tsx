import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import Stack from '@mui/material/Stack';
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

// ----------------------------------------------------------------------

export function UserView() {
  const table = useTable();
  const [filterName, setFilterName] = useState('');
  const [users, setUsers] = useState<UserProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // ✅ Define error state
  
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null); // ✅ Reset error before fetching

      try {
        const token = localStorage.getItem('token');
        //    console.log('Token:', token); // Debugging

        const response = await fetch('https://softinvite-api.onrender.com/events/events', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          console.error('Fetch error:', response.status, response.statusText);
          throw new Error(`Failed to fetch data (Status: ${response.status})`);
        }

        const data = await response.json();
        // console.log('Fetched Data:', data); // Debugging log

        // ✅ Check if "events" exists and is an array
        if (!data?.events || !Array.isArray(data.events)) {
          console.error('Expected an array under "events" but got:', data);
          setError('Invalid API response format');
          return;
        }

        const formattedData: UserProps[] = data.events.map((event: any) => ({
          id: event._id,
          name: event.name,
          date: event.date,
          location: event.location,
          createdAt: new Date(event.createdAt).toLocaleDateString(),
          status: event.isActive ? 'Active' : 'Inactive',
        }));

        console.log('Formatted Data:', formattedData);
        setUsers(formattedData);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const dataFiltered: UserProps[] = applyFilter({
    inputData: users,
    comparator: getComparator(table.order, table.orderBy),
    filterName,
  });

  const notFound = !dataFiltered.length && !!filterName;

  return (
    <DashboardContent>
      <Box display="flex" alignItems="center" mb={5}>
        <Typography variant="h4" flexGrow={1}>
          Events
        </Typography>
        <Stack direction="row" spacing={2}>
        <Button
        variant="contained"
        color="inherit"
        startIcon={<Iconify icon="mingcute:add-line" />}
        onClick={() => setOpen(true)}
      >
        Create new Event
      </Button>

      {/* Import and use the reusable modal */}
      <EventModal open={open} handleClose={() => setOpen(false)}>
        {/* You can pass form elements inside here if needed */}
      </EventModal>
          <Button
            variant="contained"
         color="error"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            Delete all Events
          </Button>
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
                  { id: 'location', label: 'Location' },

                  { id: 'date', label: 'Date' },
                  { id: 'createdAt', label: 'CreatedAt' },

                  { id: 'status', label: 'Status' },

                  { id: '' },
                  { id: '' },
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
