import { useState, useCallback, useEffect } from 'react';

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

import {  toast } from 'react-toastify';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// ----------------------------------------------------------------------

export type UserProps = {
  id: string;
  name: string;
  status: string;
  date: string;
  createdAt: string;
  location: string;
  avatarUrl: string;
  isVerified: boolean;
  description: string;
};

type UserTableRowProps = {
  row: UserProps;
  selected: boolean;
  onSelectRow: () => void;
};

export function UserTableRow({ row, selected, onSelectRow }: UserTableRowProps) {
  console.log("Rendering UserTableRow with data:", row);

  // Replace with your actual token or use a context/provider
  const token = localStorage.getItem('token');

  const [openPopover, setOpenPopover] = useState<HTMLButtonElement | null>(null);

  
  const [tempLink, setTempLink] = useState<string | null>(null);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);

  
  const [openDialog, setOpenDialog] = useState(false);

  // These states hold the editable values.
  // If you want to pre-populate with your specific details, you could also initialize here:
  // useState("Stalo x Vera Wedding") etc.
  const [editName, setEditName] = useState(row.name);
  const [editDate, setEditDate] = useState(row.date);
  const [editLocation, setEditLocation] = useState(row.location);
  
  const [editDescription, setEditDescription] = useState(row.description);


  
