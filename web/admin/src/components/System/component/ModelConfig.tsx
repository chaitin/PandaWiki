import ErrorJSON from '@/assets/json/error.json';
import Card from '@/components/Card';
import { ModelProvider } from '@/constant/enums';
import {
  postApiV1ModelSwitchMode,
  putApiV1Model,
  getApiV1ModelModeSetting,
} from '@/request/Model';
import { GithubComChaitinPandaWikiDomainModelListItem } from '@/request/types';
import { addOpacityToColor } from '@/utils';
import { message, Modal } from '@ctzhian/ui';
import {
  Box,
  Button,
  Stack,
  Switch,
  Radio,
  RadioGroup,
  FormControlLabel,
  useTheme,
} from '@mui/material';
import LottieIcon from '../../LottieIcon';
import {
  useState,
  useEffect,
  lazy,
  Suspense,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  convertLocalModelToUIModel,
  modelService,
} from '@/services/modelService';
import AutoModelConfig, { AutoModelConfigRef } from './AutoModelConfig';

const ModelModal = lazy(() =>
  import('@ctzhian/modelkit').then(
    (mod: typeof import('@ctzhian/modelkit')) => ({ default: mod.ModelModal }),
  ),
);

export interface ModelConfigRef {
  getAutoConfigFormData: () => { apiKey: string; selectedModel: string } | null;
  handleClose: () => void;
  onSubmit: () => Promise<void>;
}

interface ModelConfigProps {
  onCloseModal: () => void;
  chatModelData: GithubComChaitinPandaWikiDomainModelListItem | null;
  embeddingModelData: GithubComChaitinPandaWikiDomainModelListItem | null;
  rerankModelData: GithubComChaitinPandaWikiDomainModelListItem | null;
  analysisModelData: GithubComChaitinPandaWikiDomainModelListItem | null;
  analysisVLModelData: GithubComChaitinPandaWikiDomainModelListItem | null;
  getModelList: () => void;
  autoSwitchToAutoMode?: boolean;
  hideDocumentationHint?: boolean;
  showTip?: boolean;
  showSaveBtn?: boolean;
}

