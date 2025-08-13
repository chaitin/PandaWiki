import { getModelList, ModelListItem } from '@/api';
import ErrorJSON from '@/assets/json/error.json';
import Card from '@/components/Card';
import { ModelProvider } from '@/constant/enums';
import { useAppDispatch } from '@/store';
import { setModelStatus } from '@/store/slices/config';
import { addOpacityToColor } from '@/utils';
import { Box, Button, Stack, Tooltip, useTheme } from '@mui/material';
import { Icon, Modal } from 'ct-mui';
import { useEffect, useState } from 'react';
import LottieIcon from '../LottieIcon';
import Member from './component/Member';
import ModelAdd from './component/ModelAdd';

const System = () => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const dispatch = useAppDispatch();
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<'chat' | 'embedding' | 'rerank'>(
    'chat',
  );
  const [chatModelData, setChatModelData] = useState<ModelListItem | null>(
    null,
  );
  const [embeddingModelData, setEmbeddingModelData] =
    useState<ModelListItem | null>(null);
  const [rerankModelData, setRerankModelData] = useState<ModelListItem | null>(
    null,
  );

  const disabledClose =
    !chatModelData || !embeddingModelData || !rerankModelData;

  const getModel = () => {
    getModelList().then(res => {
      const chat = res.find(it => it.type === 'chat') || null;
      const embedding = res.find(it => it.type === 'embedding') || null;
      const rerank = res.find(it => it.type === 'rerank') || null;
      setChatModelData(chat);
      setEmbeddingModelData(embedding);
      setRerankModelData(rerank);

      const status = chat && embedding && rerank;
      dispatch(setModelStatus(status));
      if (!status) setOpen(true);
    });
  };

  useEffect(() => {
    getModel();
  }, []);

  return (
    <>
      <Box sx={{ position: 'relative' }}>
        <Button
          size='small'
          variant='outlined'
          startIcon={<Icon type='icon-a-chilunshezhisheding' />}
          onClick={() => setOpen(true)}
        >
          系统配置
        </Button>
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
                  Chat 模型
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
                      Chat 模型
                    </Box>
                  </Stack>
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
                  Embedding 模型
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
                      Embedding 模型
                    </Box>
                  </Stack>
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
                  Rerank 模型
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
                      Rerank 模型
                    </Box>
                  </Stack>
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
        </Stack>
      </Modal>
      <ModelAdd
        open={addOpen}
        type={addType}
        data={
          addType === 'chat'
            ? chatModelData
            : addType === 'embedding'
              ? embeddingModelData
              : rerankModelData
        }
        onClose={() => setAddOpen(false)}
        refresh={getModel}
      />
    </>
  );
};
export default System;
