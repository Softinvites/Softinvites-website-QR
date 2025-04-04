import { useState, useCallback, useEffect } from 'react';

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

// Import Html5QrcodeScanner from the html5-qrcode library
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

// Create a custom scanner component using html5-qrcode
const Html5QrCodeScannerComponent = ({
  onScanSuccess,
  onScanError,
}: {
  onScanSuccess: (decodedText: string, decodedResult: any) => void;
  onScanError: (errorMessage: string) => void;
}) => {
  useEffect(() => {
    // Configuration options for the scanner
    const config = { fps: 10, qrbox: 250 };
    const scanner = new Html5QrcodeScanner("html5qr-reader", config, false);

    // Render the scanner and pass callbacks
    scanner.render(
      (decodedText, decodedResult) => {
        onScanSuccess(decodedText, decodedResult);
      },
      (errorMessage) => {
        onScanError(errorMessage);
      }
    );

    // Clear the scanner when the component is unmounted
    return () => {
      scanner.clear().catch((error) => {
        console.error("Failed to clear html5QrCodeScanner", error);
      });
    };
  }, [onScanSuccess, onScanError]);

  return <div id="html5qr-reader" />;
};

export function UserTableRow({ row, selected, onSelectRow }: UserTableRowProps) {
  console.log("Rendering UserTableRow with data:", row);

  // Retrieve the token from local storage (or via context)
  const token = localStorage.getItem('token');

  const [openPopover, setOpenPopover] = useState<HTMLButtonElement | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openScanDialog, setOpenScanDialog] = useState(false);

  // Split the full name into firstName and lastName (if possible)
  const nameParts = row.name.split(' ');
  const initialFirstName = nameParts[0];
  const initialLastName = nameParts.slice(1).join(' ') || '';

  // Editable state values
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [email, setEmail] = useState(row.email);
  const [phone, setPhone] = useState(row.phone);

  // Save the row's ID to local storage when the component mounts
  useEffect(() => {
    const storedIds = JSON.parse(localStorage.getItem('alls') || '[]');
    if (!storedIds.includes(row.id)) {
      storedIds.push(row.id);
      localStorage.setItem('allRowIds', JSON.stringify(storedIds));
    }
  }, [row.id]);

  // Save the row's ID (_id) to local storage when the component mounts
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

  // Open the edit dialog and initialize form values
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

  // Submit the edit using the new endpoint and payload structure
  const handleSubmitEdit = useCallback(async () => {
    const eventIdArray = localStorage.getItem('allRowIds'); // Retrieve from local storage
    let eventId = null;
    console.log(eventId);
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
  
    console.log(eventId);
  
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

  // DELETE function remains unchanged
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

  // Existing: Download QR Code function
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

  // NEW: Open the scan dialog (which activates the camera)
  const handleOpenScanDialog = useCallback(() => {
    setOpenScanDialog(true);
    handleClosePopover();
  }, [handleClosePopover]);

  const handleCloseScanDialog = useCallback(() => {
    setOpenScanDialog(false);
  }, []);

  // Callback for handling the QR scan result from the Html5QrcodeScanner
  const handleScanSuccess = useCallback(
    async (decodedText: string, decodedResult: any) => {
      console.log("Scanned QR code data:", decodedText);
      try {
        const response = await fetch(`https://software-invite-api-self.vercel.app/guest/scan-qrcode`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ scannedData: decodedText })
        });
        if (!response.ok) {
          throw new Error(`Failed to process scanned QR Code: ${response.statusText}`);
        }
        const resultData = await response.json();
        console.log("Processed scan result:", resultData);
        toast.success('QR Code scanned and processed successfully!', {
          position: 'top-right',
          autoClose: 3000,
        });
      } catch (err) {
        console.error("Error processing scanned QR Code:", err);
        toast.error('Error processing scanned QR Code', {
          position: 'top-right',
          autoClose: 3000,
        });
      } finally {
        handleCloseScanDialog();
      }
    },
    [token, handleCloseScanDialog]
  );

  // Optional error callback for scanner errors
  const handleScanError = useCallback((errorMessage: string) => {
    console.info("QR Scanner error:", errorMessage);
  }, []);

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

          <MenuItem onClick={handleOpenScanDialog} sx={{ color: 'success.main' }}>
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

      {/* Scan QR Code Dialog using Html5-QRCode */}
      <Dialog open={openScanDialog} onClose={handleCloseScanDialog} fullWidth maxWidth="sm" sx={{ width: '100%' }}>
        <DialogTitle>Scan QR Code</DialogTitle>
        <DialogContent>
          <Html5QrCodeScannerComponent onScanSuccess={handleScanSuccess} onScanError={handleScanError} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseScanDialog}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
