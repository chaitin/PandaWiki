import { SwitchProps, Box } from '@mui/material';
import { Icon } from 'ct-mui';
import MySwitch from './Switch';

const ThemeSwitch = (props: SwitchProps) => {
  return (
    <MySwitch
      {...props}
      icon={
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              width: 22,
              height: 22,
              bgcolor: '#fff',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon
              type='icon-mingliangmoshi'
              sx={{ color: '#000', fontSize: 16 }}
            />
          </Box>
        </Box>
      }
      checkedIcon={
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              width: 22,
              height: 22,
              bgcolor: '#fff',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon
              type='icon-shensemoshi'
              sx={{ color: '#000', fontSize: 16 }}
            />
          </Box>
        </Box>
      }
    />
  );
};

export default ThemeSwitch;
