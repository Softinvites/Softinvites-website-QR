import { useState, useEffect, useCallback } from 'react';
import { DashboardContent } from 'src/layouts/dashboard';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  tableCellClasses,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import axios from "axios";
import { API_BASE } from 'src/utils/apiBase';
import {  toast } from 'react-toastify';


interface Admin {
  _id: string;
  username: string;
  email: string;
  name: string;
}

// ----------------------------------------------------------------------

export function UserView() {
  const [profile, setProfile] = useState<Admin | null>(null);
    const [loading, setLoading] = useState(true);
  
    const fetchProfile = useCallback(async () => {
          const token = localStorage.getItem("token");
          if (!token) {
            toast.error("Authentication token not found.");
            return;
          }
      const adminID = localStorage.getItem("adminId");
       console.log("About to console.log 1")
        console.log(adminID)
      if (!adminID) return;
      try {
        const response = await axios.get(
          `${API_BASE}/admin/profile/${adminID}`, 
          {
            headers: {
              "Content-Type": "application/json", 
              Authorization: `Bearer ${token}`,
            },
          }
        );
        console.log("About to console.log 2")
        console.log(response.data.admin)
        setProfile(response.data.admin);

        setLoading(false);
      } catch (error) {
        console.error("Error fetching profile data:", error);
        setProfile(null);
        setLoading(false);
      }
    }, []);
  
    useEffect(() => {
      fetchProfile();
    }, [fetchProfile]);
  
    const StyledTableCell = styled(TableCell)(({ theme }) => ({
      [`&.${tableCellClasses.head}`]: {
        backgroundColor: "#040f65ff",
        color: theme.palette.common.white,
      },
      [`&.${tableCellClasses.body}`]: {
        fontSize: 14,
      },
    }));
  
    if (loading) {
      return (
        <DashboardContent title="Profile">
          <Box sx={{ padding: "2rem", textAlign: "center" }}>Loading...</Box>
        </DashboardContent>
      );
    }
  
    if (!profile) {
      return (
        <DashboardContent title="Profile">
          <Box sx={{ padding: "2rem", textAlign: "center" }}>
            Unable to load profile data.
          </Box>
        </DashboardContent>
      );
    }
  return (
      <DashboardContent>
          <Box sx={{ padding: "2rem" }}>
        <TableContainer
  component={Paper}
  sx={{
    maxWidth: 600,
    margin: "0 auto",
    borderRadius: 2,
    boxShadow: 3,
  }}
>
  <Table>
    <TableHead>
      <TableRow>
        <StyledTableCell sx={{ width: "40%" }}>Field</StyledTableCell>
        <StyledTableCell>Details</StyledTableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      <TableRow>
        <TableCell>Full Name</TableCell>
        <TableCell>{profile.name}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Username</TableCell>
        <TableCell>{profile.username}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Email</TableCell>
        <TableCell>{profile.email || "Not provided"}</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</TableContainer>

    
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "1rem",
              }}
            />
          </Box>
        </DashboardContent>
  );
}
