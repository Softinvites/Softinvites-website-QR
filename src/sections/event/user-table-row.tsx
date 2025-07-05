import { useState, useCallback, useEffect } from 'react';
import {
  Popover,
  TableRow,
  Checkbox,
  MenuList,
  TableCell,
  Typography,
  IconButton,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';
import { menuItemClasses } from '@mui/material/MenuItem';
import { toast } from 'react-toastify';
import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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
  iv: string;
};

type UserTableRowProps = {
  row: UserProps;
  selected: boolean;
  onSelectRow: () => void;
};

export function UserTableRow({ row, selected, onSelectRow }: UserTableRowProps) {
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  const [openPopover, setOpenPopover] = useState<HTMLButtonElement | null>(null);
  const [tempLink, setTempLink] = useState<string | null>(null);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);

  const [editName, setEditName] = useState(row.name);
  const [editDate, setEditDate] = useState(row.date);
  const [editLocation, setEditLocation] = useState(row.location);
  const [editDescription, setEditDescription] = useState(row.description);
  const [editIv, setEditIv] = useState(row.iv);

  useEffect(() => {
    const storedIds = JSON.parse(localStorage.getItem('allRowIds') || '[]');
    if (!storedIds.includes(row.id)) {
      storedIds.push(row.id);
      localStorage.setItem('allRowIds', JSON.stringify(storedIds));
    }
  }, [row.id]);

  const handleOpenPopover = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setOpenPopover(event.currentTarget);
  }, []);

  const handleClosePopover = useCallback(() => {
    setOpenPopover(null);
  }, []);

  const handleOpenEditDialog = useCallback(() => {
    setOpenDialog(true);
    handleClosePopover();
  }, [handleClosePopover]);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
  }, []);

  const handleSubmitEdit = useCallback(async () => {
    try {
      const response = await fetch(`https://software-invite-api-self.vercel.app/events/update/${row.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          date: editDate,
          location: editLocation,
          description: editDescription,
          iv: editIv,
        }),
      });

      if (!response.ok) throw new Error(`Failed to update event: ${response.statusText}`);

      toast.success('Edited successfully!', {
        position: 'top-right',
        autoClose: 3000,
        onClose: () => window.location.reload(),
      });
    } catch (error) {
      toast.error('Failed to edit event. Please try again.', {
        position: 'top-right',
        autoClose: 3000,
      });
    } finally {
      handleCloseDialog();
    }
  }, [row.id, token, editName, editDate, editLocation, editDescription, editIv, handleCloseDialog]);

  const handleGenerateTempLink = useCallback(async () => {
    try {
      const { data } = await axios.post<{ tempLink: string }>(
        `https://software-invite-api-self.vercel.app/guest/generate-temp-link/${row.id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
    navigator.clipboard.writeText(tempLink).then(() => {
      toast.success('Copied to clipboard!', { position: 'top-right', autoClose: 1500 });
    });
  };

  const handleCloseLinkDialog = () => {
    setIsLinkDialogOpen(false);
  };

  const handleDelete = useCallback(() => {
    setOpenConfirmDialog(true);
    handleClosePopover();
  }, [handleClosePopover]);

  const confirmDelete = useCallback(async () => {
    try {
      const response = await fetch(
        `https://software-invite-api-self.vercel.app/events/events/${row.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to delete event');

      localStorage.removeItem('allRowIds');
      toast.success('Deleted successfully!', { position: 'top-right', autoClose: 2000 });
      window.location.reload();
    } catch (error) {
      toast.error('Failed to delete event', { position: 'top-right', autoClose: 3000 });
    } finally {
      setOpenConfirmDialog(false);
    }
  }, [row.id, token]);

  const handleGoToGuest = useCallback(() => {
    localStorage.setItem('allRowIds', JSON.stringify([row.id]));
    navigate('/guest');
  }, [row.id, navigate]);

  return (
    <>
      <TableRow hover tabIndex={-1} role="checkbox" selected={selected}>
        <TableCell padding="checkbox">
          <Checkbox disableRipple checked={selected} onChange={onSelectRow} />
        </TableCell>
        <TableCell>{row.id}</TableCell>
        <TableCell>{row.name}</TableCell>
        <TableCell>{row.location}</TableCell>
        <TableCell>{row.date}</TableCell>
        <TableCell>{row.createdAt}</TableCell>
        <TableCell sx={{ whiteSpace: 'pre-line' }}>{row.description}</TableCell>
        <TableCell>
          <Label color={(row.status === 'banned' && 'error') || 'success'}>{row.status}</Label>
        </TableCell>
        <TableCell align="right">
          <IconButton onClick={handleOpenPopover}>
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
        </TableCell>
      </TableRow>

      <Popover open={!!openPopover} anchorEl={openPopover} onClose={handleClosePopover}>
        <MenuList sx={{ p: 1 }}>
          <MenuItem onClick={handleOpenEditDialog}>Edit</MenuItem>
          <MenuItem onClick={handleGoToGuest}>Go to Guest</MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>Delete</MenuItem>
          <MenuItem onClick={handleGenerateTempLink} sx={{ color: 'success.main' }}>Generate Link</MenuItem>
        </MenuList>
      </Popover>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Edit Event</DialogTitle>
        <DialogContent>
          <TextField margin="dense" label="Name" fullWidth value={editName} onChange={(e) => setEditName(e.target.value)} />
          <TextField margin="dense" label="Date" fullWidth value={editDate} onChange={(e) => setEditDate(e.target.value)} />
          <TextField margin="dense" label="Location" fullWidth value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
          <TextField margin="dense" label="Description" fullWidth multiline value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
          <Typography variant="subtitle1" sx={{ mt: 2 }}>Replace IV Image (PNG):</Typography>
          <input
            accept="image/png"
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onloadend = () => setEditIv(reader.result as string);
              reader.readAsDataURL(file);
            }}
            style={{ marginTop: 8, marginBottom: 12 }}
          />
          {editIv && <img src={editIv} alt="IV Preview" style={{ width: '100%', borderRadius: 8 }} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmitEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isLinkDialogOpen} onClose={handleCloseLinkDialog}>
        <DialogTitle>Temporary Link</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
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

      <Dialog open={openConfirmDialog} onClose={() => setOpenConfirmDialog(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>Are you sure you want to delete <strong>{row.name}</strong>? This action cannot be undone.</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmDialog(false)} color="inherit">Cancel</Button>
          <Button onClick={confirmDelete} variant="contained" color="error">Yes, Delete</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
