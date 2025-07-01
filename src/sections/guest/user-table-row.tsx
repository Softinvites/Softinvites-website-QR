import { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Popover from '@mui/material/Popover';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import MenuList from '@mui/material/MenuList';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import MenuItem, { menuItemClasses } from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { toast } from 'react-toastify';
import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

export type UserProps = {
  id: string;
  fullname: string;
  seatNo: string;
  status: string;
  _id: string;
  phone: string;
  createdAt: string;
  email: string;
  avatarUrl: string;
  isVerified: boolean;
  qrCode?: string;
};

type UserTableRowProps = {
  row: UserProps;
  selected: boolean;
  onSelectRow: () => void;
  showActions: boolean;
};

export function UserTableRow({ row, selected, onSelectRow, showActions }: UserTableRowProps) {
  const token = localStorage.getItem('token');
  const [openPopover, setOpenPopover] = useState<HTMLButtonElement | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [fullname, setFullname] = useState(row.fullname);
  const [seatNo, setSeatNo] = useState(row.seatNo);
  const [email, setEmail] = useState(row.email);
  const [phone, setPhone] = useState(row.phone);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);

  const handleOpenPopover = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setOpenPopover(event.currentTarget);
  }, []);

  const handleClosePopover = useCallback(() => {
    setOpenPopover(null);
  }, []);

  const handleOpenEditDialog = useCallback(() => {
    setFullname(row.fullname);
    setSeatNo(row.seatNo);
    setEmail(row.email);
    setPhone(row.phone);
    setOpenDialog(true);
    handleClosePopover();
  }, [row, handleClosePopover]);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
  }, []);

  const handleSubmitEdit = useCallback(async () => {
    try {
      const response = await fetch(
        `https://software-invite-api-self.vercel.app/guest/update-guest/${row._id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fullname,
            seatNo,
            email,
            phone,
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to update guest: ${response.statusText}`);
      }

      toast.success('Edited successfully!', {
        position: 'top-right',
        autoClose: 3000,
        onClose: () => window.location.reload(),
      });
    } catch (error) {
      console.error('Error editing guest:', error);
      toast.error('Failed to edit guest. Please try again.', {
        position: 'top-right',
        autoClose: 3000,
      });
    } finally {
      handleCloseDialog();
    }
  }, [row._id, token, fullname, seatNo, email, phone, handleCloseDialog]);

  const confirmDelete = useCallback(async () => {
    try {
      const response = await fetch(
        `https://software-invite-api-self.vercel.app/guest/single-guest/${row._id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      if (!response.ok) {
        throw new Error('Failed to delete guest');
      }
  
      toast.success('Deletion successful!', {
        position: 'top-right',
        autoClose: 2000,
      });
  
      window.location.reload();
    } catch (error) {
      console.error('Error deleting guest:', error);
      toast.error('Failed to delete guest', {
        position: 'top-right',
        autoClose: 3000,
      });
    } finally {
      setOpenConfirmDialog(false);
      handleClosePopover();
    }
  }, [row._id, token, handleClosePopover]);

  const handleDelete = useCallback(() => {
    setOpenConfirmDialog(true);
    handleClosePopover();
  }, [handleClosePopover]);

  
  const handleDownloadQRCode = useCallback(async () => {
    console.log("Downloading QR code for:", row.fullname);
    try {
      const response = await fetch(`https://software-invite-api-self.vercel.app/guest/download-qrcode/${row._id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
  
      if (!response.ok) {
        throw new Error(`Failed to get QR Code: ${response.statusText}`);
      }
  
      const blob = await response.blob(); // ✅ This reads the binary PNG
  
      // Create a URL for the blob and trigger the download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-${row.fullname || 'guest'}.png`; // Optional: nicer filename
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url); // Clean up
  
    } catch (error) {
      console.error("Error downloading QR Code:", error);
      toast.error('Error downloading QR Code', {
        position: 'top-right',
        autoClose: 3000,
      });
    } finally {
      handleClosePopover();
    }
  }, [row._id, row.fullname, token, handleClosePopover]);
  
  return (
    <>
      <TableRow hover tabIndex={-1} role="checkbox" selected={selected}>
        {showActions && (
          <TableCell padding="checkbox">
            <Checkbox
              disableRipple
              checked={selected}
              onChange={onSelectRow}
            />
          </TableCell>
        )}

        <TableCell>
          <Box display="flex" alignItems="center" gap={2}>
            {/* <Avatar alt={row.name} src={row.avatarUrl} /> */}
            {row.fullname}
          </Box>
        </TableCell>
        <TableCell>{row.seatNo}</TableCell>
        <TableCell>{row.phone}</TableCell>
        <TableCell>{row.email}</TableCell>
        <TableCell>{row.createdAt}</TableCell>
        <TableCell>
          <Label color={(row.status === 'pending' && 'warning') || 'success'}>
            {row.status}
          </Label>
        </TableCell>

        {showActions && (
          <TableCell align="right">
            <IconButton onClick={handleOpenPopover}>
              <Iconify icon="eva:more-vertical-fill" />
            </IconButton>
          </TableCell>
        )}
      </TableRow>

      {showActions && (
        <Popover
          open={!!openPopover}
          anchorEl={openPopover}
          onClose={handleClosePopover}
          anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuList
            disablePadding
            sx={{
              p: 0.5,
              gap: 0.5,
              width: 140,
              display: 'flex',
              flexDirection: 'column',
              [`& .${menuItemClasses.root}`]: {
                px: 1,
                gap: 2,
                borderRadius: 0.75,
                [`&.${menuItemClasses.selected}`]: { bgcolor: 'action.selected' },
              },
            }}
          >
            <MenuItem onClick={handleOpenEditDialog}>
              <Iconify icon="solar:pen-bold" />
              Edit
            </MenuItem>

            <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
              <Iconify icon="solar:trash-bin-trash-bold" />
              Delete
            </MenuItem>

            <MenuItem onClick={handleDownloadQRCode} sx={{ color: 'success.main' }}>
              <Iconify icon="uil:cloud-download" />
              Get QR Code
            </MenuItem>
          </MenuList>
        </Popover>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Edit Guest</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Full Name"
            fullWidth
            variant="outlined"
            value={fullname}
            onChange={(e) => setFullname(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Seat Number"
            fullWidth
            variant="outlined"
            value={seatNo}
            onChange={(e) => setSeatNo(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Email"
            fullWidth
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Phone"
            fullWidth
            variant="outlined"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmitEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openConfirmDialog} onClose={() => setOpenConfirmDialog(false)}>
  <DialogTitle>Confirm Deletion</DialogTitle>
  <DialogContent>
    Are you sure you want to delete <strong>{row.fullname}</strong>? This action cannot be undone.
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setOpenConfirmDialog(false)} color="inherit">
      Cancel
    </Button>
    <Button onClick={confirmDelete} variant="contained" color="error">
      Yes, Delete
    </Button>
  </DialogActions>
</Dialog>

    </>
  );
}