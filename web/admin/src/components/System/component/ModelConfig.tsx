import ErrorJSON from '@/assets/json/error.json';
import Card from '@/components/Card';
import { ModelProvider } from '@/constant/enums';
import { AddModelForm } from '@ctzhian/modelkit';
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
  useMemo,
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
    const [modelModalLoading, setModelModalLoading] = useState(false);
    const [hasAutoSwitched, setHasAutoSwitched] = useState(false);
    const [tempMode, setTempMode] = useState<'auto' | 'manual'>('manual');
    const [savedMode, setSavedMode] = useState<'auto' | 'manual'>('manual');
    const [isSaving, setIsSaving] = useState(false);
    const [initialApiKey, setInitialApiKey] = useState('');
    const [initialChatModel, setInitialChatModel] = useState('');
    const [hasConfigChanged, setHasConfigChanged] = useState(false);

    const [modelData, setModelData] = useState<Record<string, any>>({
      chat: chatModelData,
      embedding: embeddingModelData,
      rerank: rerankModelData,
      analysis: analysisModelData,
      'analysis-vl': analysisVLModelData,
    });

    const cacheModelData = useRef<Record<string, any>>({});

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

    const onModelModalOk = async (value: AddModelForm) => {
      setModelModalLoading(true);
      const res = await onCheckModel(value).finally(() => {
        setModelModalLoading(false);
      });
      if (!res) {
        return;
      }
      const currentModelData = {
        provider: value.provider,
        model: value.model_name,
        api_key: value.api_key,
        api_header: value.api_header,
        base_url: value.base_url,
        api_version: value.api_version,
        type: value.model_type,
      };

      switch (addType) {
        case 'chat':
          cacheModelData.current['chat'] = value;
          setModelData({
            ...modelData,
            chat: {
              ...currentModelData,
              id: chatModelData?.id,
            },
          });
          break;
        case 'embedding':
          cacheModelData.current['embedding'] = value;
          setModelData({
            ...modelData,
            embedding: {
              ...currentModelData,
              id: embeddingModelData?.id,
            },
          });
          break;
        case 'rerank':
          cacheModelData.current['rerank'] = value;
          setModelData({
            ...modelData,
            rerank: {
              ...currentModelData,
              id: rerankModelData?.id,
            },
          });
          break;
        case 'analysis':
          cacheModelData.current['analysis'] = value;
          setModelData({
            ...modelData,
            analysis: {
              ...currentModelData,
              id: analysisModelData?.id,
            },
          });
          break;
        case 'analysis-vl':
          cacheModelData.current['analysis-vl'] = value;
          setModelData({
            ...modelData,
            'analysis-vl': {
              ...currentModelData,
              id: analysisVLModelData?.id,
            },
          });
          break;
      }

      setAddOpen(false);
      // 标记配置已变更
      setHasConfigChanged(true);
    };

    const getProcessedUrl = (
      baseUrl: string,
      provider: keyof typeof ModelProvider,
    ) => {
      if (!ModelProvider[provider]?.urlWrite) {
        return baseUrl;
      }
      if (baseUrl.endsWith('#')) {
        return baseUrl;
      }
      const forceUseOriginalHost = () => {
        if (baseUrl.endsWith('/')) {
          baseUrl = baseUrl.slice(0, -1);
          return true;
        }
        if (/\/v\d+$/.test(baseUrl)) {
          return true;
        }
        return baseUrl.endsWith('volces.com/api/v3');
      };

      return forceUseOriginalHost() ? baseUrl : `${baseUrl}/v1`;
    };

    const onCheckModel = async (value: AddModelForm) => {
      let header = '';
      if (value.api_header_key && value.api_header_value) {
        header = value.api_header_key + '=' + value.api_header_value;
      }
      return modelService
        .checkModel({
          model_type: value.model_type,
          model_name: value.model_name,
          api_key: value.api_key,
          // @ts-expect-error 忽略类型错误
          base_url: getProcessedUrl(value.base_url, value.provider),
          api_version: value.api_version,

          provider: value.provider,
          api_header: value.api_header || header,
          param: {
            context_window: value.context_window_size,
            max_tokens: value.max_output_tokens,
            r1_enabled: value.enable_r1_params,
            support_images: value.support_image,
            support_computer_use: value.support_compute,
            support_prompt_cache: value.support_prompt_caching,
            temperature: value.temperature,
          },
        })
        .then(res => {
          if (res.error) {
            message.error(value.model_name + ' 检查模型失败');
            return Promise.reject(res.error);
          }
          return value;
        });
    };

    const onSubmitModelConfig = (value: AddModelForm, id: string = '') => {
      let header = '';
      if (value.api_header_key && value.api_header_value) {
        header = value.api_header_key + '=' + value.api_header_value;
      }
      if (id) {
        return modelService
          .updateModel({
            api_key: value.api_key,
            model_type: value.model_type,
            // @ts-expect-error 忽略类型错误
            base_url: getProcessedUrl(value.base_url, value.provider),
            model_name: value.model_name,
            api_header: value.api_header || header,
            api_version: value.api_version,
            id: id,
            provider: value.provider as Exclude<typeof value.provider, 'Other'>,
            show_name: value.show_name,
            // 添加高级设置字段到 param 对象中
            param: {
              context_window: value.context_window_size,
              max_tokens: value.max_output_tokens,
              r1_enabled: value.enable_r1_params,
              support_images: value.support_image,
              support_computer_use: value.support_compute,
              support_prompt_cache: value.support_prompt_caching,
              temperature: value.temperature,
            },
          })
          .then(res => {
            if (res.error) {
              message.error(value.model_name + ' 修改模型失败');
            } else {
              message.success(value.model_name + ' 修改成功');
            }
          })
          .catch(res => {
            message.error(value.model_name + ' 修改模型失败');
          });
      } else {
        return modelService
          .createModel({
            model_type: value.model_type,
            api_key: value.api_key,
            // @ts-expect-error 忽略类型错误
            base_url: getProcessedUrl(value.base_url, value.provider),
            model_name: value.model_name,
            api_header: value.api_header || header,
            provider: value.provider as Exclude<typeof value.provider, 'Other'>,
            show_name: value.show_name,
            // 添加高级设置字段到 param 对象中
            param: {
              context_window: value.context_window_size,
              max_tokens: value.max_output_tokens,
              r1_enabled: value.enable_r1_params,
              support_images: value.support_image,
              support_computer_use: value.support_compute,
              support_prompt_cache: value.support_prompt_caching,
              temperature: value.temperature,
            },
          })
          .then(res => {
            if (res.error) {
              message.error(value.model_name + ' 添加模型失败');
            } else {
              message.success(value.model_name + ' 添加成功');
            }
          })
          .catch(res => {
            message.error(value.model_name + ' 添加模型失败');
          });
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

    useEffect(() => {
      setModelData({
        chat: chatModelData,
        embedding: embeddingModelData,
        rerank: rerankModelData,
        analysis: analysisModelData,
        'analysis-vl': analysisVLModelData,
      });
    }, [
      chatModelData,
      embeddingModelData,
      rerankModelData,
      analysisModelData,
      analysisVLModelData,
    ]);

    const handleSave = async () => {
      if (!showSaveBtn) {
        return await performSave();
      }

      if (tempMode !== savedMode || hasConfigChanged) {
        // 检测是否切换了模式
        const isModeChanged = tempMode !== savedMode;
        // 检测向量模型是否变更 (比较 provider + model 组合)
        const isEmbeddingModelChanged = !!cacheModelData.current['embedding'];

        // 如果切换了模式或修改了向量模型,需要确认
        if (isModeChanged || isEmbeddingModelChanged) {
          Modal.confirm({
            title: '确认操作',
            content: '此操作会触发重新学习，请确认是否继续？',
            onOk: async () => {
              await performSave();
            },
            okText: '确认',
            cancelText: '取消',
          });
        } else {
          await performSave();
        }
      }
    };

    const performSave = async () => {
      setIsSaving(true);
      const modelConfigList = Object.keys(cacheModelData.current);
      if (modelConfigList.length > 0) {
        await Promise.all(
          modelConfigList.map(async modelType => {
            const model = cacheModelData.current[modelType];
            return onSubmitModelConfig(model, modelData[modelType].id);
          }),
        );
      }

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

        if (showSaveBtn && modelConfigList.length === 0) {
          message.success(
            tempMode === 'auto'
              ? '已切换为自动配置模式'
              : '已切换为手动配置模式',
          );
        }
        cacheModelData.current = {};
        await getModelList(); // 刷新模型列表
      } finally {
        setIsSaving(false);
      }
    };

    const IconModel = modelData.chat
      ? ModelProvider[modelData.chat.provider as keyof typeof ModelProvider]
          .icon
      : null;

    const IconEmbeddingModel = modelData.embedding
      ? ModelProvider[
          modelData.embedding.provider as keyof typeof ModelProvider
        ].icon
      : null;

    const IconRerankModel = modelData.rerank
      ? ModelProvider[modelData.rerank.provider as keyof typeof ModelProvider]
          .icon
      : null;

    const IconAnalysisModel = modelData.analysis
      ? ModelProvider[modelData.analysis.provider as keyof typeof ModelProvider]
          .icon
      : null;

    const IconAnalysisVLModel = modelData['analysis-vl']
      ? ModelProvider[
          modelData['analysis-vl'].provider as keyof typeof ModelProvider
        ].icon
      : null;

    const modelModalChatData = useMemo(() => {
      return convertLocalModelToUIModel(modelData.chat);
    }, [modelData.chat]);

    const modelModalEmbeddingData = useMemo(() => {
      return convertLocalModelToUIModel(modelData.embedding);
    }, [modelData.embedding]);

    const modelModalRerankData = useMemo(() => {
      return convertLocalModelToUIModel(modelData.rerank);
    }, [modelData.rerank]);

    const modelModalAnalysisData = useMemo(() => {
      return convertLocalModelToUIModel(modelData.analysis);
    }, [modelData.analysis]);

    const modelModalAnalysisVLData = useMemo(() => {
      return convertLocalModelToUIModel(modelData['analysis-vl']);
    }, [modelData['analysis-vl']]);

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
            <Stack gap={1} direction='row' alignItems='center'>
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
              {showSaveBtn && (
                <Box
                  sx={{
                    fontSize: 12,
                    color: 'text.tertiary',
                    ml: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <Box
                    component='span'
                    sx={{
                      color: 'warning.main',
                      fontWeight: 'bold',
                    }}
                  >
                    提示：
                  </Box>
                  切换配置模式或修改向量模型会触发重新学习
                </Box>
              )}
            </Stack>
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
                    {modelData.chat ? (
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
                            modelData.chat
                              .provider as keyof typeof ModelProvider
                          ].cn ||
                            ModelProvider[
                              modelData.chat
                                .provider as keyof typeof ModelProvider
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
                          {modelData.chat.model}
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
                  {modelData.chat ? (
                    <Box
                      sx={{
                        display: 'inline-block',
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
                  {modelData.chat ? '修改' : '配置'}
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
                    {modelData.embedding ? (
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
                            modelData.embedding
                              .provider as keyof typeof ModelProvider
                          ].cn ||
                            ModelProvider[
                              modelData.embedding
                                .provider as keyof typeof ModelProvider
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
                          {modelData.embedding.model}
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
                  {modelData.embedding ? (
                    <Box
                      sx={{
                        display: 'inline-block',
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
                  {modelData.embedding ? '修改' : '配置'}
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
                    {modelData.rerank ? (
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
                            modelData.rerank
                              .provider as keyof typeof ModelProvider
                          ].cn ||
                            ModelProvider[
                              modelData.rerank
                                .provider as keyof typeof ModelProvider
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
                          {modelData.rerank.model}
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
                  {modelData.rerank ? (
                    <Box
                      sx={{
                        display: 'inline-block',
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
                  {modelData.rerank ? '修改' : '配置'}
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
                    {modelData.analysis ? (
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
                            modelData.analysis
                              .provider as keyof typeof ModelProvider
                          ].cn ||
                            ModelProvider[
                              modelData.analysis
                                .provider as keyof typeof ModelProvider
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
                          {modelData.analysis.model}
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
                  {modelData.analysis ? (
                    <Box
                      sx={{
                        display: 'inline-block',
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
                  {modelData.analysis ? '修改' : '配置'}
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
                    {modelData['analysis-vl'] ? (
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
                            modelData['analysis-vl']
                              .provider as keyof typeof ModelProvider
                          ].cn ||
                            ModelProvider[
                              modelData['analysis-vl']
                                .provider as keyof typeof ModelProvider
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
                          {modelData['analysis-vl'].model}
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
                    {modelData['analysis-vl'] &&
                      modelData['analysis-vl'].id && (
                        <Switch
                          size='small'
                          checked={modelData['analysis-vl'].is_active}
                          onChange={() => {
                            putApiV1Model({
                              ...modelData['analysis-vl'],
                              is_active: !modelData['analysis-vl'].is_active,
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
                  {modelData['analysis-vl'] ? (
                    <Box
                      sx={{
                        display: 'inline-block',
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
                  {modelData['analysis-vl'] ? '修改' : '配置'}
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
              onOk={onModelModalOk}
              loading={modelModalLoading}
              data={
                addType === 'chat'
                  ? modelModalChatData
                  : addType === 'embedding'
                    ? modelModalEmbeddingData
                    : addType === 'rerank'
                      ? modelModalRerankData
                      : addType === 'analysis'
                        ? modelModalAnalysisData
                        : addType === 'analysis-vl'
                          ? modelModalAnalysisVLData
                          : null
              }
              onClose={() => {
                setAddOpen(false);
              }}
              refresh={() => {}}
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