const ModelConfig = forwardRef<ModelConfigRef, ModelConfigProps>(
  (props, ref) => {
    const theme = useTheme();
    const {
      onCloseModal,
      chatModelData,
      embeddingModelData,
      rerankModelData,
      analysisModelData,
      analysisVLModelData,
      getModelList,
      autoSwitchToAutoMode = false,
      hideDocumentationHint = false,
      showTip = false,
      showSaveBtn = true,
    } = props;

    const [autoConfigMode, setAutoConfigMode] = useState(false);
    const [hasAutoSwitched, setHasAutoSwitched] = useState(false);
    const [tempMode, setTempMode] = useState<'auto' | 'manual'>('manual');
    const [savedMode, setSavedMode] = useState<'auto' | 'manual'>('manual');
    const [isSaving, setIsSaving] = useState(false);
    const [initialApiKey, setInitialApiKey] = useState('');
    const [initialChatModel, setInitialChatModel] = useState('');
    const [hasConfigChanged, setHasConfigChanged] = useState(false);

    const autoConfigRef = useRef<AutoModelConfigRef>(null);

    const [addOpen, setAddOpen] = useState(false);
    const [addType, setAddType] = useState<
      'chat' | 'embedding' | 'rerank' | 'analysis' | 'analysis-vl'
    >('chat');
    const [openingAdd, setOpeningAdd] = useState<
      'chat' | 'embedding' | 'rerank' | 'analysis' | 'analysis-vl' | null
    >(null);

    const handleOpenAdd = async (
      type: 'chat' | 'embedding' | 'rerank' | 'analysis' | 'analysis-vl',
    ) => {
      try {
        setOpeningAdd(type);
        // 预加载 modal 代码分块，避免首次打开白屏
        await import('@ctzhian/modelkit');
        setAddType(type);
        setAddOpen(true);
      } finally {
        setOpeningAdd(null);
      }
    };

    // 组件挂载时,获取当前配置
    useEffect(() => {
      const fetchModeSetting = async () => {
        try {
          const setting = await getApiV1ModelModeSetting();
          if (setting) {
            const isAuto = setting.mode === 'auto';
            const mode = setting.mode as 'auto' | 'manual';
            setAutoConfigMode(isAuto);
            setTempMode(mode);
            setSavedMode(mode);

            // 保存 API Key 和 Chat Model
            if (setting.auto_mode_api_key) {
              setInitialApiKey(setting.auto_mode_api_key);
            }
            if (setting.chat_model) {
              setInitialChatModel(setting.chat_model);
            }
          }
        } catch (err) {
          console.error('获取模型配置失败:', err);
        }
      };
      fetchModeSetting();
    }, []);

    // 如果需要自动切换到自动配置模式
    useEffect(() => {
      const switchToAutoMode = async () => {
        if (autoSwitchToAutoMode && !hasAutoSwitched) {
          try {
            await postApiV1ModelSwitchMode({ mode: 'auto' });
            setAutoConfigMode(true);
            setTempMode('auto');
            setSavedMode('auto');
            setHasAutoSwitched(true);
            getModelList();
          } catch (err) {
            console.error('切换到自动配置模式失败:', err);
          }
        }
      };
      switchToAutoMode();
    }, [autoSwitchToAutoMode, hasAutoSwitched, getModelList]);

    // 处理关闭弹窗
    const handleCloseModal = () => {
      // 判断是否有未应用的更改
      const hasUnappliedChanges = tempMode !== savedMode || hasConfigChanged;

      if (hasUnappliedChanges) {
        Modal.confirm({
          title: '提示',
          content: '有未应用的设置，是否确认关闭？',
          onOk: () => {
            onCloseModal();
          },
          okText: '确认',
          cancelText: '取消',
        });
      } else {
        onCloseModal();
      }
    };

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      getAutoConfigFormData: () => {
        if (autoConfigMode && autoConfigRef.current) {
          return autoConfigRef.current.getFormData();
        }
        return null;
      },
      onSubmit: handleSave,
      handleClose: handleCloseModal,
    }));

    const handleSave = async () => {
      if (tempMode !== savedMode || hasConfigChanged) {
        setIsSaving(true);
        try {
          const requestData: {
            mode: 'auto' | 'manual';
            auto_mode_api_key?: string;
            chat_model?: string;
          } = {
            mode: tempMode,
          };

          // 如果是自动模式，获取用户输入的 API Key 和 model
          if (tempMode === 'auto' && autoConfigRef.current) {
            const formData = autoConfigRef.current.getFormData();
            if (formData) {
              requestData.auto_mode_api_key = formData.apiKey;
              requestData.chat_model = formData.selectedModel;
            }
          }

          await postApiV1ModelSwitchMode(requestData);
          setSavedMode(tempMode);
          setAutoConfigMode(tempMode === 'auto');
          setHasConfigChanged(false); // 重置变更标记

          // 更新保存的初始值
          if (tempMode === 'auto' && autoConfigRef.current) {
            const formData = autoConfigRef.current.getFormData();
            if (formData) {
              setInitialApiKey(formData.apiKey);
              setInitialChatModel(formData.selectedModel);
            }
          }

          if (showSaveBtn) {
            message.success(
              tempMode === 'auto'
                ? '已切换为自动配置模式'
                : '已切换为手动配置模式',
            );
          }
          getModelList(); // 刷新模型列表
        } finally {
          setIsSaving(false);
        }
      }
    };

    const IconModel = chatModelData
      ? ModelProvider[chatModelData.provider as keyof typeof ModelProvider].icon
      : null;

    const IconEmbeddingModel = embeddingModelData
      ? ModelProvider[embeddingModelData.provider as keyof typeof ModelProvider]
          .icon
      : null;

    const IconRerankModel = rerankModelData
      ? ModelProvider[rerankModelData.provider as keyof typeof ModelProvider]
          .icon
      : null;

    const IconAnalysisModel = analysisModelData
      ? ModelProvider[analysisModelData.provider as keyof typeof ModelProvider]
          .icon
      : null;

    const IconAnalysisVLModel = analysisVLModelData
      ? ModelProvider[
          analysisVLModelData.provider as keyof typeof ModelProvider
        ].icon
      : null;

    return (
      <Stack gap={0}>
        <Box
          sx={{
            pl: 2,
            display: 'flex',
            alignItems: 'flex-start',
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                fontSize: 14,
                fontWeight: 'bold',
                color: 'text.primary',
                mb: '16px',
              }}
            >
              <Box
                sx={{
                  width: 4,
                  height: 10,
                  bgcolor: 'primary.main',
                  borderRadius: '30%',
                  mr: 1,
                }}
              />
              模型配置
            </Box>
            <RadioGroup
              row
              value={tempMode}
              onChange={e => {
                const newMode = e.target.value as 'auto' | 'manual';
                setTempMode(newMode);
                // 立即切换显示的组件
                setAutoConfigMode(newMode === 'auto');
                // 切换模式时重置变更标记
                setHasConfigChanged(false);
              }}
            >
              <FormControlLabel
                value='auto'
                control={<Radio size='small' />}
                label='自动配置'
              />
              <FormControlLabel
                value='manual'
                control={<Radio size='small' />}
                label='手动配置'
              />
            </RadioGroup>
          </Box>
          {(tempMode !== savedMode || hasConfigChanged) && showSaveBtn && (
            <Button
              variant='contained'
              size='small'
              loading={isSaving}
              onClick={handleSave}
              sx={{ mt: 3 }}
            >
              应用
            </Button>
          )}
        </Box>
        {autoConfigMode ? (
          <AutoModelConfig
            ref={autoConfigRef}
            showTip={showTip}
            initialApiKey={initialApiKey}
            initialChatModel={initialChatModel}
            onDataChange={() => setHasConfigChanged(true)}
          />
        ) : (
          <>
            {/* Chat */}
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
              <Stack
                direction={'row'}
                alignItems={'center'}
                justifyContent={'space-between'}
              >
                <Box>
                  <Stack
                    direction={'row'}
                    alignItems={'center'}
                    gap={1}
                    sx={{ width: 500 }}
                  >
                    {chatModelData ? (
                      <>
                        {IconModel && <IconModel sx={{ fontSize: 18 }} />}
                        <Box
                          sx={{
                            fontSize: 14,
                            lineHeight: '20px',
                            color: 'text.tertiary',
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
                      </>
                    ) : (
                      <Box
                        sx={{
                          fontSize: 14,
                          lineHeight: '20px',
                          fontFamily: 'Gbold',
                          ml: -0.5,
                        }}
                      >
                        智能对话模型
                      </Box>
                    )}
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
                  <Box sx={{ fontSize: 12, color: 'text.tertiary', mt: 1 }}>
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
                <Box sx={{ flexGrow: 1, flexSelf: 'flex-start' }}>
                  {chatModelData ? (
                    <Box
                      sx={{
                        display: 'inline-block',
                        fontSize: 12,
                        px: 1,
                        lineHeight: '20px',
                        borderRadius: '10px',
                        bgcolor: addOpacityToColor(
                          chatModelData.is_active
                            ? theme.palette.success.main
                            : theme.palette.error.main,
                          0.1,
                        ),
                        color: chatModelData.is_active
                          ? 'success.main'
                          : 'error.main',
                      }}
                    >
                      {chatModelData.is_active ? '状态正常' : '未启用'}
                    </Box>
                  ) : (
                    <Stack direction={'row'} alignItems={'center'} gap={1}>
                      <Box
                        sx={{
                          fontSize: 12,
                          px: 1,
                          lineHeight: '20px',
                          borderRadius: '10px',
                          bgcolor: addOpacityToColor(
                            theme.palette.error.main,
                            0.1,
                          ),
                          color: 'error.main',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        必填配置
                      </Box>
                      {!hideDocumentationHint && (
                        <>
                          <Stack
                            alignItems={'center'}
                            justifyContent={'center'}
                            sx={{ width: 22, height: 22, cursor: 'pointer' }}
                          >
                            <LottieIcon
                              id='warning'
                              src={ErrorJSON}
                              style={{ width: 20, height: 20 }}
                            />
                          </Stack>
                          <Box sx={{ color: 'error.main', fontSize: 12 }}>
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
                        </>
                      )}
                    </Stack>
                  )}
                </Box>
                <Button
                  size='small'
                  variant='outlined'
                  loading={openingAdd === 'chat'}
                  onClick={() => handleOpenAdd('chat')}
                >
                  {chatModelData ? '修改' : '配置'}
                </Button>
              </Stack>
            </Card>

            {/* Embedding */}
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
              <Stack
                direction={'row'}
                alignItems={'center'}
                justifyContent={'space-between'}
              >
                <Box>
                  <Stack
                    direction={'row'}
                    alignItems={'center'}
                    gap={1}
                    sx={{ width: 500 }}
                  >
                    {embeddingModelData ? (
                      <>
                        {IconEmbeddingModel && (
                          <IconEmbeddingModel sx={{ fontSize: 18 }} />
                        )}

                        <Box
                          sx={{
                            fontSize: 14,
                            lineHeight: '20px',
                            color: 'text.tertiary',
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
                      </>
                    ) : (
                      <Box
                        sx={{
                          fontSize: 14,
                          lineHeight: '20px',
                          fontFamily: 'Gbold',
                          ml: -0.5,
                        }}
                      >
                        向量模型
                      </Box>
                    )}
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
                  <Box sx={{ fontSize: 12, color: 'text.tertiary', mt: 1 }}>
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
                <Box sx={{ flexGrow: 1, flexSelf: 'flex-start' }}>
                  {embeddingModelData ? (
                    <Box
                      sx={{
                        display: 'inline-block',
                        fontSize: 12,
                        px: 1,
                        lineHeight: '20px',
                        borderRadius: '10px',
                        bgcolor: addOpacityToColor(
                          embeddingModelData.is_active
                            ? theme.palette.success.main
                            : theme.palette.error.main,
                          0.1,
                        ),
                        color: embeddingModelData.is_active
                          ? 'success.main'
                          : 'error.main',
                      }}
                    >
                      {embeddingModelData.is_active ? '状态正常' : '未启用'}
                    </Box>
                  ) : (
                    <Stack direction={'row'} alignItems={'center'} gap={1}>
                      <Box
                        sx={{
                          fontSize: 12,
                          px: 1,
                          lineHeight: '20px',
                          borderRadius: '10px',
                          bgcolor: addOpacityToColor(
                            theme.palette.error.main,
                            0.1,
                          ),
                          color: 'error.main',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        必填配置
                      </Box>
                      {!hideDocumentationHint && (
                        <>
                          <Stack
                            alignItems={'center'}
                            justifyContent={'center'}
                            sx={{ width: 22, height: 22, cursor: 'pointer' }}
                          >
                            <LottieIcon
                              id='warning'
                              src={ErrorJSON}
                              style={{ width: 20, height: 20 }}
                            />
                          </Stack>
                          <Box sx={{ color: 'error.main', fontSize: 12 }}>
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
                        </>
                      )}
                    </Stack>
                  )}
                </Box>
                <Button
                  size='small'
                  variant='outlined'
                  loading={openingAdd === 'embedding'}
                  onClick={() => handleOpenAdd('embedding')}
                >
                  {embeddingModelData ? '修改' : '配置'}
                </Button>
              </Stack>
            </Card>

            {/* Rerank */}
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
              <Stack
                direction={'row'}
                alignItems={'center'}
                justifyContent={'space-between'}
              >
                <Box>
                  <Stack
                    direction={'row'}
                    alignItems={'center'}
                    gap={1}
                    sx={{ width: 500 }}
                  >
                    {rerankModelData ? (
                      <>
                        {IconRerankModel && (
                          <IconRerankModel sx={{ fontSize: 18 }} />
                        )}

                        <Box
                          sx={{
                            fontSize: 14,
                            lineHeight: '20px',
                            color: 'text.tertiary',
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
                      </>
                    ) : (
                      <Box
                        sx={{
                          fontSize: 14,
                          lineHeight: '20px',
                          fontFamily: 'Gbold',
                          ml: -0.5,
                        }}
                      >
                        重排序模型
                      </Box>
                    )}
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
                  <Box sx={{ fontSize: 12, color: 'text.tertiary', mt: 1 }}>
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
                <Box sx={{ flexGrow: 1, flexSelf: 'flex-start' }}>
                  {rerankModelData ? (
                    <Box
                      sx={{
                        display: 'inline-block',
                        fontSize: 12,
                        px: 1,
                        lineHeight: '20px',
                        borderRadius: '10px',
                        bgcolor: addOpacityToColor(
                          rerankModelData.is_active
                            ? theme.palette.success.main
                            : theme.palette.error.main,
                          0.1,
                        ),
                        color: rerankModelData.is_active
                          ? 'success.main'
                          : 'error.main',
                      }}
                    >
                      {rerankModelData.is_active ? '状态正常' : '未启用'}
                    </Box>
                  ) : (
                    <Stack direction={'row'} alignItems={'center'} gap={1}>
                      <Box
                        sx={{
                          fontSize: 12,
                          px: 1,
                          lineHeight: '20px',
                          borderRadius: '10px',
                          bgcolor: addOpacityToColor(
                            theme.palette.error.main,
                            0.1,
                          ),
                          color: 'error.main',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        必填配置
                      </Box>
                      {!hideDocumentationHint && (
                        <>
                          <Stack
                            alignItems={'center'}
                            justifyContent={'center'}
                            sx={{ width: 22, height: 22, cursor: 'pointer' }}
                          >
                            <LottieIcon
                              id='warning'
                              src={ErrorJSON}
                              style={{ width: 20, height: 20 }}
                            />
                          </Stack>
                          <Box sx={{ color: 'error.main', fontSize: 12 }}>
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
                        </>
                      )}
                    </Stack>
                  )}
                </Box>
                <Button
                  size='small'
                  variant='outlined'
                  loading={openingAdd === 'rerank'}
                  onClick={() => handleOpenAdd('rerank')}
                >
                  {rerankModelData ? '修改' : '配置'}
                </Button>
              </Stack>
            </Card>

            {/* Analysis */}
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
              <Stack
                direction={'row'}
                alignItems={'center'}
                justifyContent={'space-between'}
              >
                <Box>
                  <Stack
                    direction={'row'}
                    alignItems={'center'}
                    gap={1}
                    sx={{ width: 500 }}
                  >
                    {analysisModelData ? (
                      <>
                        {IconAnalysisModel && (
                          <IconAnalysisModel sx={{ fontSize: 18 }} />
                        )}

                        <Box
                          sx={{
                            fontSize: 14,
                            lineHeight: '20px',
                            color: 'text.tertiary',
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
                      </>
                    ) : (
                      <Box
                        sx={{
                          fontSize: 14,
                          lineHeight: '20px',
                          fontFamily: 'Gbold',
                          ml: -0.5,
                        }}
                      >
                        文档分析模型
                      </Box>
                    )}
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
                  <Box sx={{ fontSize: 12, color: 'text.tertiary', mt: 1 }}>
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
                    过程中使用。
                  </Box>
                </Box>
                <Box sx={{ flexGrow: 1, flexSelf: 'flex-start' }}>
                  {analysisModelData ? (
                    <Box
                      sx={{
                        display: 'inline-block',
                        fontSize: 12,
                        px: 1,
                        lineHeight: '20px',
                        borderRadius: '10px',
                        bgcolor: addOpacityToColor(
                          analysisModelData.is_active
                            ? theme.palette.success.main
                            : theme.palette.error.main,
                          0.1,
                        ),
                        color: analysisModelData.is_active
                          ? 'success.main'
                          : 'error.main',
                      }}
                    >
                      {analysisModelData.is_active ? '状态正常' : '未启用'}
                    </Box>
                  ) : (
                    <Stack direction={'row'} alignItems={'center'} gap={1}>
                      <Box
                        sx={{
                          fontSize: 12,
                          px: 1,
                          lineHeight: '20px',
                          borderRadius: '10px',
                          bgcolor: addOpacityToColor(
                            theme.palette.error.main,
                            0.1,
                          ),
                          color: 'error.main',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        必填配置
                      </Box>
                      {!hideDocumentationHint && (
                        <>
                          <Stack
                            alignItems={'center'}
                            justifyContent={'center'}
                            sx={{ width: 22, height: 22, cursor: 'pointer' }}
                          >
                            <LottieIcon
                              id='warning'
                              src={ErrorJSON}
                              style={{ width: 20, height: 20 }}
                            />
                          </Stack>
                          <Box sx={{ color: 'error.main', fontSize: 12 }}>
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
                        </>
                      )}
                    </Stack>
                  )}
                </Box>
                <Button
                  size='small'
                  variant='outlined'
                  loading={openingAdd === 'analysis'}
                  onClick={() => handleOpenAdd('analysis')}
                >
                  {analysisModelData ? '修改' : '配置'}
                </Button>
              </Stack>
            </Card>

            {/* Analysis-VL */}
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
              <Stack
                direction={'row'}
                alignItems={'center'}
                justifyContent={'space-between'}
              >
                <Box>
                  <Stack
                    direction={'row'}
                    alignItems={'center'}
                    gap={1}
                    sx={{ width: 500 }}
                  >
                    {analysisVLModelData ? (
                      <>
                        {IconAnalysisVLModel && (
                          <IconAnalysisVLModel sx={{ fontSize: 18 }} />
                        )}
                        <Box
                          sx={{
                            fontSize: 14,
                            lineHeight: '20px',
                            color: 'text.tertiary',
                          }}
                        >
                          {ModelProvider[
                            analysisVLModelData.provider as keyof typeof ModelProvider
                          ].cn ||
                            ModelProvider[
                              analysisVLModelData.provider as keyof typeof ModelProvider
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
                          {analysisVLModelData.model}
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
                          图像分析模型
                        </Box>
                      </>
                    ) : (
                      <Box
                        sx={{
                          fontSize: 14,
                          lineHeight: '20px',
                          fontFamily: 'Gbold',
                          ml: -0.5,
                        }}
                      >
                        图像分析模型
                      </Box>
                    )}
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
                      视觉模型
                    </Box>
                    <Box
                      sx={{
                        fontSize: 12,
                        px: 1,
                        lineHeight: '20px',
                        borderRadius: '10px',
                        bgcolor: theme.palette.divider,
                        color: 'text.tertiary',
                      }}
                    >
                      可选
                    </Box>
                    {analysisVLModelData && (
                      <Switch
                        size='small'
                        checked={analysisVLModelData.is_active}
                        onChange={() => {
                          // @ts-expect-error base_url 可能为 undefined
                          putApiV1Model({
                            ...analysisVLModelData,
                            is_active: !analysisVLModelData.is_active,
                          }).then(() => {
                            message.success('修改成功');
                            getModelList();
                          });
                        }}
                      />
                    )}
                  </Stack>
                  <Box sx={{ fontSize: 12, color: 'text.tertiary', mt: 1 }}>
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
                    过程中使用，启用后图像分析能力可用，可选配置。
                  </Box>
                </Box>
                <Box sx={{ flexGrow: 1, flexSelf: 'flex-start' }}>
                  {analysisVLModelData ? (
                    <Box
                      sx={{
                        display: 'inline-block',
                        fontSize: 12,
                        px: 1,
                        lineHeight: '20px',
                        borderRadius: '10px',
                        bgcolor: addOpacityToColor(
                          analysisVLModelData.is_active
                            ? theme.palette.success.main
                            : theme.palette.error.main,
                          0.1,
                        ),
                        color: analysisVLModelData.is_active
                          ? 'success.main'
                          : 'error.main',
                      }}
                    >
                      {analysisVLModelData.is_active ? '状态正常' : '未启用'}
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        display: 'inline-block',
                        fontSize: 12,
                        px: 1,
                        lineHeight: '20px',
                        borderRadius: '10px',
                        bgcolor: theme.palette.divider,
                        color: 'text.tertiary',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      可选模型
                    </Box>
                  )}
                </Box>
                <Button
                  size='small'
                  variant='outlined'
                  loading={openingAdd === 'analysis-vl'}
                  onClick={() => handleOpenAdd('analysis-vl')}
                >
                  {analysisVLModelData ? '修改' : '配置'}
                </Button>
              </Stack>
            </Card>
          </>
        )}
        {addOpen && (
          <Suspense fallback={null}>
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
                      : addType === 'analysis'
                        ? convertLocalModelToUIModel(analysisModelData)
                        : addType === 'analysis-vl'
                          ? convertLocalModelToUIModel(analysisVLModelData)
                          : null
              }
              onClose={() => {
                setAddOpen(false);
                // 关闭模态框时标记为已变更(假设用户可能已修改)
                setHasConfigChanged(true);
              }}
              refresh={getModelList}
              modelService={modelService}
              language='zh-CN'
              messageComponent={message}
              is_close_model_remark={true}
              addingModelTutorialURL='https://pandawiki.docs.baizhi.cloud/node/019a160d-0528-736a-b88e-32a2d1207f3e'
            />
          </Suspense>
        )}
      </Stack>
    );
  },
);

export default ModelConfig;
