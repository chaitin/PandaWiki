import { putApiV1KnowledgeBaseDetail } from '@/request/KnowledgeBase';
import { DomainKnowledgeBaseDetail } from '@/request/types';
import { FormItem, SettingCardItem } from './Common';
import { validateUrl } from '@/utils';
import { TextField } from '@mui/material';
import { message } from '@ctzhian/ui';
import { useEffect, useState } from 'react';

const CardBasicInfo = ({
  kb,
  refresh,
}: {
  kb: DomainKnowledgeBaseDetail;
  refresh: () => void;
}) => {
  const [url, setUrl] = useState<string>('');
  const [isEdit, setIsEdit] = useState<boolean>(false);

  const handleSave = () => {
    try {
      if (!validateUrl(url) && url.trim() !== '') {
        throw new Error('请输入正确的网址');
      }

      putApiV1KnowledgeBaseDetail({
        id: kb.id!,
        access_settings: { ...kb.access_settings, base_url: url },
      }).then(() => {
        message.success('保存成功');
        setIsEdit(false);
        refresh();
      });
    } catch (e) {
      message.error('请输入正确的网址');
    }
  };

  useEffect(() => {
    setUrl(kb?.access_settings?.base_url || '');
    setIsEdit(false);
  }, [kb]);

  const baseUrlPlaceholder = () => {
    const host = kb.access_settings?.hosts?.[0] || '';
    if (!host) {
      return '';
    }

    if (kb.access_settings?.ports && kb.access_settings.ports.length > 0) {
      return kb.access_settings.ports.includes(80)
        ? `http://${host}`
        : `http://${host}:${kb.access_settings.ports[0]}`;
    }
    return '';
  };

  return (
    <SettingCardItem title='网站基本信息' isEdit={isEdit} onSubmit={handleSave}>
      <FormItem label='网址绝对路径前缀'>
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
      </FormItem>
    </SettingCardItem>
  );
};

export default CardBasicInfo;
