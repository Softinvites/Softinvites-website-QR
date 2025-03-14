import * as React from 'react';
import { useState } from 'react';
import { styled } from '@mui/material/styles';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import NativeSelect from '@mui/material/NativeSelect';
import InputBase from '@mui/material/InputBase';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

interface EventModalProps {
  open: boolean;
  handleClose: () => void;
  title?: string;
  children?: React.ReactNode;
}

// Custom styled input component
const BootstrapInput = styled(InputBase)(({ theme }) => ({
  'label + &': {
    marginTop: theme.spacing(3),
  },
  '& .MuiInputBase-input': {
    borderRadius: 4,
    position: 'relative',
    backgroundColor: theme.palette.background.paper,
    border: '1px solid #ced4da',
    fontSize: 16,
    padding: '10px 26px 10px 12px',
    transition: theme.transitions.create(['border-color', 'box-shadow']),
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
    '&:focus': {
      borderRadius: 4,
      borderColor: '#80bdff',
      boxShadow: '0 0 0 0.2rem rgba(0,123,255,.25)',
    },
  },
}));

// Demo component to showcase the use of BootstrapInput with MUI Select and NativeSelect
const DemoSelect: React.FC = () => {
  const [age, setAge] = useState<string>('');
  const handleChange = (event: SelectChangeEvent<string>) => {
    setAge(event.target.value);
  };

  return (
    <div>
      <FormControl sx={{ m: 1 }}>
        <BootstrapInput id="demo-customized-textbox" />
      </FormControl>
      <FormControl sx={{ m: 1 }} variant="standard">
        <InputLabel id="demo-customized-select-label">Age</InputLabel>
        <Select
          labelId="demo-customized-select-label"
          id="demo-customized-select"
          value={age}
          onChange={handleChange}
          input={<BootstrapInput />}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          <MenuItem value="10">Ten</MenuItem>
          <MenuItem value="20">Twenty</MenuItem>
          <MenuItem value="30">Thirty</MenuItem>
        </Select>
      </FormControl>
      <FormControl sx={{ m: 1 }} variant="standard">
        <InputLabel htmlFor="demo-customized-select-native">Age</InputLabel>
        <NativeSelect
          id="demo-customized-select-native"
          value={age}
          input={<BootstrapInput />}
        >
          <option aria-label="None" value="" />
          <option value="10">Ten</option>
          <option value="20">Twenty</option>
          <option value="30">Thirty</option>
        </NativeSelect>
      </FormControl>
    </div>
  );
};

// Event modal component that accepts children (for example, you can pass DemoSelect as children)
const EventModal: React.FC<EventModalProps> = ({
  open,
  handleClose,
  title = "Create New Event",
  children,
}) => (
  <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      {children || (
        <DialogContentText>
          Fill in the details to create a new event.
        </DialogContentText>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={handleClose} color="error">
        Cancel
      </Button>
      <Button variant="contained" color="primary">
        Create
      </Button>
    </DialogActions>
  </Dialog>
);

export default EventModal;
export { DemoSelect };
