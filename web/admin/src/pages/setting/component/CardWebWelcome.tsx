import {
  AppDetail,
  getNodeRecommend,
  RecommendNode,
  updateAppDetail,
  WelcomeSetting,
} from '@/api';
import DragRecommend from '@/components/Drag/DragRecommend';
import { FreeSoloAutocomplete } from '@/components/FreeSoloAutocomplete';
import { useCommitPendingInput } from '@/hooks';
import { useAppSelector } from '@/store';
import { Box, Button, Stack, TextField } from '@mui/material';
import { Icon, Message } from 'ct-mui';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import AddRecommendContent from './AddRecommendContent';

interface CardWebWelcomeProps {
  id: string;
  data: AppDetail;
  refresh: (value: WelcomeSetting) => void;
}

const CardWebWelcome = ({ id, data, refresh }: CardWebWelcomeProps) => {
  const { kb_id } = useAppSelector(state => state.config);
  const [sorted, setSorted] = useState<RecommendNode[]>([]);
  const [isEdit, setIsEdit] = useState(false);
  const [open, setOpen] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<WelcomeSetting>({
    defaultValues: {
      welcome_str: '',
      search_placeholder: '',
      recommend_questions: [],
      recommend_node_ids: [],
    },
  });

  const recommend_questions = watch('recommend_questions') || [];
  const recommend_node_ids = watch('recommend_node_ids') || [];

  const recommendQuestionsField = useCommitPendingInput<string>({
    value: recommend_questions,
    setValue: value => {
      setIsEdit(true);
      setValue('recommend_questions', value);
    },
  });

  const onSubmit = (value: WelcomeSetting) => {
    updateAppDetail({ id }, { settings: { ...data.settings, ...value } }).then(
      () => {
        refresh(value);
        Message.success('保存成功');
        setIsEdit(false);
      },
    );
  };

  const nodeRec = () => {
    getNodeRecommend({ kb_id, node_ids: recommend_node_ids }).then(res => {
      setSorted(res);
    });
  };

  useEffect(() => {
    if (recommend_node_ids.length > 0) {
      nodeRec();
    } else {
      setSorted([]);
    }
  }, [recommend_node_ids]);

  useEffect(() => {
    setSorted(data.recommend_nodes || []);
    setValue('welcome_str', data.settings?.welcome_str || '');
    setValue('search_placeholder', data.settings?.search_placeholder || '');
    setValue('recommend_questions', data.settings?.recommend_questions || []);
    setValue('recommend_node_ids', data.settings?.recommend_node_ids || []);
  }, [data]);

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
          欢迎页面
        </Box>
        {isEdit && (
          <Button
            variant='contained'
            size='small'
            onClick={handleSubmit(onSubmit)}
          >
            保存
          </Button>
        )}
      </Stack>
      <Stack gap={2} sx={{ m: 2 }}>
        <Stack direction={'row'} gap={2} alignItems={'center'}>
          <Box
            sx={{ width: 156, fontSize: 14, lineHeight: '32px', flexShrink: 0 }}
          >
            欢迎标语
          </Box>
          <Controller
            control={control}
            name='welcome_str'
            render={({ field }) => (
              <TextField
                fullWidth
                {...field}
                placeholder='输入欢迎标语'
                error={!!errors.welcome_str}
                helperText={errors.welcome_str?.message}
                onChange={event => {
                  setIsEdit(true);
                  field.onChange(event);
                }}
              />
            )}
          />
        </Stack>
        <Stack direction={'row'} gap={2} alignItems={'center'}>
          <Box
            sx={{ width: 156, fontSize: 14, lineHeight: '32px', flexShrink: 0 }}
          >
            搜索框提示文字
          </Box>
          <Controller
            control={control}
            name='search_placeholder'
            render={({ field }) => (
              <TextField
                fullWidth
                {...field}
                placeholder='输入搜索框提示文字'
                error={!!errors.search_placeholder}
                helperText={errors.search_placeholder?.message}
                onChange={event => {
                  setIsEdit(true);
                  field.onChange(event);
                }}
              />
            )}
          />
        </Stack>
        <Stack direction={'row'} gap={2} alignItems={'center'}>
          <Box
            sx={{ width: 156, fontSize: 14, lineHeight: '32px', flexShrink: 0 }}
          >
            推荐问题
          </Box>
          <FreeSoloAutocomplete
            placeholder='回车确认，填写下一个推荐问题'
            {...recommendQuestionsField}
          />
        </Stack>
        <Box>
          <Box
            sx={{
              width: 156,
              fontSize: 14,
              lineHeight: '32px',
              flexShrink: 0,
              my: 1,
            }}
          >
            推荐内容
          </Box>
          <Box sx={{ mb: 1 }}>
            <DragRecommend
              data={sorted || []}
              refresh={nodeRec}
              onChange={value => {
                setIsEdit(true);
                setValue(
                  'recommend_node_ids',
                  value.map(item => item.id),
                );
              }}
            />
          </Box>
          <Button
            size='small'
            onClick={() => setOpen(true)}
            startIcon={
              <Icon type='icon-add' sx={{ fontSize: '12px !important' }} />
            }
          >
            添加卡片
          </Button>
        </Box>
        <AddRecommendContent
          open={open}
          selected={recommend_node_ids}
          onChange={(value: string[]) => {
            setIsEdit(true);
            setValue('recommend_node_ids', value);
          }}
          onClose={() => setOpen(false)}
        />
      </Stack>
    </>
  );
};
export default CardWebWelcome;
