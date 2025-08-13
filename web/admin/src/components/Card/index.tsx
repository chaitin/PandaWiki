import { Paper, SxProps } from '@mui/material';

interface CardProps {
  sx?: SxProps;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}
const Card = ({ sx, children, onClick, className }: CardProps) => {
  return (
    <Paper
      className={`paper-item ${className}`}
      sx={{
        borderRadius: '10px',
        boxShadow: 'none',
        border: 'none',
        overflow: 'hidden',
        ...sx,
      }}
      onClick={onClick ? onClick : undefined}
    >
      {children}
    </Paper>
  );
};

export default Card;
