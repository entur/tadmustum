import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

interface UserDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function UserDialog({ open, onClose }: UserDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>User Account</DialogTitle>
      <DialogContent dividers>
        {/* Add user info or profile settings here */}
        <Typography variant="body1">User details go here.</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button onClick={onClose} variant="contained">
          Edit
        </Button>
      </DialogActions>
    </Dialog>
  );
}
