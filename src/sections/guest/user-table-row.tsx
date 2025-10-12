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
  TableNo: string;
  status: string;
  _id: string;
  phone: string;
  createdAt: string;
  others:string;
  email: string;
  avatarUrl: string;
  isVerified: boolean;
  qrCode?: string;
  eventId: string;
};


  type UserTableRowProps = {
    row: UserProps;
    selected: boolean;
    onSelectRow: () => void;
    showActions: boolean;
    showOthersColumn?: boolean; 
  };
  


export function UserTableRow({ row, selected, onSelectRow, showActions, showOthersColumn }: UserTableRowProps) {
  const token = localStorage.getItem('token');
  const [openPopover, setOpenPopover] = useState<HTMLButtonElement | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [fullname, setFullname] = useState(row.fullname);
  const [TableNo, setTableNo] = useState(row.TableNo);
  const [email, setEmail] = useState(row.email);
  const [phone, setPhone] = useState(row.phone);
  const [others, setOthers] = useState(row.others);
   const [eventId, setEventId] = useState(row.eventId);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);

  const handleOpenPopover = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setOpenPopover(event.currentTarget);
  }, []);

  const handleClosePopover = useCallback(() => {
    setOpenPopover(null);
  }, []);

  const handleOpenEditDialog = useCallback(() => {
    setFullname(row.fullname);
    setTableNo(row.TableNo);
    setEmail(row.email);
    setPhone(row.phone);
    setOthers(row.others);
    setEventId(row.eventId);
    setOpenDialog(true);
    handleClosePopover();
  }, [row, handleClosePopover]);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
  }, []);


  const handleSubmitEdit = useCallback(async () => {
  try {
    const response = await fetch(
      `https://292x833w13.execute-api.us-east-2.amazonaws.com/guest/update-guest`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: row.id, 
          fullname,
          TableNo,
          email,
          phone,
          others,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Server responded with:", errorText);
      throw new Error(`Failed to update guest: ${response.status} - ${errorText}`);
    }

    toast.success("Edited successfully!", {
      position: "top-right",
      autoClose: 3000,
      onClose: () => window.location.reload(),
    });
  } catch (error: any) {
    console.error("Error editing guest:", error);
    toast.error(error.message || "Failed to edit guest.", {
      position: "top-right",
      autoClose: 3000,
    });
  } finally {
    handleCloseDialog();
  }
}, [row.id, token, fullname, TableNo, email, phone, others, handleCloseDialog]);


  const confirmDelete = useCallback(async () => {
    try {
      const response = await fetch(
        `https://292x833w13.execute-api.us-east-2.amazonaws.com/guest/single-guest/${row._id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorMessage = await response.text(); // Read response body
        throw new Error(`Failed to update guest: ${response.status} - ${errorMessage}`);
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

//   const handleDownloadQRCode = useCallback(async () => {
//   try {
//     const response = await fetch(
//       `https://292x833w13.execute-api.us-east-2.amazonaws.com/guest/download-qrcode/${row._id}`,
//       {
//         method: 'GET',
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       }
//     );

//     if (!response.ok) {
//       throw new Error(`Failed to get QR Code: ${response.statusText}`);
//     }

//     // 👇 Parse JSON since backend wraps base64 inside "body"
//     const data = await response.json();

//     // Decode base64 body into binary
//     const binaryString = atob(data.body);
//     const len = binaryString.length;
//     const bytes = new Uint8Array(len);
//       for (let i = 0; i < len; i += 1) {
//         bytes[i] = binaryString.charCodeAt(i);
//       }

//     const blob = new Blob([bytes], { type: data.headers["Content-Type"] || "image/png" });

//     // Create a URL for the blob and trigger the download
//     const url = window.URL.createObjectURL(blob);
//     const link = document.createElement('a');
//     link.href = url;

//     // Extract filename from Content-Disposition header
//     const disposition = data.headers["Content-Disposition"];
//     const match = disposition?.match(/filename="(.+)"/);
//     const filename = match ? match[1] : `qr-${row.fullname || 'guest'}.png`;

//     link.download = filename;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//     window.URL.revokeObjectURL(url);
//   } catch (error) {
//     console.error('Error downloading QR Code:', error);
//     toast.error('Error downloading QR Code', {
//       position: 'top-right',
//       autoClose: 3000,
//     });
//   } finally {
//     handleClosePopover();
//   }
// }, [row._id, row.fullname, token, handleClosePopover]);

const handleDownloadQRCode = useCallback(async () => {
  try {
    const response = await fetch(
      `https://292x833w13.execute-api.us-east-2.amazonaws.com/guest/download-qrcode/${row._id}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get QR Code: ${response.statusText}`);
    }

    // Check if response is JSON (API Gateway format) or direct PNG
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      // Handle API Gateway JSON format (like email download)
      const data = await response.json();
      
      // Decode base64 body into binary
      const binaryString = atob(data.body);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i += 1) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: data.headers["Content-Type"] || "image/png" });

      // Create a URL for the blob and trigger the download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Extract filename from Content-Disposition header
      const disposition = data.headers["Content-Disposition"];
      const match = disposition?.match(/filename="(.+)"/);
      const filename = match ? match[1] : `qr-${row.fullname || 'guest'}.png`;

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } else {
      // Handle direct PNG response (current downloadQRCode behavior)
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from Content-Disposition header or use default
      const disposition = response.headers.get('content-disposition');
      const match = disposition?.match(/filename="(.+)"/);
      const filename = match ? match[1] : `qr-${row.fullname || 'guest'}.png`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('Error downloading QR Code:', error);
    toast.error('Error downloading QR Code');
  } finally {
    handleClosePopover();
  }
}, [row._id, row.fullname, token, handleClosePopover]);

  return (
    <>
      <TableRow hover tabIndex={-1} role="checkbox" selected={selected}>
        {showActions && (
          <TableCell padding="checkbox">
            <Checkbox disableRipple checked={selected} onChange={onSelectRow} />
          </TableCell>
        )}

        <TableCell>
          <Box display="flex" alignItems="center" gap={2}>
            {/* <Avatar alt={row.name} src={row.avatarUrl} /> */}
            {row.fullname}
          </Box>
        </TableCell>
        <TableCell>{row.TableNo}</TableCell>
        <TableCell>{row.phone}</TableCell>
        <TableCell>{row.email}</TableCell>
        <TableCell> {row.createdAt} </TableCell>





        {showOthersColumn && <TableCell>{row.others}</TableCell>}
        <TableCell>
          <Label color={(row.status === 'pending' && 'warning') || 'success'}>{row.status}</Label>
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
            value={TableNo}
            onChange={(e) => setTableNo(e.target.value)}
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
          <TextField
            margin="dense"
            label="Others"
            fullWidth
            variant="outlined"
            value={others}
            onChange={(e) => setOthers(e.target.value)}
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
          Are you sure you want to delete <strong>{row.fullname}</strong>? This action cannot be
          undone.
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
