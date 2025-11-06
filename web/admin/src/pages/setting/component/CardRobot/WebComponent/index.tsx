import { FreeSoloAutocomplete } from '@/components/FreeSoloAutocomplete';
import ShowText from '@/components/ShowText';
import UploadFile from '@/components/UploadFile';
import { useCommitPendingInput } from '@/hooks';
import { getApiV1AppDetail, putApiV1App } from '@/request/App';
import {
  DomainAppDetailResp,
  DomainKnowledgeBaseDetail,
} from '@/request/types';
import { useAppSelector } from '@/store';
import { Icon, message } from '@ctzhian/ui';
import {
  Box,
  FormControlLabel,
  Link,
  Radio,
  RadioGroup,
  Stack,
  TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { FormItem, SettingCardItem } from '../../Common';
import RecommendDocDragList from './RecommendDocDragList';

interface CardRobotWebComponentProps {
  kb: DomainKnowledgeBaseDetail;
}

const CardRobotWebComponent = ({ kb }: CardRobotWebComponentProps) => {
  const [isEdit, setIsEdit] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [detail, setDetail] = useState<DomainAppDetailResp | null>(null);
  const { kb_id } = useAppSelector(state => state.config);
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      is_open: 0,
      theme_mode: 'light',
      btn_text: '',
      btn_logo: '',
      recommend_questions: [] as string[],
      recommend_node_ids: [] as string[],
    },
  });

  const [url, setUrl] = useState<string>('');

  const recommend_questions = watch('recommend_questions') || [];
  const recommend_node_ids = watch('recommend_node_ids') || [];

  const recommendQuestionsField = useCommitPendingInput<string>({
    value: recommend_questions,
    setValue: value => {
      setIsEdit(true);
      setValue('recommend_questions', value);
    },
  });

  useEffect(() => {
    if (kb.access_settings?.base_url) {
      setUrl(kb.access_settings.base_url);
      return;
    }
    const host = kb.access_settings?.hosts?.[0] || '';
    if (host === '') return;
    const { ssl_ports = [], ports = [] } = kb.access_settings || {};

    if (ssl_ports) {
      if (ssl_ports.includes(443)) setUrl(`https://${host}`);
      else if (ssl_ports.length > 0) setUrl(`https://${host}:${ssl_ports[0]}`);
    } else if (ports) {
      if (ports.includes(80)) setUrl(`http://${host}`);
      else if (ports.length > 0) setUrl(`http://${host}:${ports[0]}`);
    }
  }, [kb]);

  const getDetail = () => {
    getApiV1AppDetail({ kb_id: kb.id!, type: '2' }).then(res => {
      setDetail(res);
      reset({
        is_open: res.settings?.widget_bot_settings?.is_open ? 1 : 0,
        theme_mode: res.settings?.widget_bot_settings?.theme_mode || 'light',
        btn_text: res.settings?.widget_bot_settings?.btn_text || '在线客服',
        btn_logo: res.settings?.widget_bot_settings?.btn_logo,
        recommend_questions:
          res.settings?.widget_bot_settings?.recommend_questions || [],
        recommend_node_ids:
          res.settings?.widget_bot_settings?.recommend_node_ids || [],
      });
      setIsEnabled(res.settings?.widget_bot_settings?.is_open ? true : false);
    });
  };

  const onSubmit = handleSubmit(data => {
    if (!detail) return;
    putApiV1App(
      { id: detail.id! },
      {
        kb_id,
        settings: {
          widget_bot_settings: {
            is_open: data.is_open === 1 ? true : false,
            theme_mode: data.theme_mode as 'light' | 'dark',
            btn_text: data.btn_text,
            btn_logo: data.btn_logo,
            recommend_questions: data.recommend_questions || [],
            recommend_node_ids: data.recommend_node_ids || [],
          },
        },
      },
    ).then(() => {
      message.success('保存成功');
      setIsEdit(false);
      getDetail();
      reset();
    });
  });

  useEffect(() => {
    getDetail();
  }, [kb]);

  return (
    <SettingCardItem
      title='网页挂件机器人'
      isEdit={isEdit}
      onSubmit={onSubmit}
      more={
        <Link
          component='a'
          href='https://pandawiki.docs.baizhi.cloud/node/0197f335-a1a8-786c-95df-0848f61fb98a'
          target='_blank'
          sx={{
            fontSize: 14,
            textDecoration: 'none',
            fontWeight: 'normal',
            ml: 1,
            '&:hover': {
              fontWeight: 'bold',
            },
          }}
        >
          使用方法
        </Link>
      }
    >
      <FormItem label='网页挂件机器人'>
        <Controller
          control={control}
          name='is_open'
          render={({ field }) => (
            <RadioGroup
              row
              {...field}
              onChange={e => {
                field.onChange(+e.target.value as 1 | 0);
                setIsEnabled((+e.target.value as 1 | 0) === 1);
                setIsEdit(true);
              }}
            >
              <FormControlLabel
                value={1}
                control={<Radio size='small' />}
                label={<Box sx={{ width: 100 }}>启用</Box>}
              />
              <FormControlLabel
                value={0}
                control={<Radio size='small' />}
                label={<Box sx={{ width: 100 }}>禁用</Box>}
              />
            </RadioGroup>
          )}
        />
      </FormItem>
      {isEnabled && (
        <>
          <FormItem label='配色方案'>
            <Controller
              control={control}
              name='theme_mode'
              render={({ field }) => (
                <RadioGroup
                  row
                  {...field}
                  onChange={e => {
                    field.onChange(e.target.value);
                    setIsEdit(true);
                  }}
                >
                  <FormControlLabel
                    value={'light'}
                    control={<Radio size='small' />}
                    label={<Box sx={{ width: 100 }}>浅色模式</Box>}
                  />
                  <FormControlLabel
                    value={'dark'}
                    control={<Radio size='small' />}
                    label={<Box sx={{ width: 100 }}>深色模式</Box>}
                  />
                </RadioGroup>
              )}
            />
          </FormItem>
          <FormItem label='侧边按钮文字'>
            <Controller
              control={control}
              name='btn_text'
              render={({ field }) => (
                <TextField
                  fullWidth
                  {...field}
                  placeholder='输入侧边按钮文字'
                  error={!!errors.btn_text}
                  helperText={errors.btn_text?.message}
                  onChange={event => {
                    setIsEdit(true);
                    field.onChange(event);
                  }}
                />
              )}
            />
          </FormItem>
          <FormItem label='侧边按钮 Logo'>
            <Controller
              control={control}
              name='btn_logo'
              render={({ field }) => (
                <UploadFile
                  {...field}
                  id='btn_logo'
                  type='url'
                  accept='image/*'
                  width={80}
                  onChange={url => {
                    field.onChange(url);
                    setIsEdit(true);
                  }}
                />
              )}
            />
          </FormItem>
          <FormItem label='推荐问题'>
            <FreeSoloAutocomplete
              {...recommendQuestionsField}
              placeholder='回车确认，填写下一个推荐问题'
            />
          </FormItem>
          <FormItem label='推荐文档'>
            <RecommendDocDragList
              ids={recommend_node_ids}
              onChange={(value: string[]) => {
                setIsEdit(true);
                setValue('recommend_node_ids', value);
              }}
            />
          </FormItem>
          <FormItem label='嵌入代码'>
            {url ? (
              <ShowText
                noEllipsis
                text={[
                  `<!--// Head 标签引入样式 -->`,
                  `<link rel="stylesheet" href="${url}/widget-bot.css">`,
                  '',
                  `<!--// Body 标签引入挂件 -->`,
                  `<script src="${url}/widget-bot.js"></script>`,
                ]}
              />
            ) : (
              <Stack
                direction='row'
                alignItems={'center'}
                gap={0.5}
                sx={{ color: 'warning.main', fontSize: 14 }}
              >
                <Icon type='icon-jinggao' />
                未配置域名，可在右侧
                <Box component={'span'} sx={{ fontWeight: 500 }}>
                  服务监听方式
                </Box>{' '}
                中配置
              </Stack>
            )}
          </FormItem>
        </>
      )}
    </SettingCardItem>
  );
};

export default CardRobotWebComponent;
