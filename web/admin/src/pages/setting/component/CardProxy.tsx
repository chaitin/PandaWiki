import { updateKnowledgeBase } from '@/api';
import { KnowledgeBaseListItem } from '@/api/type';
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
} from '@mui/material';
import { Message } from 'ct-mui';
import { useEffect, useState } from 'react';

const CardProxy = ({
  kb,
  refresh,
}: {
  kb: KnowledgeBaseListItem;
  refresh: () => void;
}) => {
  const [isEdit, setIsEdit] = useState(false);
  const [hasProxy, setHasProxy] = useState(
    !!kb.access_settings?.trusted_proxies?.length,
  );
  const [proxyIP, setProxyIP] = useState(
    kb.access_settings?.trusted_proxies?.[0] || '',
  );

  const handleSave = () => {
    try {
      updateKnowledgeBase({
        id: kb.id,
        access_settings: {
          ...kb.access_settings,
          trusted_proxies: hasProxy ? [proxyIP] : null,
        },
      }).then(() => {
        Message.success('保存成功');
        setIsEdit(false);
        refresh();
      });
    } catch (e) {
      Message.error('保存失败');
    }
  };

  useEffect(() => {
    setHasProxy(!!kb.access_settings?.trusted_proxies?.length);
    setProxyIP(kb.access_settings?.trusted_proxies?.[0] || '');
  }, [kb]);

  return (
    <>
      <Stack
        direction='row'
        alignItems={'center'}
        justifyContent={'space-between'}
        sx={{
          m: 2,
          height: 32,
          fontWeight: 'bold',
        }}
      >
        <Box
          sx={{
            '&::before': {
              content: '""',
              display: 'inline-block',
              fontWeight: 'bold',
              width: 4,
              height: 12,
              bgcolor: 'common.black',
              borderRadius: '2px',
              mr: 1,
            },
          }}
        >
          前置反向代理
        </Box>
        <Box
          sx={{
            flexGrow: 1,
            fontSize: 12,
            color: 'text.auxiliary',
            ml: 1,
            fontWeight: 'normal',
          }}
        >
          用于修正源 IP 获取错误的问题
        </Box>
        {isEdit && (
          <Button variant='contained' size='small' onClick={handleSave}>
            保存
          </Button>
        )}
      </Stack>
      <Stack gap={2} sx={{ mx: 2 }}>
        <Stack direction={'row'} gap={2} alignItems={'center'}>
          <Box sx={{ width: 156, fontSize: 14, lineHeight: '32px' }}>
            前置反向代理
          </Box>
          <FormControl>
            <RadioGroup
              value={hasProxy}
              onChange={e => {
                setHasProxy(e.target.value === 'true');
                if (proxyIP === '') {
                  setProxyIP('0.0.0.0/0');
                }
                setIsEdit(true);
              }}
            >
              <Stack direction={'row'}>
                <FormControlLabel
                  value={false}
                  control={<Radio size='small' />}
                  label='无前置反向代理'
                />
                <FormControlLabel
                  value={true}
                  control={<Radio size='small' />}
                  label='有前置反向代理'
                />
              </Stack>
            </RadioGroup>
          </FormControl>
        </Stack>
        {hasProxy && (
          <Stack direction={'row'} gap={2} alignItems={'center'}>
            <Box
              sx={{
                width: 156,
                fontSize: 14,
                lineHeight: '32px',
                flexShrink: 0,
              }}
            >
              可信代理 IP
            </Box>
            <TextField
              fullWidth
              label='可信代理 IP'
              value={proxyIP}
              onChange={e => {
                setProxyIP(e.target.value);
                setIsEdit(true);
              }}
            />
          </Stack>
        )}
      </Stack>
    </>
  );
};

export default CardProxy;
