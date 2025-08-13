import Logo from '@/assets/images/logo.png';
import { Avatar as MuiAvatar, SxProps } from '@mui/material';
import { Icon } from 'ct-mui';
import { ReactNode } from 'react';

interface AvatarProps {
  src?: string;
  className?: string;
  sx?: SxProps;
  errorIcon?: ReactNode;
  errorImg?: ReactNode;
}

const Avatar = (props: AvatarProps) => {
  const src = props.src;

  const LogoIcon = (
    <Icon
      sx={{ width: '100%', height: '100%', color: 'text.primary' }}
      type='icon-dandulogo'
    />
  );

  const errorNode = props.errorIcon || props.errorImg || LogoIcon;

  if (props.errorIcon || props.errorImg) {
    return (
      <MuiAvatar
        sx={{
          img: { objectFit: 'contain' },
          bgcolor: 'transparent',
          ...props.sx,
        }}
        src={src}
        variant='square'
      >
        {errorNode}
      </MuiAvatar>
    );
  }

  return (
    <MuiAvatar
      sx={{
        img: { objectFit: 'contain' },
        bgcolor: 'transparent',
        ...props.sx,
      }}
      src={src || Logo}
      variant='square'
    >
      {errorNode}
    </MuiAvatar>
  );
};

export default Avatar;
