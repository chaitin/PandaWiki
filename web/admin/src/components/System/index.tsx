import ErrorJSON from '@/assets/json/error.json';
import Card from '@/components/Card';
import { ModelProvider } from '@/constant/enums';
import { getApiV1ModelList, putApiV1Model } from '@/request/Model';
import { GithubComChaitinPandaWikiDomainModelListItem } from '@/request/types';
import {
  convertLocalModelToUIModel,
  modelService,
} from '@/services/modelService';
import { useAppDispatch, useAppSelector } from '@/store';
import { setModelList, setModelStatus } from '@/store/slices/config';
import { addOpacityToColor } from '@/utils';
import { Box, Button, Stack, Switch, Tooltip, useTheme } from '@mui/material';
import { ModelModal } from '@yokowu/modelkit-ui';
import { Icon, Message, Modal } from 'ct-mui';
import { useEffect, useState } from 'react';
import LottieIcon from '../LottieIcon';
import Member from './component/Member';

const System = () => {
  const theme = useTheme();
  const { user, modelList } = useAppSelector(state => state.config);
  const [open, setOpen] = useState(false);
  const dispatch = useAppDispatch();
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<
    'chat' | 'embedding' | 'rerank' | 'analysis'
  >('chat');
  const [chatModelData, setChatModelData] =
    useState<GithubComChaitinPandaWikiDomainModelListItem | null>(null);
  const [embeddingModelData, setEmbeddingModelData] =
    useState<GithubComChaitinPandaWikiDomainModelListItem | null>(null);
  const [rerankModelData, setRerankModelData] =
    useState<GithubComChaitinPandaWikiDomainModelListItem | null>(null);
  const [analysisModelData, setAnalysisModelData] =
    useState<GithubComChaitinPandaWikiDomainModelListItem | null>(null);

  const disabledClose =
    !chatModelData || !embeddingModelData || !rerankModelData;

  const getModelList = () => {
    getApiV1ModelList().then(res => {
      dispatch(
        setModelList(res as GithubComChaitinPandaWikiDomainModelListItem[]),
      );
    });
  };

  const handleModelList = (
    list: GithubComChaitinPandaWikiDomainModelListItem[],
  ) => {
    const chat = list.find(it => it.type === 'chat') || null;
    const embedding = list.find(it => it.type === 'embedding') || null;
    const rerank = list.find(it => it.type === 'rerank') || null;
    const analysis = list.find(it => it.type === 'analysis') || null;
    setChatModelData(chat);
    setEmbeddingModelData(embedding);
    setRerankModelData(rerank);
    setAnalysisModelData(analysis);
    const status = chat && embedding && rerank;
    if (!status) setOpen(true);
    dispatch(setModelStatus(status));
  };

  useEffect(() => {
    if (modelList) {
      handleModelList(modelList);
    }
  }, [modelList]);

  return (
    <>
      <Box sx={{ position: 'relative' }}>
        {user.role === 'admin' && (
          <Button
            size='small'
            variant='outlined'
            startIcon={<Icon type='icon-a-chilunshezhisheding' />}
            onClick={() => setOpen(true)}
          >
            系统配置
          </Button>
        )}

        {(!chatModelData || !embeddingModelData || !rerankModelData) && (
          <Tooltip arrow title='暂未配置模型'>
            <Stack
              alignItems={'center'}
              justifyContent={'center'}
              sx={{
                width: 22,
                height: 22,
                cursor: 'pointer',
                position: 'absolute',
                top: '-4px',
                right: '-8px',
                bgcolor: '#fff',
                borderRadius: '50%',
              }}
            >
              <LottieIcon
                id='warning'
                src={ErrorJSON}
                style={{ width: 20, height: 20 }}
              />
            </Stack>
          </Tooltip>
        )}
      </Box>
      <Modal
        title='系统配置'
        width={1000}
        open={open}
        closable={!disabledClose}
        disableEscapeKeyDown={disabledClose}
        disableEnforceFocus={true}
        footer={null}
        onCancel={() => setOpen(false)}
      >
        <Stack gap={2}>
          <Member />
          <Card
            sx={{
              flex: 1,
              p: 2,
              overflow: 'hidden',
              overflowY: 'auto',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            {!chatModelData ? (
              <>
                <Stack
                  direction={'row'}
                  alignItems={'center'}
                  gap={1}
                  sx={{
                    fontSize: 14,
                    lineHeight: '24px',
                    fontWeight: 'bold',
                    mb: 2,
                  }}
                >
                  智能对话模型
                  <Stack
                    alignItems={'center'}
                    justifyContent={'center'}
                    sx={{
                      width: 22,
                      height: 22,
                      cursor: 'pointer',
                    }}
                  >
                    <LottieIcon
                      id='warning'
                      src={ErrorJSON}
                      style={{ width: 20, height: 20 }}
                    />
                  </Stack>
                  <Box sx={{ color: 'error.main' }}>
                    未配置无法使用，如果没有可用模型，可参考&nbsp;
                    <Box
                      component={'a'}
                      sx={{ color: 'primary.main', cursor: 'pointer' }}
                      href='https://pandawiki.docs.baizhi.cloud/node/01973ffe-e1bc-7165-9a71-e7aa461c05ea'
                      target='_blank'
                    >
                      文档
                    </Box>
                  </Box>
                </Stack>
                <Stack
                  direction={'row'}
                  alignItems={'center'}
                  justifyContent={'center'}
                  sx={{ my: '0px', ml: 2, fontSize: 14 }}
                >
                  <Box sx={{ height: '20px', color: 'text.auxiliary' }}>
                    尚未配置，
                  </Box>
                  <Button
                    sx={{ minWidth: 0, px: 0, height: '20px' }}
                    onClick={() => {
                      setAddOpen(true);
                      setAddType('chat');
                    }}
                  >
                    去添加
                  </Button>
                </Stack>
              </>
            ) : (
              <>
                <Stack
                  direction={'row'}
                  alignItems={'center'}
                  justifyContent={'space-between'}
                  gap={1}
                  sx={{ mt: 1 }}
                >
                  <Box>
                    <Stack
                      direction={'row'}
                      alignItems={'center'}
                      gap={1}
                      sx={{ width: 500 }}
                    >
                      <Icon
                        type={
                          ModelProvider[
                            chatModelData.provider as keyof typeof ModelProvider
                          ].icon
                        }
                        sx={{ fontSize: 18 }}
                      />
                      <Box
                        sx={{
                          fontSize: 14,
                          lineHeight: '20px',
                          color: 'text.auxiliary',
                        }}
                      >
                        {ModelProvider[
                          chatModelData.provider as keyof typeof ModelProvider
                        ].cn ||
                          ModelProvider[
                            chatModelData.provider as keyof typeof ModelProvider
                          ].label ||
                          '其他'}
                        &nbsp;&nbsp;/
                      </Box>
                      <Box
                        sx={{
                          fontSize: 14,
                          lineHeight: '20px',
                          fontFamily: 'Gbold',
                          ml: -0.5,
                        }}
                      >
                        {chatModelData.model}
                      </Box>
                      <Box
                        sx={{
                          fontSize: 12,
                          px: 1,
                          lineHeight: '20px',
                          borderRadius: '10px',
                          bgcolor: addOpacityToColor(
                            theme.palette.primary.main,
                            0.1,
                          ),
                          color: 'primary.main',
                        }}
                      >
                        智能对话模型
                      </Box>
                      <Box
                        sx={{
                          fontSize: 12,
                          px: 1,
                          lineHeight: '20px',
                          borderRadius: '10px',
                          bgcolor: addOpacityToColor(
                            theme.palette.primary.main,
                            0.1,
                          ),
                          color: 'primary.main',
                        }}
                      >
                        大模型
                      </Box>
                      <Box
                        sx={{
                          fontSize: 12,
                          px: 1,
                          lineHeight: '20px',
                          borderRadius: '10px',
                          bgcolor: addOpacityToColor(
                            theme.palette.primary.main,
                            0.1,
                          ),
                          color: 'primary.main',
                        }}
                      >
                        必选
                      </Box>
                    </Stack>
                    <Box
                      sx={{
                        fontSize: 12,
                        color: 'text.auxiliary',
                        mt: 1,
                      }}
                    >
                      在
                      <Box component='span' sx={{ fontWeight: 'bold' }}>
                        {' '}
                        智能问答{' '}
                      </Box>
                      和
                      <Box component='span' sx={{ fontWeight: 'bold' }}>
                        {' '}
                        摘要生成{' '}
                      </Box>
                      过程中使用。
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      fontSize: 12,
                      px: 1,
                      lineHeight: '20px',
                      borderRadius: '10px',
                      bgcolor: addOpacityToColor(
                        theme.palette.success.main,
                        0.1,
                      ),
                      color: 'success.main',
                    }}
                  >
                    状态正常
                  </Box>
                  {chatModelData && (
                    <Button
                      size='small'
                      variant='outlined'
                      onClick={() => {
                        setAddOpen(true);
                        setAddType('chat');
                      }}
                    >
                      修改
                    </Button>
                  )}
                </Stack>
              </>
            )}
          </Card>
          <Card
            sx={{
              flex: 1,
              p: 2,
              overflow: 'hidden',
              overflowY: 'auto',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            {!embeddingModelData ? (
              <>
                <Stack
                  direction={'row'}
                  alignItems={'center'}
                  gap={1}
                  sx={{
                    fontSize: 14,
                    lineHeight: '24px',
                    fontWeight: 'bold',
                    mb: 2,
                  }}
                >
                  向量模型
                  <Stack
                    alignItems={'center'}
                    justifyContent={'center'}
                    sx={{
                      width: 22,
                      height: 22,
                      cursor: 'pointer',
                    }}
                  >
                    <LottieIcon
                      id='warning'
                      src={ErrorJSON}
                      style={{ width: 20, height: 20 }}
                    />
                  </Stack>
                  <Box sx={{ color: 'error.main' }}>
                    未配置无法使用，如果没有可用模型，可参考&nbsp;
                    <Box
                      component={'a'}
                      sx={{ color: 'primary.main', cursor: 'pointer' }}
                      href='https://pandawiki.docs.baizhi.cloud/node/01973ffe-e1bc-7165-9a71-e7aa461c05ea'
                      target='_blank'
                    >
                      文档
                    </Box>
                  </Box>
                </Stack>
                <Stack
                  direction={'row'}
                  alignItems={'center'}
                  justifyContent={'center'}
                  sx={{ my: '0px', ml: 2, fontSize: 14 }}
                >
                  <Box sx={{ height: '20px', color: 'text.auxiliary' }}>
                    尚未配置，
                  </Box>
                  <Button
                    sx={{ minWidth: 0, px: 0, height: '20px' }}
                    onClick={() => {
                      setAddOpen(true);
                      setAddType('embedding');
                    }}
                  >
                    去添加
                  </Button>
                </Stack>
              </>
            ) : (
              <>
                <Stack
                  direction={'row'}
                  alignItems={'center'}
                  justifyContent={'space-between'}
                  gap={1}
                >
                  <Box>
                    <Stack
                      direction={'row'}
                      alignItems={'center'}
                      gap={1}
                      sx={{ width: 500 }}
                    >
                      <Icon
                        type={
                          ModelProvider[
                            embeddingModelData.provider as keyof typeof ModelProvider
                          ].icon
                        }
                        sx={{ fontSize: 18 }}
                      />
                      <Box
                        sx={{
                          fontSize: 14,
                          lineHeight: '20px',
                          color: 'text.auxiliary',
                        }}
                      >
                        {ModelProvider[
                          embeddingModelData.provider as keyof typeof ModelProvider
                        ].cn ||
                          ModelProvider[
                            embeddingModelData.provider as keyof typeof ModelProvider
                          ].label ||
                          '其他'}
                        &nbsp;&nbsp;/
                      </Box>
                      <Box
                        sx={{
                          fontSize: 14,
                          lineHeight: '20px',
                          fontFamily: 'Gbold',
                          ml: -0.5,
                        }}
                      >
                        {embeddingModelData.model}
                      </Box>
                      <Box
                        sx={{
                          fontSize: 12,
                          px: 1,
                          lineHeight: '20px',
                          borderRadius: '10px',
                          bgcolor: addOpacityToColor(
                            theme.palette.primary.main,
                            0.1,
                          ),
                          color: 'primary.main',
                        }}
                      >
                        向量模型
                      </Box>
                      <Box
                        sx={{
                          fontSize: 12,
                          px: 1,
                          lineHeight: '20px',
                          borderRadius: '10px',
                          bgcolor: addOpacityToColor(
                            theme.palette.primary.main,
                            0.1,
                          ),
                          color: 'primary.main',
                        }}
                      >
                        小模型
                      </Box>
                      <Box
                        sx={{
                          fontSize: 12,
                          px: 1,
                          lineHeight: '20px',
                          borderRadius: '10px',
                          bgcolor: addOpacityToColor(
                            theme.palette.primary.main,
                            0.1,
                          ),
                          color: 'primary.main',
                        }}
                      >
                        必选
                      </Box>
                    </Stack>
                    <Box
                      sx={{
                        fontSize: 12,
                        color: 'text.auxiliary',
                        mt: 1,
                      }}
                    >
                      在
                      <Box component='span' sx={{ fontWeight: 'bold' }}>
                        {' '}
                        内容发布{' '}
                      </Box>
                      和
                      <Box component='span' sx={{ fontWeight: 'bold' }}>
                        {' '}
                        智能问答{' '}
                      </Box>
                      和
                      <Box component='span' sx={{ fontWeight: 'bold' }}>
                        {' '}
                        智能搜索{' '}
                      </Box>
                      过程中使用。
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      fontSize: 12,
                      px: 1,
                      lineHeight: '20px',
                      borderRadius: '10px',
                      bgcolor: addOpacityToColor(
                        theme.palette.success.main,
                        0.1,
                      ),
                      color: 'success.main',
                    }}
                  >
                    状态正常
                  </Box>
                  {embeddingModelData && (
                    <Button
                      size='small'
                      variant='outlined'
                      onClick={() => {
                        setAddOpen(true);
                        setAddType('embedding');
                      }}
                    >
                      修改
                    </Button>
                  )}
                </Stack>
              </>
            )}
          </Card>
          <Card
            sx={{
              flex: 1,
              p: 2,
              overflow: 'hidden',
              overflowY: 'auto',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            {!rerankModelData ? (
              <>
                <Stack
                  direction={'row'}
                  alignItems={'center'}
                  gap={1}
                  sx={{
                    fontSize: 14,
                    lineHeight: '24px',
                    fontWeight: 'bold',
                    mb: 2,
                  }}
                >
                  重排序模型
                  <Stack
                    alignItems={'center'}
                    justifyContent={'center'}
                    sx={{
                      width: 22,
                      height: 22,
                      cursor: 'pointer',
                    }}
                  >
                    <LottieIcon
                      id='warning'
                      src={ErrorJSON}
                      style={{ width: 20, height: 20 }}
                    />
                  </Stack>
                  <Box sx={{ color: 'error.main' }}>
                    未配置无法使用，如果没有可用模型，可参考&nbsp;
                    <Box
                      component={'a'}
                      sx={{ color: 'primary.main', cursor: 'pointer' }}
                      href='https://pandawiki.docs.baizhi.cloud/node/01973ffe-e1bc-7165-9a71-e7aa461c05ea'
                      target='_blank'
                    >
                      文档
                    </Box>
                  </Box>
                </Stack>
                <Stack
                  direction={'row'}
                  alignItems={'center'}
                  justifyContent={'center'}
                  sx={{ my: '0px', ml: 2, fontSize: 14 }}
                >
                  <Box sx={{ height: '20px', color: 'text.auxiliary' }}>
                    尚未配置，
                  </Box>
                  <Button
                    sx={{ minWidth: 0, px: 0, height: '20px' }}
                    onClick={() => {
                      setAddOpen(true);
                      setAddType('rerank');
                    }}
                  >
                    去添加
                  </Button>
                </Stack>
              </>
            ) : (
              <>
                <Stack
                  direction={'row'}
                  alignItems={'center'}
                  justifyContent={'space-between'}
                  gap={1}
                >
                  <Box>
                    <Stack
                      direction={'row'}
                      alignItems={'center'}
                      gap={1}
                      sx={{ width: 500 }}
                    >
                      <Icon
                        type={
                          ModelProvider[
                            rerankModelData.provider as keyof typeof ModelProvider
                          ].icon
                        }
                        sx={{ fontSize: 18 }}
                      />
                      <Box
                        sx={{
                          fontSize: 14,
                          lineHeight: '20px',
                          color: 'text.auxiliary',
                        }}
                      >
                        {ModelProvider[
                          rerankModelData.provider as keyof typeof ModelProvider
                        ].cn ||
                          ModelProvider[
                            rerankModelData.provider as keyof typeof ModelProvider
                          ].label ||
                          '其他'}
                        &nbsp;&nbsp;/
                      </Box>
                      <Box
                        sx={{
                          fontSize: 14,
                          lineHeight: '20px',
                          fontFamily: 'Gbold',
                          ml: -0.5,
                        }}
                      >
                        {rerankModelData.model}
                      </Box>
                      <Box
                        sx={{
                          fontSize: 12,
                          px: 1,
                          lineHeight: '20px',
                          borderRadius: '10px',
                          bgcolor: addOpacityToColor(
                            theme.palette.primary.main,
                            0.1,
                          ),
                          color: 'primary.main',
                        }}
                      >
                        重排序模型
                      </Box>
                      <Box
                        sx={{
                          fontSize: 12,
                          px: 1,
                          lineHeight: '20px',
                          borderRadius: '10px',
                          bgcolor: addOpacityToColor(
                            theme.palette.primary.main,
                            0.1,
                          ),
                          color: 'primary.main',
                        }}
                      >
                        小模型
                      </Box>
                      <Box
                        sx={{
                          fontSize: 12,
                          px: 1,
                          lineHeight: '20px',
                          borderRadius: '10px',
                          bgcolor: addOpacityToColor(
                            theme.palette.primary.main,
                            0.1,
                          ),
                          color: 'primary.main',
                        }}
                      >
                        必选
                      </Box>
                    </Stack>
                    <Box
                      sx={{
                        fontSize: 12,
                        color: 'text.auxiliary',
                        mt: 1,
                      }}
                    >
                      在
                      <Box component='span' sx={{ fontWeight: 'bold' }}>
                        {' '}
                        智能问答{' '}
                      </Box>
                      和
                      <Box component='span' sx={{ fontWeight: 'bold' }}>
                        {' '}
                        智能搜索{' '}
                      </Box>
                      过程中使用。
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      fontSize: 12,
                      px: 1,
                      lineHeight: '20px',
                      borderRadius: '10px',
                      bgcolor: addOpacityToColor(
                        theme.palette.success.main,
                        0.1,
                      ),
                      color: 'success.main',
                    }}
                  >
                    状态正常
                  </Box>
                  {rerankModelData && (
                    <Button
                      size='small'
                      variant='outlined'
                      onClick={() => {
                        setAddOpen(true);
                        setAddType('rerank');
                      }}
                    >
                      修改
                    </Button>
                  )}
                </Stack>
              </>
            )}
          </Card>
          <Card
            sx={{
              flex: 1,
              p: 2,
              overflow: 'hidden',
              overflowY: 'auto',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            {!analysisModelData ? (
              <>
                <Stack
                  direction={'row'}
                  alignItems={'center'}
                  gap={1}
                  sx={{
                    fontSize: 14,
                    lineHeight: '24px',
                    mb: 2,
                  }}
                >
                  <Box sx={{ fontWeight: 'bold' }}>
                    文档分析模型
                  </Box>
                  <Box
                    sx={{
                      fontSize: 12,
                      px: 1,
                      lineHeight: '20px',
                      borderRadius: '10px',
                      bgcolor: addOpacityToColor(
                        theme.palette.primary.main,
                        0.1,
                      ),
                      color: 'primary.main',
                    }}
                  >
                    小模型
                  </Box>
                  <Box
                    sx={{
                      fontSize: 12,
                      px: 1,
                      lineHeight: '20px',
                      borderRadius: '10px',
                      bgcolor: theme.palette.divider,
                      color: 'text.auxiliary',
                    }}
                  >
                    可选
                  </Box>
                </Stack>
                <Stack
                  direction={'row'}
                  alignItems={'center'}
                  justifyContent={'center'}
                  sx={{ my: '0px', ml: 2, fontSize: 14 }}
                >
                  <Box sx={{ height: '20px', color: 'text.auxiliary' }}>
                    尚未配置，
                  </Box>
                  <Button
                    sx={{ minWidth: 0, px: 0, height: '20px' }}
                    onClick={() => {
                      setAddOpen(true);
                      setAddType('analysis');
                    }}
                  >
                    去添加
                  </Button>
                </Stack>
              </>
            ) : (
              <>
                <Stack
                  direction={'row'}
                  alignItems={'center'}
                  justifyContent={'space-between'}
                  gap={1}
                  sx={{ mt: 1 }}
                >
                  <Box>
                    <Stack
                      direction={'row'}
                      alignItems={'center'}
                      gap={1}
                      sx={{ width: 500 }}
                    >
                      <Icon
                        type={
                          ModelProvider[
                            analysisModelData.provider as keyof typeof ModelProvider
                          ].icon
                        }
                        sx={{ fontSize: 18 }}
                      />
                      <Box
                        sx={{
                          fontSize: 14,
                          lineHeight: '20px',
                          color: 'text.auxiliary',
                        }}
                      >
                        {ModelProvider[
                          analysisModelData.provider as keyof typeof ModelProvider
                        ].cn ||
                          ModelProvider[
                            analysisModelData.provider as keyof typeof ModelProvider
                          ].label ||
                          '其他'}
                        &nbsp;&nbsp;/
                      </Box>
                      <Box
                        sx={{
                          fontSize: 14,
                          lineHeight: '20px',
                          fontFamily: 'Gbold',
                          ml: -0.5,
                        }}
                      >
                        {analysisModelData.model}
                      </Box>
                      <Box
                        sx={{
                          fontSize: 12,
                          px: 1,
                          lineHeight: '20px',
                          borderRadius: '10px',
                          bgcolor: addOpacityToColor(
                            theme.palette.primary.main,
                            0.1,
                          ),
                          color: 'primary.main',
                        }}
                      >
                        文档分析模型
                      </Box>
                      <Box
                        sx={{
                          fontSize: 12,
                          px: 1,
                          lineHeight: '20px',
                          borderRadius: '10px',
                          bgcolor: addOpacityToColor(
                            theme.palette.primary.main,
                            0.1,
                          ),
                          color: 'primary.main',
                        }}
                      >
                        小模型
                      </Box>
                      <Box
                        sx={{
                          fontSize: 12,
                          px: 1,
                          lineHeight: '20px',
                          borderRadius: '10px',
                          bgcolor: theme.palette.divider,
                          color: 'text.auxiliary',
                        }}
                      >
                        可选
                      </Box>
                      <Switch
                        size='small'
                        checked={analysisModelData.is_active}
                        onChange={() => {
                          // @ts-ignore
                          putApiV1Model({
                            ...analysisModelData,
                            is_active: !analysisModelData.is_active,
                          }).then(() => {
                            Message.success('修改成功');
                            getModelList();
                          });
                        }}
                      />
                    </Stack>
                    <Box
                      sx={{
                        fontSize: 12,
                        color: 'text.auxiliary',
                        mt: 1,
                      }}
                    >
                      在
                      <Box component='span' sx={{ fontWeight: 'bold' }}>
                        {' '}
                        内容发布{' '}
                      </Box>
                      和
                      <Box component='span' sx={{ fontWeight: 'bold' }}>
                        {' '}
                        智能问答{' '}
                      </Box>
                      过程中使用， 启用后智能问答的效果会得到加强，可选配置。
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      fontSize: 12,
                      px: 1,
                      lineHeight: '20px',
                      borderRadius: '10px',
                      bgcolor: addOpacityToColor(
                        theme.palette.success.main,
                        0.1,
                      ),
                      color: 'success.main',
                    }}
                  >
                    状态正常
                  </Box>
                  {analysisModelData && (
                    <Button
                      size='small'
                      variant='outlined'
                      onClick={() => {
                        setAddOpen(true);
                        setAddType('analysis');
                      }}
                    >
                      修改
                    </Button>
                  )}
                </Stack>
              </>
            )}
          </Card>
        </Stack>
      </Modal>
      <ModelModal
        open={addOpen}
        model_type={addType}
        data={
          addType === 'chat'
            ? convertLocalModelToUIModel(chatModelData)
            : addType === 'embedding'
              ? convertLocalModelToUIModel(embeddingModelData)
              : addType === 'rerank'
                ? convertLocalModelToUIModel(rerankModelData)
                : convertLocalModelToUIModel(analysisModelData)
        }
        onClose={() => setAddOpen(false)}
        refresh={getModelList}
        modelService={modelService}
        language='zh-CN'
        messageComponent={Message}
        is_close_model_remark={true}
      />
    </>
  );
};
export default System;
