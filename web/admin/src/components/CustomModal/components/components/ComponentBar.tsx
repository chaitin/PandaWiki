import { MenuItem, Select, Stack, Typography } from '@mui/material';
import { Icon } from '@ctzhian/ui';
import { Dispatch, SetStateAction } from 'react';
import { Component } from '../../index';
import { useAppDispatch, useAppSelector } from '@/store';
import { setAppPreviewData } from '@/store/slices/config';
interface ComponentBarProps {
  components: Component[];
  setComponents: Dispatch<SetStateAction<Component[]>>;
  curComponent: string;
  setCurComponent: Dispatch<SetStateAction<string>>;
  setIsEdit: Dispatch<SetStateAction<boolean>>;
}
const ComponentBar = ({
  components,
  setComponents,
  curComponent,
  setCurComponent,
  setIsEdit,
}: ComponentBarProps) => {
  const dispatch = useAppDispatch();
  const appPreviewData = useAppSelector(state => state.config.appPreviewData);
  return (
    <Stack
      sx={{
        width: '20px',
        minWidth: '200px',
        bgcolor: '#FFFFFF',
        borderRight: '1px solid #ECEEF1',
        height: '100%',
        overflow: 'hidden',
        flexShrink: 0,
      }}
      direction={'column'}
    >
      {appPreviewData && (
        <>
          <Stack
            direction={'row'}
            sx={{
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingX: '20px',
              paddingTop: '19px',
            }}
          >
            <Typography
              sx={{
                fontSize: '16px',
                lineHeight: '30px',
                fontWeight: 600,
              }}
            >
              配色方案
            </Typography>
          </Stack>
          <Stack sx={{ paddingX: '20px', marginTop: '15px' }}>
            <Select
              value={appPreviewData.settings?.theme_mode}
              sx={{
                width: '100%',
                height: '40px',
                bgcolor: '#F2F8FF',
                border: '1px solid #5F58FE',
                color: '#5F58FE',
                '&:focus': {
                  border: '1px solid #5F58FE',
                },
                '&:hover': {
                  border: '1px solid #5F58FE',
                },
                '&.Mui-focused': {
                  border: '1px solid #5F58FE',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  border: 'none',
                },
              }}
              onChange={e => {
                if (!appPreviewData) return;
                const newInfo = {
                  ...appPreviewData,
                  settings: {
                    ...appPreviewData.settings,
                    theme_mode: e.target.value,
                  },
                };
                setIsEdit(true);
                dispatch(setAppPreviewData(newInfo));
              }}
            >
              <MenuItem value='light'>浅色模式</MenuItem>
              <MenuItem value='dark'>深色模式</MenuItem>
            </Select>
          </Stack>
        </>
      )}

      <Stack
        direction={'row'}
        sx={{
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingX: '20px',
          paddingTop: '19px',
        }}
      >
        <Typography
          sx={{
            fontSize: '16px',
            lineHeight: '30px',
            fontWeight: 600,
          }}
        >
          组件
        </Typography>
      </Stack>
      <Stack
        direction={'column'}
        sx={{
          marginTop: '15px',
          overflowY: 'auto',
          flex: 1,
          minHeight: 0,
          paddingX: '20px',
          paddingBottom: '20px',
        }}
      >
        {components.map(item => {
          const isActive = item.name === curComponent;
          return (
            <Stack
              direction={'row'}
              sx={{
                height: '40px',
                borderRadius: '6px',
                bgcolor: isActive ? '#F2F8FF' : '',
                pl: '12px',
                alignItems: 'center',
                cursor: 'pointer',
                mb: '10px',
                border: isActive
                  ? '1px solid #5F58FE'
                  : '1px solid transparent',
              }}
              key={item.name}
              onClick={() => {
                setCurComponent(item.name);
              }}
            >
              <Icon
                type='icon-wangyeguajian'
                sx={{
                  color: isActive ? '#5F58FE' : '#21222D',
                  fontSize: '14px',
                }}
              ></Icon>
              <Typography
                sx={{
                  marginLeft: '8px',
                  fontSize: '14px',
                  color: isActive ? '#5F58FE' : '#344054',
                  fontWeight: 500,
                }}
              >
                {item.title}
              </Typography>
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
};

export default ComponentBar;
