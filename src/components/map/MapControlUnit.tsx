import { type ReactNode } from 'react';
import { Box, IconButton, Paper, Typography, useTheme, Collapse } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export interface PanelUIDefinition {
  controlId: string;
  icon: ReactNode;
  panelTitle?: string;
  panelContent: ReactNode;
  ariaLabelOpen: string;
  ariaLabelCloseButton: string;
  panelMinWidth?: number | string;
}

interface MapControlUnitProps {
  definition: PanelUIDefinition;
  isActive: boolean;
  onRequestToggle: (controlId: string) => void;
}

export function MapControlUnit({ definition, isActive, onRequestToggle }: MapControlUnitProps) {
  const theme = useTheme();
  const { controlId, icon, ariaLabelOpen, ariaLabelCloseButton } = definition;

  const handleButtonClick = () => {
    onRequestToggle(controlId);
  };

  return (
    <IconButton
      onClick={handleButtonClick}
      aria-label={isActive ? ariaLabelCloseButton : ariaLabelOpen}
      aria-expanded={isActive}
      sx={{
        color: theme.palette.primary.main,
        backgroundColor: isActive ? theme.palette.action.active : theme.palette.background.paper,
        boxShadow: theme.shadows[3],
        transition: theme.transitions.create(['transform', 'box-shadow', 'background-color'], {
          duration: theme.transitions.duration.short,
          easing: theme.transitions.easing.easeInOut,
        }),
        transform: isActive ? 'scale(1.1)' : 'scale(1)',
        '&:hover': {
          transform: 'scale(1.1)',
          boxShadow: theme.shadows[6],
          backgroundColor: isActive ? theme.palette.action.hover : theme.palette.background.paper,
        },
      }}
    >
      {icon}
    </IconButton>
  );
}

export function RenderMapPanel({
  definition,
  isOpen,
  onCloseRequest,
}: {
  definition: PanelUIDefinition;
  isOpen: boolean;
  onCloseRequest: () => void;
}) {
  const {
    controlId,
    panelTitle,
    panelContent,
    panelMinWidth = 220,
    ariaLabelCloseButton,
  } = definition;
  const panelId = `${controlId}-panel`;
  const titleId = `${controlId}-title`;

  return (
    <Collapse in={isOpen} timeout="auto" unmountOnExit>
      <Paper
        elevation={4}
        sx={{
          p: 2,
          minWidth: panelMinWidth,
          width: panelMinWidth,
          boxSizing: 'border-box',
        }}
        id={panelId}
        role="region"
        aria-labelledby={panelTitle ? titleId : undefined}
      >
        {panelTitle && (
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle1" fontWeight="medium" id={titleId}>
              {panelTitle}
            </Typography>
            <IconButton
              onClick={onCloseRequest}
              size="small"
              aria-label={ariaLabelCloseButton}
              sx={{ ml: 1 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
        {panelContent}
      </Paper>
    </Collapse>
  );
}
