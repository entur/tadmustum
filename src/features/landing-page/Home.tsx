import { Container, Box, Typography, Button, Stack, Avatar } from '@mui/material';
import { Add, FormatListBulleted } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import CarpoolIcon from './CarpoolIcon';

export default function Home() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          my: { xs: 6, md: 10 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 3,
        }}
      >
        <Avatar sx={{ bgcolor: 'primary.main', width: 88, height: 88 }}>
          <CarpoolIcon sx={{ fontSize: 60 }} />
        </Avatar>

        <Typography variant="h3" component="h1" fontWeight={700}>
          Welcome to Entur's carpooling test client
        </Typography>

        <Typography
          variant="h6"
          component="p"
          color="text.secondary"
          sx={{ maxWidth: 620, fontWeight: 400 }}
        >
          A frontend app for creating carpooling SIRI messages and making the resulting trips
          available in a journey planner.
        </Typography>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mt: 2, width: { xs: '100%', sm: 'auto' }, maxWidth: { xs: 360, sm: 'none' } }}
        >
          <Button
            variant="contained"
            size="large"
            startIcon={<Add />}
            onClick={() => navigate('/plan-trip')}
          >
            Plan trip
          </Button>
          <Button
            variant="contained"
            size="large"
            startIcon={<FormatListBulleted />}
            onClick={() => navigate('/trips')}
          >
            Planned trips
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}
