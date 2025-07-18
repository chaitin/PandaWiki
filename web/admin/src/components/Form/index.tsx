import { styled, FormLabel, Box } from '@mui/material';

export const StyledFormLabel = styled(FormLabel)(({ theme }) => ({
  display: 'block',
  color: theme.palette.text.primary,
  fontSize: 14,
  fontWeight: 400,
  marginBottom: theme.spacing(1),
  [theme.breakpoints.down('sm')]: {
    fontSize: 14,
  },
}));

export const FormItem = ({
  label,
  children,
  required,
}: {
  label: string | React.ReactNode;
  children: React.ReactNode;
  required?: boolean;
}) => {
  return (
    <Box>
      <StyledFormLabel required={required}>{label}</StyledFormLabel>
      {children}
    </Box>
  );
};
