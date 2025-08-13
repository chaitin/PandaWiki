import { Switch } from '@mui/material';
import { styled } from '@mui/material/styles';

const CustomSwitch = styled(Switch)(({ checked }) => {
  return {
    padding: 8,
    width: 70,
    '& .MuiSwitch-track': {
      borderRadius: 22 / 2,
      '&::before, &::after': {
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: 12,
        width: 40,
        height: 16,
      },
      '&::before': {
        content: checked ? '"启用"' : '""',
        color: '#fff',
        left: 15,
      },
      '&::after': {
        content: checked ? '""' : '"禁用"',
        color: '#fff',
        right: 0,
      },
    },
    '& .Mui-checked': {
      transform: 'translateX(32px) !important',
    },
    '& .MuiSwitch-thumb': {
      boxShadow: 'none',
      width: 16,
      height: 16,
      margin: 2,
    },
  };
});

export default CustomSwitch;
