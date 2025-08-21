import { Stack } from '@mui/material';
import { Dispatch, SetStateAction } from 'react';
import { Component } from '../../index';
import { DomainAppDetailResp } from '@/request/types';

interface ConfigBarProps {
  curComponent: string;
  components: Component[];
  setIsEdit: Dispatch<SetStateAction<boolean>>;
  data: DomainAppDetailResp | null | undefined;
  isEdit: boolean;
}
const ConfigBar = ({
  curComponent,
  components,
  setIsEdit,
  data,
  isEdit,
}: ConfigBarProps) => {
  const curConfig = components.find(c => c.name === curComponent);
  return (
    <Stack
      sx={{
        width: '400px',
        minWidth: '400px',
        bgcolor: '#FFFFFF',
        borderLeft: '1px solid #ECEEF1',
        paddingTop: '19px',
        paddingX: '20px',
        height: '100%',
        overflow: 'hidden',
        flexShrink: 0,
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
          <curConfig.component
            setIsEdit={setIsEdit}
            data={data}
            isEdit={isEdit}
          />
        </Stack>
      ) : null}
    </Stack>
  );
};

export default ConfigBar;
