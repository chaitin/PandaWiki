import {
  AppDetail,
  getAppDetail,
  KnowledgeBaseListItem,
  updateAppDetail,
} from '@/api';
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
} from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import { Message } from 'ct-mui';

interface CardCommentProps {
  kb: KnowledgeBaseListItem;
}

// 样式封装
const StyledCardTitle = styled(Box)(({ theme }) => ({
  fontWeight: 'bold',
  padding: `${theme.spacing(1.5)} ${theme.spacing(2)}`,
  // @ts-expect-error 忽略类型错误
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
  const [isEdit, setIsEdit] = useState(false);
  const { control, handleSubmit, setValue } = useForm({
    defaultValues: {
      is_open: 0,
    },
  });

  useEffect(() => {
    // @ts-expect-error 忽略类型错误
    setValue('is_open', +data?.settings?.web_app_comment_settings?.is_enable);
  }, [data]);

  const onSubmit = handleSubmit((formData) => {
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
          },
        },
      }
    ).then(() => {
      Message.success('保存成功');
      setIsEdit(false);
      refresh();
    });
  });
  return (
    <Stack>
      <StyledHeader>
        <StyledHeaderTitle>文档评论</StyledHeaderTitle>
        {isEdit && (
          <Button variant='contained' size='small' onClick={onSubmit}>
            保存
          </Button>
        )}
      </StyledHeader>
      <StyledContentStack>
        <StyledRow>
          <StyledLabel>文档评论</StyledLabel>
          <Controller
            control={control}
            name='is_open'
            render={({ field }) => (
              <RadioGroup
                row
                {...field}
                onChange={(e) => {
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
        </StyledRow>
        <StyledRow>
          <StyledLabel>评论审核（敬请期待）</StyledLabel>
          <Controller
            control={control}
            name='is_open'
            render={({ field }) => (
              <RadioGroup
                row
                onChange={(e) => {
                  field.onChange(+e.target.value as 1 | 0);
                }}
              >
                <FormControlLabel
                  value={1}
                  control={<Radio size='small' disabled />}
                  label={<StyledRadioLabel>启用</StyledRadioLabel>}
                />
                <FormControlLabel
                  value={0}
                  control={<Radio size='small' disabled />}
                  label={<StyledRadioLabel>禁用</StyledRadioLabel>}
                />
              </RadioGroup>
            )}
          />
        </StyledRow>
      </StyledContentStack>
    </Stack>
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
  const { control, handleSubmit } = useForm({
    defaultValues: {
      is_open: 0,
    },
  });
  const [feedback, setFeedback] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');

  const onSubmit = handleSubmit((data) => {
    console.log({ ...data, feedback });
    refresh();
  });
  return (
    <Stack>
      <StyledHeader>
        <StyledHeaderTitle>AI 问答评价 （敬请期待）</StyledHeaderTitle>
        {isEdit && (
          <Button variant='contained' size='small' onClick={onSubmit}>
            保存
          </Button>
        )}
      </StyledHeader>
      <StyledContentStack>
        <StyledRow>
          <StyledLabel>AI 问答评价</StyledLabel>
          <Box sx={{ flex: 1 }}>
            <Autocomplete
              multiple
              freeSolo
              disabled
              options={AI_FEEDBACK_OPTIONS}
              value={feedback}
              inputValue={inputValue}
              onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
              onChange={(_, newValue) => setFeedback(newValue as string[])}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size='small'
                  placeholder='选择或输入评价，可多选，回车确认'
                  variant='outlined'
                />
              )}
            />
          </Box>
        </StyledRow>
        <StyledRow>
          <StyledLabel>评价开关</StyledLabel>
          <Controller
            control={control}
            name='is_open'
            render={({ field }) => (
              <RadioGroup
                row
                // {...field}
                onChange={(e) => {
                  field.onChange(+e.target.value as 1 | 0);
                }}
              >
                <FormControlLabel
                  value={1}
                  control={<Radio size='small' disabled />}
                  label={<StyledRadioLabel>启用</StyledRadioLabel>}
                />
                <FormControlLabel
                  value={0}
                  control={<Radio size='small' disabled />}
                  label={<StyledRadioLabel>禁用</StyledRadioLabel>}
                />
              </RadioGroup>
            )}
          />
        </StyledRow>
      </StyledContentStack>
    </Stack>
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
  const { control, handleSubmit } = useForm({
    defaultValues: {
      is_open: 0,
    },
  });

  const onSubmit = handleSubmit((data) => {
    console.log(data);
    refresh();
  });
  return (
    <Stack>
      <StyledHeader>
        <StyledHeaderTitle>文档纠错（敬请期待）</StyledHeaderTitle>
        {isEdit && (
          <Button variant='contained' size='small' onClick={onSubmit}>
            保存
          </Button>
        )}
      </StyledHeader>
      <StyledContentStack>
        <StyledRow>
          <StyledLabel>文档纠错</StyledLabel>
          <Controller
            control={control}
            name='is_open'
            render={({ field }) => (
              <RadioGroup
                row
                onChange={(e) => {
                  field.onChange(+e.target.value as 1 | 0);
                }}
              >
                <FormControlLabel
                  value={1}
                  control={<Radio size='small' disabled />}
                  label={<StyledRadioLabel>启用</StyledRadioLabel>}
                />
                <FormControlLabel
                  value={0}
                  control={<Radio size='small' disabled />}
                  label={<StyledRadioLabel>禁用</StyledRadioLabel>}
                />
              </RadioGroup>
            )}
          />
        </StyledRow>
      </StyledContentStack>
    </Stack>
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
    <Card>
      <StyledCardTitle>反馈</StyledCardTitle>
      <AIQuestion data={info} refresh={getInfo} />
      <Divider />
      <DocumentComments data={info} refresh={getInfo} />
      <Divider />
      <DocumentCorrection data={info} refresh={getInfo} />
    </Card>
  );
};

export default CardFeedback;
