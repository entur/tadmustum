import React, { useState } from "react";
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  IconButton,
} from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import Typography from "@mui/material/Typography";

export interface WorkAreaContentProps {
  onSave?: (data: { name: string; type: string; include: boolean }) => void;
  onCancel?: () => void;
  onDetailsOpen?: () => void;
}

const WorkAreaContent: React.FC<WorkAreaContentProps> = () => {
  const [name, setName] = useState<string>("");
  const [type, setType] = useState<string>("train");
  const [include, setInclude] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  const handleSave = () => {
    // TODO: implement save logic or call onSave prop
    console.log({ name, type, include });
  };

  const handleCancel = () => {
    // TODO: implement cancel logic or call onCancel prop
    setName("");
    setType("train");
    setInclude(false);
  };

  const handleDetailsOpen = () => {
    setDialogOpen(true);
    // TODO: call onDetailsOpen prop if provided
  };

  const handleDetailsClose = () => {
    setDialogOpen(false);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2 }}>
      <Typography variant="h5" component="h1">
        Work Area
      </Typography>

      <TextField
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
      />

      <FormControl fullWidth>
        <InputLabel id="type-label">Type</InputLabel>
        <Select
          labelId="type-label"
          label="Type"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <MenuItem value="train">Train</MenuItem>
          <MenuItem value="bus">Bus</MenuItem>
          <MenuItem value="ferry">Ferry</MenuItem>
          <MenuItem value="tram">Tram</MenuItem>
        </Select>
      </FormControl>

      <FormControlLabel
        control={
          <Checkbox
            checked={include}
            onChange={(e) => setInclude(e.target.checked)}
          />
        }
        label="Include"
      />

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button variant="contained" onClick={handleSave}>
          Save
        </Button>
        <Button variant="outlined" onClick={handleCancel}>
          Cancel
        </Button>
        <Button variant="text" onClick={handleDetailsOpen}>
          Details
        </Button>
        <Tooltip title="More info">
          <IconButton>
            <InfoOutlined />
          </IconButton>
        </Tooltip>
      </Box>

      <Dialog open={dialogOpen} onClose={handleDetailsClose} fullWidth>
        <DialogTitle>Details</DialogTitle>
        <DialogContent>{/* TODO: add details content here */}</DialogContent>
        <DialogActions>
          <Button onClick={handleDetailsClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkAreaContent;
