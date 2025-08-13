import { KnowledgeBaseListItem, updateKnowledgeBase } from '@/api';
import { validateUrl } from '@/utils';
import { Box, Button, Stack, TextField } from '@mui/material';
import { Message } from 'ct-mui';
import { useEffect, useState } from 'react';

const CardBasicInfo = ({
  kb,
  refresh,
}: {
  kb: KnowledgeBaseListItem;
  refresh: () => void;
}) => {
  const [url, setUrl] = useState<string>('');
  const [isEdit, setIsEdit] = useState<boolean>(false);

  const handleSave = () => {
    try {
      if (!validateUrl(url) && url.trim() !== '') {
        throw new Error('请输入正确的网址');
      }

      updateKnowledgeBase({
        id: kb.id,
        access_settings: { ...kb.access_settings, base_url: url },
      }).then(() => {
        Message.success('保存成功');
        setIsEdit(false);
        refresh();
      });
    } catch (e) {
      Message.error('请输入正确的网址');
    }
  };

  useEffect(() => {
    if (kb.access_settings.base_url) {
      setUrl(kb.access_settings.base_url);
      return;
    }
  }, [kb]);

  const baseUrlPlaceholder = () => {
    const host = kb.access_settings?.hosts?.[0] || '';
    if (!host) {
      return;
    }

    if (
      kb.access_settings.ssl_ports &&
      kb.access_settings.ssl_ports.length > 0
    ) {
      return kb.access_settings.ssl_ports.includes(443)
        ? `https://${host}`
        : `https://${host}:${kb.access_settings.ssl_ports[0]}`;
    } else if (
      kb.access_settings.ports &&
      kb.access_settings.ports.length > 0
    ) {
      return kb.access_settings.ports.includes(80)
        ? `http://${host}`
        : `http://${host}:${kb.access_settings.ports[0]}`;
    } else {
      return '';
    }
  };

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
              width: 4,
              height: 12,
              bgcolor: 'common.black',
              borderRadius: '2px',
              mr: 1,
            },
          }}
        >
          网站基本信息
        </Box>
        {isEdit && (
          <Button variant='contained' size='small' onClick={handleSave}>
            保存
          </Button>
        )}
      </Stack>
      <Stack
        direction={'row'}
        gap={2}
        alignItems={'center'}
        sx={{ fontSize: 14, lineHeight: '32px', my: 1, mx: 2 }}
      >
        <Box
          component={'label'}
          sx={{ width: 156, flexShrink: 0, fontSize: 14, lineHeight: '32px' }}
        >
          网址绝对路径前缀
        </Box>

        <TextField
          fullWidth
          label='网址绝对路径前缀'
          value={url}
          onChange={e => {
            setUrl(e.target.value);
            setIsEdit(true);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              handleSave();
            }
          }}
          placeholder={baseUrlPlaceholder()}
        />
      </Stack>
    </>
  );
};

export default CardBasicInfo;
