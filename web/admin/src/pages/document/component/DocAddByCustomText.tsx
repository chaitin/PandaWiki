import Emoji from '@/components/Emoji';
import { DomainCreateNodeReq, V1NodeDetailResp } from '@/request';
import { postApiV1Node, putApiV1NodeDetail } from '@/request/Node';
import { useAppSelector } from '@/store';
import { message, Modal } from '@ctzhian/ui';
import {
  Box,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
} from '@mui/material';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

type FormValues = { name: string; emoji: string; content_type: string };

interface DocAddByCustomTextProps {
  open: boolean;
  data?: V1NodeDetailResp;
  autoJump?: boolean;
  onClose: () => void;
  parentId?: string;
  setDetail?: (data: V1NodeDetailResp) => void;
  refresh?: () => void;
  type?: 1 | 2;
  onCreated?: (node: {
    id: string;
    name: string;
    type: 1 | 2;
    content_type?: string;
    emoji?: string;
  }) => void;
}

const DocAddByCustomText = ({
  open,
  data,
  autoJump = true,
  parentId,
  onClose,
  refresh,
  setDetail,
  type = 2,
  onCreated,
}: DocAddByCustomTextProps) => {
  const { kb_id: id, nav_id } = useAppSelector(state => state.config);
  const text = type === 1 ? '文件夹' : '文档';

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: '',
      emoji: '',
      content_type: '',
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = (value: FormValues) => {
    if (data) {
      putApiV1NodeDetail({
        id: data.id || '',
        kb_id: id,
        nav_id: data.nav_id || nav_id || '',
        name: value.name,
        emoji: value.emoji,
      }).then(() => {
        message.success('修改成功');
        reset();
        handleClose();
        refresh?.();
        setDetail?.({
          name: value.name,
          meta: { ...data.meta, emoji: value.emoji },
          status: 1,
        });
      });
    } else {
      if (!id) return;
      const params: DomainCreateNodeReq = {
        name: value.name,
        content: '',
        kb_id: id,
        nav_id: nav_id || '',
        type,
        emoji: value.emoji,
        content_type: value.content_type,
      };
      if (parentId) {
        params.parent_id = parentId;
      }
      postApiV1Node(params).then(({ id }) => {
        message.success('创建成功');
        reset();
        handleClose();
        // 回传创建结果给上层，由上层本地追加并滚动
        onCreated?.({
          id,
          name: value.name,
          type,
          content_type: value.content_type,
          emoji: value.emoji,
        });
        refresh?.();
        if (type === 2 && autoJump) {
          window.open(`/doc/editor/${id}`, '_blank');
        }
      });
    }
  };

  useEffect(() => {
    if (!open) return;
    if (data) {
      reset({
        name: data.name || '',
        emoji: data.meta?.emoji || '',
        content_type: type === 1 ? '' : data.meta?.content_type || 'html',
      });
    } else {
      setValue('content_type', type === 1 ? '' : 'html');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, type, open]);

  return (
    <Modal
      title={data ? `编辑${text}` : `创建${text}`}
      open={open}
      width={600}
      okText={data ? '保存' : '创建'}
      onCancel={handleClose}
      onOk={handleSubmit(submit)}
    >
      <Box sx={{ fontSize: 14, lineHeight: '36px' }}>{text}名称</Box>
      <Controller
        control={control}
        name='name'
        rules={{ required: `请输入${text}名称` }}
        render={({ field }) => (
          <TextField
            {...field}
            fullWidth
            autoFocus
            size='small'
            placeholder={`请输入${text}名称`}
            error={!!errors.name}
            helperText={errors.name?.message}
          />
        )}
      />
      <Box sx={{ fontSize: 14, lineHeight: '36px', mt: 1 }}>{text}图标</Box>
      <Controller
        control={control}
        name='emoji'
        render={({ field }) => <Emoji {...field} type={type} />}
      />
      {type === 2 && !data && (
        <>
          <Box sx={{ fontSize: 14, lineHeight: '36px', mt: 1 }}>文档类型</Box>
          <Controller
            control={control}
            name='content_type'
            render={({ field }) => (
              <RadioGroup {...field} row>
                <FormControlLabel
                  value='html'
                  control={<Radio size='small' />}
                  label='富文本'
                />
                <FormControlLabel
                  value='md'
                  control={<Radio size='small' />}
                  label='Markdown'
                />
              </RadioGroup>
            )}
          />
        </>
      )}
    </Modal>
  );
};

export default DocAddByCustomText;
