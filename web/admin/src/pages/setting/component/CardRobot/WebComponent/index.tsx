import { FreeSoloAutocomplete } from '@/components/FreeSoloAutocomplete';
import ShowText from '@/components/ShowText';
import UploadFile from '@/components/UploadFile';
import VersionMask from '@/components/VersionMask';
import { PROFESSION_VERSION_PERMISSION } from '@/constant/version';
import { useCommitPendingInput } from '@/hooks';
import { getApiV1AppDetail, putApiV1App } from '@/request/App';
import {
  DomainAppDetailResp,
  DomainKnowledgeBaseDetail,
} from '@/request/types';
import { useAppSelector } from '@/store';
import { message } from '@ctzhian/ui';
import { IconJinggao } from '@panda-wiki/icons';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Box,
  Button,
  Collapse,
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

interface CardRobotWebComponentProps {
  kb: DomainKnowledgeBaseDetail;
}

const CardRobotWebComponent = ({ kb }: CardRobotWebComponentProps) => {
  const [isEdit, setIsEdit] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [detail, setDetail] = useState<DomainAppDetailResp | null>(null);
  const [widgetConfigOpen, setWidgetConfigOpen] = useState(false);
  const [modalConfigOpen, setModalConfigOpen] = useState(false);
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
      btn_style: 'side_sticky',
      btn_id: '',
      btn_position: 'bottom_right',
      disclaimer: '',
      btn_text: '',
      btn_logo: '',
      modal_position: 'follow',
      copyright_hide_enabled: '0',
      copyright_info: '',
      search_mode: 'all',
      placeholder: '',
      recommend_questions: [] as string[],
      // recommend_node_ids: [] as string[],
    },
  });

  const [url, setUrl] = useState<string>('');

  const recommend_questions = watch('recommend_questions') || [];
  // const recommend_node_ids = watch('recommend_node_ids') || [];
  const btn_style = watch('btn_style') || 'side_sticky';
  const copyright_hide_enabled = watch('copyright_hide_enabled') || '0';
  const isCustomButton = btn_style === 'btn_trigger';

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

    if (ssl_ports && ssl_ports.length > 0) {
      if (ssl_ports.includes(443)) setUrl(`https://${host}`);
      else setUrl(`https://${host}:${ssl_ports[0]}`);
    } else if (ports && ports.length > 0) {
      if (ports.includes(80)) setUrl(`http://${host}`);
      else setUrl(`http://${host}:${ports[0]}`);
    }
  }, [kb]);

  const getDetail = () => {
    getApiV1AppDetail({ kb_id: kb.id!, type: '2' }).then(res => {
      setDetail(res);
      const widget = res.settings?.widget_bot_settings;
      reset({
        is_open: widget?.is_open ? 1 : 0,
        theme_mode: widget?.theme_mode || 'light',
        btn_style: widget?.btn_style || 'side_sticky',
        btn_id: widget?.btn_id || '',
        btn_position: widget?.btn_position || 'bottom_right',
        btn_text: widget?.btn_text || '在线客服',
        btn_logo: widget?.btn_logo || '',
        modal_position: widget?.modal_position || 'follow',
        search_mode: widget?.search_mode || 'all',
        placeholder: widget?.placeholder || '',
        disclaimer: widget?.disclaimer || '',
        copyright_hide_enabled:
          widget?.copyright_hide_enabled === true ? '1' : '0',
        copyright_info: widget?.copyright_info || '',
        recommend_questions: widget?.recommend_questions || [],
        // recommend_node_ids:  widget?.recommend_node_ids || [],
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
            ...data,
            is_open: data.is_open === 1 ? true : false,
            copyright_hide_enabled:
              data.copyright_hide_enabled === '1' ? true : false,
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
      <Stack spacing={3}>
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
            <FormItem label='嵌入代码' sx={{ alignItems: 'flex-start' }}>
              {url ? (
                <ShowText
                  noEllipsis
                  text={[
                    `<!--// Head 标签引入样式 -->`,
                    `<link rel="stylesheet" href="${url}/widget-bot.css">`,
                    `<!--// Body 标签引入挂件 -->`,
                    `<script src="${url}/widget-bot.js"></script>`,
                  ]}
                />
              ) : (
                <Stack
                  direction='row'
                  alignItems={'center'}
                  gap={0.5}
                  sx={{
                    color: 'warning.main',
                    fontSize: 14,
                  }}
                >
                  <IconJinggao sx={{ fontSize: 16 }} />
                  未配置域名，可在
                  <Box component={'span'} sx={{ fontWeight: 500 }}>
                    门户网站 / 服务监听方式
                  </Box>{' '}
                  中配置
                </Stack>
              )}
            </FormItem>
            <FormItem
              label='配色方案'
              sx={{ alignItems: 'flex-start' }}
              labelSx={{ mt: 1 }}
            >
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
                      value='light'
                      control={<Radio size='small' />}
                      label={<Box sx={{ width: 100 }}>浅色模式</Box>}
                    />
                    <FormControlLabel
                      value='dark'
                      control={<Radio size='small' />}
                      label={<Box sx={{ width: 100 }}>深色模式</Box>}
                    />
                  </RadioGroup>
                )}
              />
            </FormItem>
            <FormItem
              label='挂件配置'
              sx={{ alignItems: 'flex-start' }}
              labelSx={{ mt: 1 }}
            >
              <Box>
                {!widgetConfigOpen && (
                  <Button
                    size='small'
                    variant='outlined'
                    onClick={() => setWidgetConfigOpen(true)}
                    endIcon={<ExpandMoreIcon />}
                  >
                    展开
                  </Button>
                )}
                <Collapse in={widgetConfigOpen}>
                  <Stack spacing={2.5}>
                    <FormItem
                      label='按钮样式'
                      sx={{ alignItems: 'flex-start' }}
                      labelSx={{ mt: 1 }}
                    >
                      <Controller
                        control={control}
                        name='btn_style'
                        render={({ field }) => (
                          <RadioGroup
                            row
                            {...field}
                            onChange={e => {
                              const value = e.target.value;
                              field.onChange(value);
                              if (value === 'btn_trigger') {
                                setValue('modal_position', 'fixed');
                              }
                              setIsEdit(true);
                            }}
                          >
                            <FormControlLabel
                              value='hover_ball'
                              control={<Radio size='small' />}
                              label={<Box sx={{ width: 100 }}>悬浮球</Box>}
                            />
                            <FormControlLabel
                              value='side_sticky'
                              control={<Radio size='small' />}
                              label={<Box sx={{ width: 100 }}>侧边吸附</Box>}
                            />
                            <FormControlLabel
                              value='btn_trigger'
                              control={<Radio size='small' />}
                              label={<Box sx={{ width: 100 }}>自定义按钮</Box>}
                            />
                          </RadioGroup>
                        )}
                      />
                    </FormItem>
                    {isCustomButton ? (
                      <FormItem
                        label='自定义按钮 ID'
                        required
                        sx={{ alignItems: 'flex-start' }}
                        labelSx={{ mt: 1 }}
                      >
                        <Controller
                          control={control}
                          name='btn_id'
                          rules={{
                            required: '自定义按钮 ID 不能为空',
                          }}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              placeholder='嵌入网站中自定义按钮的 #id 点击触发，如: pandawiki-widget-bot-btn'
                              error={!!errors.btn_id}
                              helperText={errors.btn_id?.message}
                              onChange={event => {
                                setIsEdit(true);
                                field.onChange(event);
                              }}
                            />
                          )}
                        />
                      </FormItem>
                    ) : (
                      <>
                        <FormItem
                          label='按钮位置'
                          sx={{ alignItems: 'flex-start' }}
                          labelSx={{ mt: 1 }}
                        >
                          <Controller
                            control={control}
                            name='btn_position'
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
                                  value='top_left'
                                  control={<Radio size='small' />}
                                  label={<Box sx={{ width: 100 }}>左上</Box>}
                                />
                                <FormControlLabel
                                  value='top_right'
                                  control={<Radio size='small' />}
                                  label={<Box sx={{ width: 100 }}>右上</Box>}
                                />
                                <FormControlLabel
                                  value='bottom_left'
                                  control={<Radio size='small' />}
                                  label={<Box sx={{ width: 100 }}>左下</Box>}
                                />
                                <FormControlLabel
                                  value='bottom_right'
                                  control={<Radio size='small' />}
                                  label={<Box sx={{ width: 100 }}>右下</Box>}
                                />
                              </RadioGroup>
                            )}
                          />
                        </FormItem>
                        {btn_style !== 'hover_ball' && (
                          <FormItem
                            label='按钮文字'
                            sx={{ alignItems: 'flex-start' }}
                            labelSx={{ mt: 1 }}
                          >
                            <Controller
                              control={control}
                              name='btn_text'
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  fullWidth
                                  placeholder='输入按钮文字'
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
                        )}
                        <FormItem
                          label='按钮图标'
                          sx={{ alignItems: 'flex-start' }}
                          labelSx={{ mt: 1 }}
                        >
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
                      </>
                    )}
                  </Stack>
                </Collapse>
              </Box>
            </FormItem>
            <FormItem
              label='弹框配置'
              sx={{ alignItems: 'flex-start' }}
              labelSx={{ mt: 1 }}
            >
              <Box>
                {!modalConfigOpen && (
                  <Button
                    size='small'
                    variant='outlined'
                    onClick={() => setModalConfigOpen(true)}
                    endIcon={<ExpandMoreIcon />}
                  >
                    展开
                  </Button>
                )}
                <Collapse in={modalConfigOpen}>
                  <Stack spacing={2.5}>
                    <FormItem
                      label='弹窗位置'
                      sx={{ alignItems: 'flex-start' }}
                      labelSx={{ mt: 1 }}
                    >
                      <Controller
                        control={control}
                        name='modal_position'
                        render={({ field }) => {
                          const isDisabled = btn_style === 'btn_trigger';
                          return (
                            <RadioGroup
                              row
                              {...field}
                              value={isDisabled ? 'fixed' : field.value}
                              onChange={e => {
                                if (!isDisabled) {
                                  field.onChange(e.target.value);
                                  setIsEdit(true);
                                }
                              }}
                            >
                              <FormControlLabel
                                value='follow'
                                control={
                                  <Radio size='small' disabled={isDisabled} />
                                }
                                label={<Box sx={{ width: 100 }}>跟随按钮</Box>}
                              />
                              <FormControlLabel
                                value='fixed'
                                control={
                                  <Radio size='small' disabled={isDisabled} />
                                }
                                label={<Box sx={{ width: 100 }}>居中展示</Box>}
                              />
                            </RadioGroup>
                          );
                        }}
                      />
                    </FormItem>
                    <FormItem
                      label='搜索模式'
                      sx={{ alignItems: 'flex-start' }}
                      labelSx={{ mt: 1 }}
                    >
                      <Controller
                        control={control}
                        name='search_mode'
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
                              value='all'
                              control={<Radio size='small' />}
                              label={<Box sx={{ width: 100 }}>双模式切换</Box>}
                            />
                            <FormControlLabel
                              value='qa'
                              control={<Radio size='small' />}
                              label={
                                <Box sx={{ width: 100 }}>智能问答模式</Box>
                              }
                            />
                            <FormControlLabel
                              value='doc'
                              control={<Radio size='small' />}
                              label={
                                <Box sx={{ width: 100 }}>搜索文档模式</Box>
                              }
                            />
                          </RadioGroup>
                        )}
                      />
                    </FormItem>
                    <FormItem
                      label='搜索提示'
                      sx={{ alignItems: 'flex-start' }}
                      labelSx={{ mt: 1 }}
                    >
                      <Controller
                        control={control}
                        name='placeholder'
                        render={({ field }) => (
                          <TextField
                            fullWidth
                            {...field}
                            placeholder='问问 AI 吧'
                            error={!!errors.placeholder}
                            helperText={errors.placeholder?.message}
                            onChange={event => {
                              setIsEdit(true);
                              field.onChange(event);
                            }}
                          />
                        )}
                      />
                    </FormItem>
                    <FormItem
                      label='推荐问题'
                      sx={{ alignItems: 'flex-start' }}
                      labelSx={{ mt: 1 }}
                    >
                      <FreeSoloAutocomplete
                        {...recommendQuestionsField}
                        placeholder='回车确认，填写下一个推荐问题'
                      />
                    </FormItem>
                    {/* <FormItem
                      label='推荐文档'
                      sx={{ alignItems: 'flex-start' }}
                      labelSx={{ mt: 1 }}
                    >
                      <RecommendDocDragList
                        ids={recommend_node_ids}
                        onChange={(value: string[]) => {
                          setIsEdit(true);
                          setValue('recommend_node_ids', value);
                        }}
                      />
                    </FormItem> */}
                    <VersionMask permission={PROFESSION_VERSION_PERMISSION}>
                      <FormItem
                        label='版权信息'
                        sx={{ alignItems: 'flex-start' }}
                        labelSx={{ mt: 1 }}
                      >
                        <Controller
                          control={control}
                          name='copyright_hide_enabled'
                          render={({ field }) => {
                            return (
                              <RadioGroup
                                row
                                {...field}
                                onChange={e => {
                                  field.onChange(e.target.value);
                                  setIsEdit(true);
                                }}
                              >
                                <FormControlLabel
                                  value='0'
                                  control={<Radio size='small' />}
                                  label={<Box sx={{ width: 100 }}>显示</Box>}
                                />
                                <FormControlLabel
                                  value='1'
                                  control={<Radio size='small' />}
                                  label={<Box sx={{ width: 100 }}>隐藏</Box>}
                                />
                              </RadioGroup>
                            );
                          }}
                        />
                      </FormItem>
                      {copyright_hide_enabled === '0' && (
                        <FormItem
                          label='版权文字'
                          sx={{ alignItems: 'flex-start' }}
                          labelSx={{ mt: 1 }}
                        >
                          <Controller
                            control={control}
                            name='copyright_info'
                            render={({ field }) => (
                              <TextField
                                fullWidth
                                {...field}
                                placeholder='本网站由 PandaWiki 提供技术支持'
                                error={!!errors.copyright_info}
                                helperText={errors.copyright_info?.message}
                                onChange={event => {
                                  setIsEdit(true);
                                  field.onChange(event);
                                }}
                              />
                            )}
                          />
                        </FormItem>
                      )}
                      <FormItem
                        label='免责声明'
                        sx={{ alignItems: 'flex-start' }}
                        labelSx={{ mt: 1 }}
                      >
                        <Controller
                          control={control}
                          name='disclaimer'
                          render={({ field }) => (
                            <TextField
                              fullWidth
                              {...field}
                              placeholder='本回答由 PandaWiki AI 自动生成，仅供参考。'
                              error={!!errors.disclaimer}
                              helperText={errors.disclaimer?.message}
                              onChange={event => {
                                setIsEdit(true);
                                field.onChange(event);
                              }}
                            />
                          )}
                        />
                      </FormItem>
                    </VersionMask>
                  </Stack>
                </Collapse>
              </Box>
            </FormItem>
          </>
        )}
      </Stack>
    </SettingCardItem>
  );
};

export default CardRobotWebComponent;
