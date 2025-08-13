import { getUserList, UserInfo } from '@/api';
import { Box, Checkbox, Stack } from '@mui/material';
import { Modal } from 'ct-mui';
import { useEffect, useState } from 'react';

interface AddRoleProps {
  open: boolean;
  onCancel: () => void;
  onOk: () => void;
}

const AddRole = ({ open, onCancel, onOk }: AddRoleProps) => {
  const [list, setList] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const getData = () => {
    setLoading(true);
    getUserList()
      .then(res => {
        setList(res);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (open) getData();
  }, [open]);

  return (
    <Modal title='添加成员' open={open} onCancel={onCancel} onOk={onOk}>
      <Stack gap={1}>
        {list.map(item => (
          <Stack direction={'row'} alignItems={'center'} gap={1}>
            <Checkbox size='small' />
            <Box sx={{ flex: 1 }}>{item.account}</Box>
          </Stack>
        ))}
      </Stack>
    </Modal>
  );
};

export default AddRole;
