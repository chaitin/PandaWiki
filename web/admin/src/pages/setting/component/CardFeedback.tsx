import {
  AppDetail,
  getAppDetail,
  KnowledgeBaseListItem,
  updateAppDetail,
} from '@/api';
import { useAppSelector } from '@/store';
import InfoIcon from '@mui/icons-material/Info';
import { DomainKnowledgeBaseDetail } from '@/request/types';
import Card from '@/components/Card';
import {
  Box,
  Button,
  FormControlLabel,
  Radio,
  RadioGroup,
  Slider,
  Stack,
  TextField,
  Divider,
  styled,
  Tooltip,
} from '@mui/material';

import { Controller, useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import { Message } from 'ct-mui';
import { FormItem, SettingCard, SettingCardItem } from './Common';

interface CardCommentProps {
  kb: DomainKnowledgeBaseDetail;
}

// 样式封装
const StyledCardTitle = styled(Box)(({ theme }) => ({
  fontWeight: 'bold',
  padding: `${theme.spacing(1.5)} ${theme.spacing(2)}`,
  backgroundColor: theme.palette.background.paper2,
}));

const StyledRow = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(2),
}));

const StyledLabel = styled(Box)(({ theme }) => ({
  width: 156,
  fontSize: 14,
  lineHeight: '32px',
}));

const StyledRadioLabel = styled(Box)(({ theme }) => ({
  width: 100,
}));

const StyledHeader = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  margin: theme.spacing(2),
  height: 32,
  fontWeight: 'bold',
}));

const StyledHeaderTitle = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  fontWeight: 'bold',
  height: 32,
  '&::before': {
    content: '""',
    display: 'inline-block',
    width: 4,
    height: 12,
    backgroundColor: theme.palette.common.black,
    borderRadius: '2px',
    marginRight: theme.spacing(1),
  },
}));

const StyledContentStack = styled(Stack)(({ theme }) => ({
  padding: '0 16px 16px 16px',
  gap: theme.spacing(1),
}));

const DocumentComments = ({
  data,
  refresh,
}: {
  data: AppDetail;
  refresh: () => void;
}) => {
  const { license } = useAppSelector(state => state.config);
  const [isEdit, setIsEdit] = useState(false);
  const { control, handleSubmit, setValue } = useForm({
    defaultValues: {
      is_open: 0,
      moderation_enable: 0,
    },
  });

  useEffect(() => {
    // @ts-expect-error 忽略类型错误
    setValue('is_open', +data?.settings?.web_app_comment_settings?.is_enable);

    setValue(
      'moderation_enable',
      // @ts-expect-error 忽略类型错误
      +data?.settings?.web_app_comment_settings?.moderation_enable,
    );
  }, [data]);

  const isPro = license.edition === 1 || license.edition === 2;

  const onSubmit = handleSubmit(formData => {
    updateAppDetail(
      { id: data.id },
      {
        settings: {
          ...data.settings,
          // @ts-expect-error 忽略类型错误
          web_app_comment_settings: {
            // @ts-expect-error 忽略类型错误
            ...data.settings?.web_app_comment_settings,
            is_enable: Boolean(formData.is_open),
            moderation_enable: Boolean(formData.moderation_enable),
          },
        },
      },
    ).then(() => {
      Message.success('保存成功');
      setIsEdit(false);
      refresh();
    });
  });
  return (
    <SettingCardItem title='文档评论' isEdit={isEdit} onSubmit={onSubmit}>
      <FormItem label='文档评论'>
        <Controller
          control={control}
          name='is_open'
          render={({ field }) => (
            <RadioGroup
              row
              {...field}
              onChange={e => {
                setIsEdit(true);
                field.onChange(+e.target.value as 1 | 0);
              }}
            >
              <FormControlLabel
                value={1}
                control={<Radio size='small' />}
                label={<StyledRadioLabel>启用</StyledRadioLabel>}
              />
              <FormControlLabel
                value={0}
                control={<Radio size='small' />}
                label={<StyledRadioLabel>禁用</StyledRadioLabel>}
              />
            </RadioGroup>
          )}
        />
      </FormItem>
      <FormItem label='评论审核' tooltip={!isPro && '联创版和企业版可用'}>
        <Controller
          control={control}
          name='moderation_enable'
          render={({ field }) => (
            <RadioGroup
              row
              {...field}
              value={isPro ? field.value : undefined}
              onChange={e => {
                setIsEdit(true);
                field.onChange(+e.target.value as 1 | 0);
              }}
            >
              <FormControlLabel
                value={1}
                control={<Radio size='small' disabled={!isPro} />}
                label={<StyledRadioLabel>启用</StyledRadioLabel>}
              />
              <FormControlLabel
                value={0}
                control={<Radio size='small' disabled={!isPro} />}
                label={<StyledRadioLabel>禁用</StyledRadioLabel>}
              />
            </RadioGroup>
          )}
        />
      </FormItem>
    </SettingCardItem>
  );
};

const AI_FEEDBACK_OPTIONS = ['内容不准确', '答非所问', '其他'];