const navigate = useNavigate();



   // Save the row's ID to local storage when the component mounts
   useEffect(() => {
    // Get the existing array of saved IDs, or initialize an empty array
    const storedIds = JSON.parse(localStorage.getItem('allRowIds') || '[]');
    
    // Add the current row's ID if it doesn't already exist
    if (!storedIds.includes(row.id)) {
      storedIds.push(row.id);
      localStorage.setItem('allRowIds', JSON.stringify(storedIds));
    }
  }, [row.id]);


  const handleOpenPopover = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    console.log("Opening popover for:", row.name);
    setOpenPopover(event.currentTarget);
  }, [row.name]);

  const handleClosePopover = useCallback(() => {
    console.log("Closing popover");
    setOpenPopover(null);
  }, []);

  // Open the edit dialog and initialize form values (or set defaults as needed)
  const handleOpenEditDialog = useCallback(() => {
    console.log("Opening edit dialog for:", row.name);
    // If you want to use the specific details provided in your example, uncomment these:
    // setEditName("Stalo x Vera Wedding");
    // setEditDate("16th September, 2026");
    // setEditLocation("Victoria Island Lagos");
    // Otherwise, initialize with the current row values:
    setEditName(row.name);
    setEditDate(row.date);
    setEditLocation(row.location);
    
    setEditDescription(row.description);
    setOpenDialog(true);
    handleClosePopover();
  }, [row, handleClosePopover]);

  const handleCloseDialog = useCallback(() => {
    console.log("Closing edit dialog");
    setOpenDialog(false);
  }, []);

  const handleSubmitEdit = useCallback(async () => {
    console.log("Submitting edit for:", row.name, "with values:", { editName, editDate, editLocation,editDescription });
  
    try {
      const response = await fetch(`https://software-invite-api-self.vercel.app/events/update/${row.id}`, {
        method: 'PUT', // Ensure your API expects 'PUT' or 'PATCH'
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName,
          date: editDate,
          location: editLocation,
          description: editDescription
        })
      });
  
      if (!response.ok) {
        throw new Error(`Failed to update event: ${response.statusText}`);
      }
  
      const data = await response.json();
      console.log("Event updated:", data);
  
      toast.success('Edited successfully!', {
        position: 'top-right',
        autoClose: 3000, // Closes after 2 seconds
        onClose: () => window.location.reload(), // Reload only after the toast disappears
      });
      
      // Option 1: Update state instead of reloading (if using state management)
      // updateEventState(row.id, { name: editName, date: editDate, location: editLocation });
  
    } catch (error) {
      console.error("Error editing event:", error);
      toast.error("Failed to edit event. Please try again.", {
        position: 'top-right',
        autoClose: 3000,
      });
    } finally {
      handleCloseDialog(); // Close dialog after the toast appears
    }
    
  }, [row.id, token, editName, editDate, editLocation, row.name,editDescription, handleCloseDialog]);
 // —————— Copy-Link Dialog ——————
 const handleGenerateTempLink = useCallback(async () => {
  try {
    const { data } = await axios.post<{ tempLink: string }>(
      `https://software-invite-api-self.vercel.app/guest/generate-temp-link/${row.id}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!data.tempLink) throw new Error();

    setTempLink(data.tempLink);
    setIsLinkDialogOpen(true);
    toast.success('Link generated!', { position: 'top-right', autoClose: 2000 });
  } catch {
    toast.error('Could not generate link.', { position: 'top-right' });
  } finally {
    handleClosePopover();
  }
}, [row.id, token, handleClosePopover]);

const handleCopyLink = () => {
  if (!tempLink) return;
  navigator.clipboard
    .writeText(tempLink)
    .then(() => toast.success('Copied to clipboard!', { position: 'top-right', autoClose: 1500 }))
    .catch(() => toast.error('Failed to copy.', { position: 'top-right' }));
};

const handleCloseLinkDialog = () => {
  setIsLinkDialogOpen(false);
};
  
  
  // DELETE function remains unchanged
  const handleDelete = useCallback(async () => {
    console.log("Delete clicked for:", row.name);
    try {
      const response = await fetch(`https://software-invite-api-self.vercel.app/events/events/${row.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      

    // Remove allRowIds from localStorage
    localStorage.removeItem("allRowIds");
      console.log("Delete response:", data);
    } catch (error) {
      console.error("Error deleting event:", error);
    } finally {
      handleClosePopover();
      toast.success('successful!', {
        position: 'top-right',
        autoClose: 2000, // Close after 2 seconds
      });
  
      
      window.location.reload(); // Refresh the page
    }
  }, [row, token, handleClosePopover]);

  
  // This function saves the current row's id into localStorage as an array,
  // then navigates to the guest page.
  const handleOpenEditDialo = useCallback(() => {
    console.log("Navigating to guest page for row:", row.id);
    const allRowIds = [row.id];
    localStorage.setItem("allRowIds", JSON.stringify(allRowIds));
    navigate('/blog');
  }, [row.id, navigate]);


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

        
        <TableCell>
          
            {row.id}
        
        </TableCell>


        <TableCell>
          
            {row.name}
        
        </TableCell>

        <TableCell>{row.location}</TableCell>
        <TableCell>{row.date}</TableCell>
        <TableCell>{row.createdAt}</TableCell>
        
        <TableCell>{row.description}</TableCell>
        <TableCell>
          <Label color={(row.status === 'banned' && 'error') || 'success'}>
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
          <MenuItem onClick={handleOpenEditDialo}>
            <Iconify icon="uil:briefcase" />
            Go to Guest
          </MenuItem>


          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <Iconify icon="solar:trash-bin-trash-bold" />
            Delete
          </MenuItem>

             <MenuItem onClick={handleGenerateTempLink} sx={{ color: 'success.main' }}>
                      <Iconify icon="mdi:link-variant-plus" />
                      Generate Link
                    </MenuItem>
        </MenuList>
      </Popover>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Edit Event</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Name"
            fullWidth
            variant="outlined"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Date"
            fullWidth
            variant="outlined"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Location"
            fullWidth
            variant="outlined"
            value={editLocation}
            onChange={(e) => setEditLocation(e.target.value)}
          />
           <TextField
            margin="dense"
            label="Description"
            fullWidth
            variant="outlined"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmitEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

          {/* Copy-Link Dialog */}
          <Dialog open={isLinkDialogOpen} onClose={handleCloseLinkDialog}>
        <DialogTitle>Temporary Link</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Link"
            fullWidth
            variant="outlined"
            value={tempLink || ''}
            InputProps={{ readOnly: true }}
            onFocus={(e) => e.currentTarget.select()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCopyLink}>Copy</Button>
          <Button onClick={handleCloseLinkDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
