import { Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { Icon, Modal } from 'ct-mui';
import { Dispatch, SetStateAction } from 'react';
import { Component } from '../index';
interface ComponentBarProps {
  components: Component[];
  setComponents: Dispatch<SetStateAction<Component[]>>;
  curComponent: string;
  setCurComponent: Dispatch<SetStateAction<string>>;
}
const ComponentBar = ({
  components,
  setComponents,
  curComponent,
  setCurComponent,
}: ComponentBarProps) => {
  return (
    <Stack
      sx={{
        width: '320px',
        flexShrink: 0,
        bgcolor: '#FFFFFF',
        borderRight: '1px solid #ECEEF1',
        height: '100%',
        overflow: 'hidden',
      }}
      direction={'column'}
    >
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
        {components.map((item) => {
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
                  ? '1px solid #3B82FF'
                  : '1px solid transparent',
              }}
              key={item.name}
              onClick={() => {
                setCurComponent(item.name);
              }}
            >
              <Typography
                sx={{
                  fontSize: '14px',
                  color: isActive ? '#3B82FF' : '#344054',
                  fontWeight: 500,
                }}
              >
                {item.name}
              </Typography>
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
};

export default ComponentBar;
