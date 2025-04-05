import { useState, useCallback, useEffect, useRef } from 'react';
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

// Import the Html5QrcodeScanner from the html5-qrcode library
import { Html5QrcodeScanner } from 'html5-qrcode';

// ----------------------------------------------------------------------

export type UserProps = {
  id: string;
  name: string;
  status: string;
  _id: string;
  phone: string;
  createdAt: string;
  email: string;
  avatarUrl: string;
  isVerified: boolean;
};

type UserTableRowProps = {
  row: UserProps;
  selected: boolean;
  onSelectRow: () => void;
};

export function UserTableRow({ row, selected, onSelectRow }: UserTableRowProps) {
  console.log("Rendering UserTableRow with data:", row);

  const token = localStorage.getItem('token');
  const [openPopover, setOpenPopover] = useState<HTMLButtonElement | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  // State for QR scanning dialog
  const [openScanDialog, setOpenScanDialog] = useState(false);
  const qrScannerRef = useRef<Html5QrcodeScanner | null>(null);

  const nameParts = row.name.split(' ');
  const initialFirstName = nameParts[0];
  const initialLastName = nameParts.slice(1).join(' ') || '';

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [email, setEmail] = useState(row.email);
  const [phone, setPhone] = useState(row.phone);

  useEffect(() => {
    const storedIds = JSON.parse(localStorage.getItem('alls') || '[]');
    if (!storedIds.includes(row.id)) {
      storedIds.push(row.id);
      localStorage.setItem('allRowIds', JSON.stringify(storedIds));
    }
  }, [row.id]);

  useEffect(() => {
    const storedIds = JSON.parse(localStorage.getItem('alls') || '[]');
    if (!storedIds.includes(row._id)) {
      storedIds.push(row._id);
      localStorage.setItem('allRwIds', JSON.stringify(storedIds));
    }
  }, [row._id]);

  const handleOpenPopover = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    console.log("Opening popover for:", row.name);
    setOpenPopover(event.currentTarget);
  }, [row.name]);

  const handleClosePopover = useCallback(() => {
    console.log("Closing popover");
    setOpenPopover(null);
  }, []);

  const handleOpenEditDialog = useCallback(() => {
    console.log("Opening edit dialog for:", row.name);
    setFirstName(initialFirstName);
    setLastName(initialLastName);
    setEmail(row.email);
    setPhone(row.phone);
    setOpenDialog(true);
    handleClosePopover();
  }, [row, initialFirstName, initialLastName, handleClosePopover]);

  const handleCloseDialog = useCallback(() => {
    console.log("Closing edit dialog");
    setOpenDialog(false);
  }, []);

  const handleSubmitEdit = useCallback(async () => {
    const eventIdArray = localStorage.getItem('allRowIds'); // Retrieve from local storage
    let eventId = null;
    console.log(eventIdArray);
    if (eventIdArray) {
      try {
        const parsedIds = JSON.parse(eventIdArray);
        if (Array.isArray(parsedIds) && parsedIds.length > 0) {
          eventId = parsedIds[0];
        } else {
          console.error("Parsed data is not a valid array:", parsedIds);
        }
      } catch (error) {
        console.error("Error parsing event IDs:", error);
      }
    }
  
    if (!eventId) {
      toast.error("No valid event ID found in local storage.", {
        position: 'top-right',
        autoClose: 3000,
      });
      return;
    }
  
    try {
      const response = await fetch(`https://software-invite-api-self.vercel.app/guest/update-guest/${row._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          eventId,
        })
      });
      console.log(row.id);
  
      if (!response.ok) {
        throw new Error(`Failed to update guest: ${response.statusText}`);
      }
  
      const data = await response.json();
      console.log("Guest updated:", data);
  
      toast.success('Edited successfully!', {
        position: 'top-right',
        autoClose: 3000,
        onClose: () => window.location.reload(),
      });
      
    } catch (error) {
      console.error("Error editing guest:", error);
      toast.error("Failed to edit guest. Please try again.", {
        position: 'top-right',
        autoClose: 3000,
      });
    } finally {
      handleCloseDialog();
    }
    console.log(row.id);
    
  }, [row.id, row._id, token, firstName, lastName, email, phone, handleCloseDialog]);

  const handleDelete = useCallback(async () => {
    console.log("Delete clicked for:", row.name);
    try {
      const response = await fetch(`https://software-invite-api-self.vercel.app/guest/single-guest/${row._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      console.log("Delete response:", data);
    } catch (error) {
      console.error("Error deleting event:", error);
    } finally {
      handleClosePopover();
      toast.success('Deletion successful!', {
        position: 'top-right',
        autoClose: 2000,
      });
      window.location.reload();
    }
  }, [row, token, handleClosePopover]);

  const handleDownloadQRCode = useCallback(async () => {
    console.log("Downloading QR code for:", row.name);
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
      const data = await response.json();
      console.log("QR Code data:", data);
      if (data.downloadUrl) {
        window.open(data.downloadUrl, "_blank");
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = '';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        toast.error('Failed to retrieve QR Code', {
          position: 'top-right',
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error("Error downloading QR Code:", error);
      toast.error('Error downloading QR Code', {
        position: 'top-right',
        autoClose: 3000,
      });
    } finally {
      handleClosePopover();
    }
  }, [row._id, row.name, token, handleClosePopover]);

  // Handle scanning QR codes using Html5QrcodeScanner
  const handleScanQRCode = useCallback(() => {
    console.log("Scanning QR code for:", row.name);
    setOpenScanDialog(true);
  }, [row.name]);

  // Start the QR scanner when the scanning dialog opens.
  useEffect(() => {
    if (openScanDialog) {
      const qrCodeRegionId = "qr-reader";
      const config = { fps: 10, qrbox: 250 };
      try {
        const qrScanner = new Html5QrcodeScanner(qrCodeRegionId, config, false);
        qrScanner.render(
          (decodedText: string, decodedResult) => {
            console.log(`QR Code scanned: ${decodedText}`);
            toast.success(`QR Code scanned: ${decodedText}`, {
              position: 'top-right',
              autoClose: 3000,
            });
            // Clear the scanner and close the dialog after a successful scan.
            qrScanner.clear().then(() => {
              setOpenScanDialog(false);
            }).catch((err) => {
              console.error("Error stopping QR scanner", err);
            });
          },
          (errorMessage: string) => {
            console.warn(`QR Code scan error: ${errorMessage}`);
          }
        );
        qrScannerRef.current = qrScanner;
      } catch (err) {
        console.error("Error initializing QR scanner", err);
        toast.error("Error initializing QR scanner", {
          position: 'top-right',
          autoClose: 3000,
        });
        setOpenScanDialog(false);
      }
    }
    // Cleanup when the component unmounts or dialog closes.
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.clear().catch((err) => {
          console.error("Error during cleanup of QR scanner", err);
        });
        qrScannerRef.current = null;
      }
    };
  }, [openScanDialog]);

  // Close scanning dialog and stop the scanner manually if needed.
  const handleCloseScanDialog = useCallback(() => {
    if (qrScannerRef.current) {
      qrScannerRef.current.clear().then(() => {
        qrScannerRef.current = null;
        setOpenScanDialog(false);
      }).catch((err) => {
        console.error("Error stopping QR scanner", err);
        setOpenScanDialog(false);
      });
    } else {
      setOpenScanDialog(false);
    }
    handleClosePopover();
  }, [handleClosePopover]);

  return (
    <>
      <TableRow hover tabIndex={-1} role="checkbox" selected={selected}>
        <TableCell padding="checkbox">
          <Checkbox
            disableRipple
            checked={selected}
            onChange={() => {
              console.log("Checkbox clicked for:", row.name, "Selected:", !selected);
              onSelectRow();
            }}
          />
        </TableCell>
        <TableCell component="th" scope="row">
          <Box gap={2} display="flex" alignItems="center">
            <Avatar alt={row.name} src={row.avatarUrl} />
            {row.name}
          </Box>
        </TableCell>
        <TableCell>{row.email}</TableCell>
        <TableCell>{row.phone}</TableCell>
        <TableCell>{row.createdAt}</TableCell>
        <TableCell>
          <Label color={(row.status === 'pending' && 'warning') || 'success'}>
            {row.status}
          </Label>
        </TableCell>
        <TableCell align="right">
          <IconButton onClick={handleOpenPopover}>
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
        </TableCell>
      </TableRow>

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
            get qr-code
          </MenuItem>
          <MenuItem onClick={handleScanQRCode} sx={{ color: 'success.main' }}>
            <Iconify icon="uil:cloud-download" />
            scan qr-code
          </MenuItem>
        </MenuList>
      </Popover>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Edit Guest</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="First Name"
            fullWidth
            variant="outlined"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Last Name"
            fullWidth
            variant="outlined"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
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

      {/* QR Code scanning dialog with fallback styling */}
      <Dialog open={openScanDialog} onClose={handleCloseScanDialog} fullWidth maxWidth="sm">
        <DialogTitle>Scan QR Code</DialogTitle>
        <DialogContent>
          <div
            id="qr-reader"
            style={{
              width: '100%',
              minHeight: '300px', // Ensure the container is visible
              backgroundColor: '#f5f5f5'
            }}
          >
            {/* The QR scanner UI will be injected here */}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseScanDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
