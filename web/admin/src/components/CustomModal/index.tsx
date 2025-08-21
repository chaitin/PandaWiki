import { useEffect, useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { CusTabs, Icon, message, Modal } from '@ctzhian/ui';
import {
  DomainKnowledgeBaseDetail,
  getApiV1KnowledgeBaseDetail,
} from '@/request';
import { DomainAppDetailResp } from '@/request/types';
import { getApiV1AppDetail, putApiV1App } from '@/request/App';
import { useAppSelector, useAppDispatch } from '@/store';
import { setAppPreviewData } from '@/store/slices/config';
import ComponentBar from './components/components/ComponentBar';
import ConfigBar from './components/config/ConfigBar';
import ShowContent from './components/ShowContent';
import HeaderConfig from './components/config/HeaderConfig';
import FooterConfig from './components/config/FooterConfig';

interface CustomModalProps {
  open: boolean;
  onCancel: () => void;
}

export interface Component {
  name: string;
  title: string;
  component: React.ComponentType<any>;
}

const CustomModal = ({ open, onCancel }: CustomModalProps) => {
  const dispatch = useAppDispatch();
  const { kb_id } = useAppSelector(state => state.config);
  const [kb, setKb] = useState<DomainKnowledgeBaseDetail | null>(null);
  const [info, setInfo] = useState<DomainAppDetailResp>();
  const [renderMode, setRenderMode] = useState<'pc' | 'mobile'>('pc');
  const [curComponent, setCurComponent] = useState<string>('header');
  const [isEdit, setIsEdit] = useState(false);
  const [scale, setScale] = useState(1);
  const [components, setComponents] = useState<Component[]>([
    {
      name: 'header',
      title: '顶部导航',
      component: HeaderConfig,
    },
    {
      name: 'footer',
      title: '底部导航',
      component: FooterConfig,
    },
  ]);
  const appPreviewData = useAppSelector(state => state.config.appPreviewData);

  const refresh = (value: DomainAppDetailResp) => {
    if (!info) return;
    const newInfo = {
      ...info,
      ...value,
    };
    setInfo(newInfo);
  };
  const getKb = () => {
    if (!kb_id) return;
    getApiV1KnowledgeBaseDetail({ id: kb_id }).then(res => setKb(res));
  };
  const getInfo = async () => {
    if (!kb) return;
    const res = await getApiV1AppDetail({ kb_id: kb.id!, type: '1' });
    setInfo(res);
    dispatch(setAppPreviewData(res));
  };
  const onSubmit = () => {
    if (!info || !appPreviewData) return;
    putApiV1App(
      { id: info.id! },
      // @ts-expect-error 类型不匹配
      { settings: { ...info.settings, ...appPreviewData.settings }, kb_id },
    ).then(() => {
      // @ts-expect-error 类型不匹配
      refresh(appPreviewData);
      message.success('保存成功');
      setIsEdit(false);
    });
  };
  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 2)); // 最大放大到200%
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.5)); // 最小缩小到50%
  };

  const resetZoom = () => {
    setScale(1);
  };
  useEffect(() => {
    if (!info) return;
    dispatch(setAppPreviewData(info));
    setComponents([
      {
        name: 'header',
        component: HeaderConfig,
        title: '顶部导航',
      },
      {
        name: 'footer',
        title: '底部导航',
        component: FooterConfig,
      },
    ]);
  }, [info]);

  useEffect(() => {
    if (kb_id && open) getKb();
  }, [kb_id, open]);
  useEffect(() => {
    if (open) getInfo();
  }, [kb, open]);

  return (
    <>
      {open && (
        <Modal
          open={open}
          onCancel={onCancel}
          width={'95%'}
          footer={null}
          style={{}}
          sx={{
            maxWidth: 'none',
            '& .MuiDialog-paper': {
              maxWidth: 'none',
              bgcolor: '#FFFFFF',
              padding: '0px',
              margin: 0,
              maxHeight: '90%',
              height: '90%',
            },
            '& .MuiDialogContent-root': {
              maxWidth: 'none',
              padding: '0px',
              height: '100%',
              display: 'flex',
              overflow: 'hidden',
            },
            '& .MuiDialogTitle-root': {
              padding: '0px',
            },
          }}
          title={
            <Stack
              direction='row'
              gap={2}
              sx={{
                width: '100%',
                bgcolor: '#FFFFFF',
                height: '64px',
                borderBottom: '1px solid #ECEEF1',
                alignItems: 'center',
                paddingLeft: '20px',
              }}
            >
              <Typography
                sx={{
                  fontSize: '16px',
                  lineHeight: '24px',
                  fontWeight: 600,
                }}
              >
                自定义页面
              </Typography>
              <Button
                variant='contained'
                size='small'
                disabled={!isEdit}
                onClick={onSubmit}
              >
                保存
              </Button>

              {appPreviewData && (
                <Stack
                  direction='row'
                  gap={1}
                  alignItems='center'
                  sx={{
                    marginLeft: 'auto',
                    marginRight: '80px',
                    marginTop: '6px',
                  }}
                >
                  <CusTabs
                    list={[
                      {
                        label: (
                          <Icon type='icon-PCduan' sx={{ height: '32px' }} />
                        ),
                        value: 'pc',
                      },
                      {
                        label: (
                          <Icon
                            type='icon-yidongduan'
                            sx={{ height: '32px' }}
                          />
                        ),
                        value: 'mobile',
                      },
                    ]}
                    value={renderMode}
                    onChange={value => {
                      if (value === 'pc' || value === 'mobile') {
                        setRenderMode(value);
                      }
                    }}
                  ></CusTabs>
                  <Stack direction='row' gap={1}>
                    <Button
                      variant='outlined'
                      size='small'
                      onClick={zoomOut}
                      sx={{ minWidth: '30px', padding: '4px' }}
                    >
                      -
                    </Button>
                    <Button
                      variant='outlined'
                      size='small'
                      onClick={resetZoom}
                      sx={{ minWidth: '60px', padding: '4px' }}
                    >
                      {Math.round(scale * 100)}%
                    </Button>
                    <Button
                      variant='outlined'
                      size='small'
                      onClick={zoomIn}
                      sx={{ minWidth: '30px', padding: '4px' }}
                    >
                      +
                    </Button>
                  </Stack>
                </Stack>
              )}
            </Stack>
          }
        >
          <Stack
            direction={'row'}
            gap={2}
            sx={{
              width: '100%',
              minWidth: 0,
              bgcolor: 'background.paper2',
              minHeight: 0,
              height: '100%',
            }}
          >
            <ComponentBar
              components={components}
              setComponents={setComponents}
              curComponent={curComponent}
              setCurComponent={setCurComponent}
              setIsEdit={setIsEdit}
            ></ComponentBar>
            {appPreviewData ? (
              <ShowContent
                curComponent={
                  components.find(item => item.name === curComponent)!
                }
                setCurComponent={setCurComponent}
                renderMode={renderMode}
                scale={scale}
              ></ShowContent>
            ) : (
              <Stack sx={{ width: '100%' }}>loading...</Stack>
            )}

            <ConfigBar
              curComponent={curComponent}
              components={components}
              setIsEdit={setIsEdit}
              data={info as any}
              isEdit={isEdit}
            ></ConfigBar>
          </Stack>
        </Modal>
      )}
    </>
  );
};
export default CustomModal;
