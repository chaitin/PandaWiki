import { Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { Icon, Modal } from 'ct-mui';
import { Dispatch, SetStateAction } from 'react';
import { Component } from '../index';

interface ConfigBarProps {
  curComponent: string;
  components: Component[];
  setIsEdit: Dispatch<SetStateAction<boolean>>;
}
const ConfigBar = ({ curComponent, components, setIsEdit }: ConfigBarProps) => {
  const curConfig = components.find((c) => c.name === curComponent);
  return (
    <Stack
      sx={{
        width: '324px',
        minWidth: '320px',
        flexShrink: 0,
        bgcolor: '#FFFFFF',
        borderLeft: '1px solid #ECEEF1',
        paddingTop: '19px',
        paddingX: '20px',
        height: '100%',
        overflow: 'hidden',
      }}
      direction={'column'}
    >
      {curConfig ? (
        <Stack
          sx={{
            flex: 1,
            overflowY: 'auto',
            minHeight: 0,
            pb: 4,
          }}
        >
          <curConfig.component {...curConfig.props} setIsEdit={setIsEdit} />
        </Stack>
      ) : null}
    </Stack>
  );
};

export default ConfigBar;