const AIQuestion = ({
  data,
  refresh,
}: {
  data: AppDetail;
  refresh: () => void;
}) => {
  const [isEdit, setIsEdit] = useState(false);
  const { control, handleSubmit, setValue } = useForm({
    defaultValues: {
      is_enabled: true,
      ai_feedback_type: [],
    },
  });
  const [inputValue, setInputValue] = useState('');

  const onSubmit = handleSubmit(formData => {
    updateAppDetail(
      { id: data.id },
      {
        settings: {
          ...data.settings,
          // @ts-expect-error 忽略类型错误
          ai_feedback_settings: {
            ...formData,
          },
        },
      },
    ).then(() => {
      Message.success('保存成功');
      setIsEdit(false);
      refresh();
    });
  });

  useEffect(() => {
    setValue(
      'is_enabled',
      // @ts-expect-error 忽略类型错误
      data.settings?.ai_feedback_settings?.is_enabled ?? true,
    );

    setValue(
      'ai_feedback_type',
      // @ts-expect-error 忽略类型错误
      data.settings?.ai_feedback_settings?.ai_feedback_type || [],
    );
  }, [data]);

  return (
    <SettingCardItem title='AI 问答评价' isEdit={isEdit} onSubmit={onSubmit}>
      <FormItem label='AI 问答评价'>
        <Controller
          control={control}
          name='ai_feedback_type'
          render={({ field }) => (
            <Autocomplete
              {...field}
              multiple
              freeSolo
              fullWidth
              options={AI_FEEDBACK_OPTIONS}
              inputValue={inputValue}
              onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
              onChange={(_, newValue) => {
                setIsEdit(true);
                const newValues = [...new Set(newValue as string[])];
                field.onChange(newValues);
              }}
              renderInput={params => (
                <TextField
                  {...params}
                  size='small'
                  placeholder='选择或输入评价，可多选，回车确认'
                  variant='outlined'
                />
              )}
            />
          )}
        />
      </FormItem>
      <FormItem label='评价开关'>
        <Controller
          control={control}
          name='is_enabled'
          render={({ field }) => (
            <RadioGroup
              row
              {...field}
              onChange={e => {
                setIsEdit(true);
                field.onChange(e.target.value === 'true');
              }}
            >
              <FormControlLabel
                value={true}
                control={<Radio size='small' />}
                label={<StyledRadioLabel>启用</StyledRadioLabel>}
              />
              <FormControlLabel
                value={false}
                control={<Radio size='small' />}
                label={<StyledRadioLabel>禁用</StyledRadioLabel>}
              />
            </RadioGroup>
          )}
        />{' '}
      </FormItem>
    </SettingCardItem>
  );
};

const DocumentCorrection = ({
  data,
  refresh,
}: {
  data: AppDetail;
  refresh: () => void;
}) => {
  const [isEdit, setIsEdit] = useState(false);
  const { license } = useAppSelector(state => state.config);
  const { control, handleSubmit, setValue } = useForm({
    defaultValues: {
      document_feedback_is_enabled: 0,
    },
  });

  const onSubmit = handleSubmit(formData => {
    console.log(data);
    updateAppDetail(
      { id: data.id },
      {
        settings: {
          ...data.settings,
          // @ts-expect-error 忽略类型错误
          document_feedback_is_enabled: Boolean(
            formData.document_feedback_is_enabled,
          ),
        },
      },
    ).then(() => {
      Message.success('保存成功');
      setIsEdit(false);
      refresh();
    });
  });

  const isPro = license.edition === 1 || license.edition === 2;

  useEffect(() => {
    setValue(
      'document_feedback_is_enabled',
      // @ts-expect-error 忽略类型错误
      +data?.settings?.document_feedback_is_enabled,
    );
  }, [data]);

  return (
    <SettingCardItem
      title={
        <>
          文档纠错
          {!isPro && (
            <Tooltip title='联创版和企业版可用' placement='top' arrow>
              <InfoIcon sx={{ color: 'text.secondary', fontSize: 14 }} />
            </Tooltip>
          )}
        </>
      }
      isEdit={isEdit}
      onSubmit={onSubmit}
    >
      <Controller
        control={control}
        name='document_feedback_is_enabled'
        render={({ field }) => (
          <RadioGroup
            row
            {...field}
            value={isPro ? field.value : undefined}
            onChange={e => {
              setIsEdit(true);
              field.onChange(+e.target.value as 1 | 0);
            }}
          >
            <FormControlLabel
              value={1}
              control={<Radio size='small' disabled={!isPro} />}
              label={<StyledRadioLabel>启用</StyledRadioLabel>}
            />
            <FormControlLabel
              value={0}
              control={<Radio size='small' disabled={!isPro} />}
              label={<StyledRadioLabel>禁用</StyledRadioLabel>}
            />
          </RadioGroup>
        )}
      />
    </SettingCardItem>
  );
};

const CardFeedback = ({ kb }: CardCommentProps) => {
  const [info, setInfo] = useState<any>({});

  const getInfo = async () => {
    const res = await getAppDetail({ kb_id: kb.id, type: 1 });
    setInfo(res);
  };

  useEffect(() => {
    getInfo();
  }, [kb]);

  return (
    <SettingCard title='反馈'>
      <AIQuestion data={info} refresh={getInfo} />
      <DocumentComments data={info} refresh={getInfo} />
      <DocumentCorrection data={info} refresh={getInfo} />
    </SettingCard>
  );
};

export default CardFeedback;
