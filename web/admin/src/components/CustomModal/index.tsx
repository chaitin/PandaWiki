import { ReactNode, useEffect, useState } from 'react';
import { Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { Icon, Message, Modal } from 'ct-mui';
import {
  DomainKnowledgeBaseDetail,
  getApiV1KnowledgeBaseDetail,
} from '@/request';
import { AppDetail, getAppDetail, HeaderSetting, updateAppDetail } from '@/api';
import { useAppSelector, useAppDispatch } from '@/store';
import { setAppPreviewData } from '@/store/slices/config';
import ComponentBar from './component/ComponentBar';
import ConfigBar from './component/ConfigBar';
import ShowContent from './component/ShowContent';
import HeaderConfig from './component/HeaderConfig';

interface CustomModalProps {
  open: boolean;
  onCancel: () => void;
}

export interface Component {
  name: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
}

const CustomModal = ({ open, onCancel }: CustomModalProps) => {
  const dispatch = useAppDispatch();
  const { kb_id } = useAppSelector((state) => state.config);
  const [kb, setKb] = useState<DomainKnowledgeBaseDetail | null>(null);
  const [info, setInfo] = useState<AppDetail | null>(null);

  const [components, setComponents] = useState<Component[]>([
    {
      name: 'header',
      component: HeaderConfig,
      props: {
        id: info?.id,
        data: info,
      },
    },
    {
      name: '1',
      component: () => null,
    },
  ]);
  const [curComponent, setCurComponent] = useState<string>('header');
  const [isEdit, setIsEdit] = useState(false);
  const appPreviewData = useAppSelector((state) => state.config.appPreviewData);

  const refresh = (value: AppDetail) => {
    if (!info) return;
    const newInfo = {
      ...info,
      ...value,
    };
    setInfo(newInfo);
  };
  const getKb = () => {
    if (!kb_id) return;
    getApiV1KnowledgeBaseDetail({ id: kb_id }).then((res) => setKb(res));
  };
  const getInfo = async () => {
    if (!kb) return;
    const res = await getAppDetail({ kb_id: kb.id!, type: 1 });
    setInfo(res);
    setAppPreviewData(res);
    console.log(res);
  };
  const onSubmit = () => {
    if (!info || !appPreviewData) return;
    updateAppDetail(
      { id: info.id },
      { settings: { ...info.settings, ...appPreviewData.settings } }
    ).then(() => {
      refresh(appPreviewData);
      Message.success('保存成功');
      setIsEdit(false);
    });
  };
  useEffect(() => {
    if (!info) return;

    dispatch(setAppPreviewData(info));

    setComponents([
      {
        name: 'header',
        component: HeaderConfig,
        props: {
          id: info.id,
          data: info,
          setIsEdit,
        },
      },
      // {
      //   name: 'footer',
      //   component: () => null,
      // },
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
              {/* 
              <Button size='small' variant='contained'>
                我是还没有实现的功能 预览 主题 保存 移动端桌面端预览切换
              </Button> */}
            </Stack>
          }
        >
          <Stack
            direction={'row'}
            gap={2}
            sx={{
              width: '100%',
              bgcolor: 'background.paper0',
              flex: 1,
              minHeight: 0,
            }}
          >
            <ComponentBar
              components={components}
              setComponents={setComponents}
              curComponent={curComponent}
              setCurComponent={setCurComponent}
            ></ComponentBar>
            <ShowContent
              curComponent={curComponent}
              setCurComponent={setCurComponent}
            ></ShowContent>
            <ConfigBar
              curComponent={curComponent}
              components={components}
              setIsEdit={setIsEdit}
            ></ConfigBar>
          </Stack>
        </Modal>
      )}
    </>
  );
};
export default CustomModal;
