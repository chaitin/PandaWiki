import { activeLicense, getLicenseInfo } from '@/api';
import { postApiV1License } from '@/request/pro/License';
import { PostApiV1LicensePayload } from '@/request/pro/types';
import HelpCenter from '@/assets/json/help-center.json';
import Takeoff from '@/assets/json/takeoff.json';
import IconUpgrade from '@/assets/json/upgrade.json';
import Upload from '@/components/UploadFile/Drag';
import { EditionType } from '@/constant/enums';
import { useAppDispatch, useAppSelector } from '@/store';
import { setLicense } from '@/store/slices/config';
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { CusTabs, Icon, Message, Modal } from 'ct-mui';
import dayjs from 'dayjs';
import { useState } from 'react';
import LottieIcon from '../LottieIcon';

interface AuthTypeModalProps {
  open: boolean;
  onClose: () => void;
  curVersion: string;
  latestVersion: string;
}

const AuthTypeModal = ({
  open,
  onClose,
  curVersion,
  latestVersion,
}: AuthTypeModalProps) => {
  const dispatch = useAppDispatch();
  const { license } = useAppSelector(state => state.config);

  const [selected, setSelected] = useState<'file' | 'code'>(
    license.edition === 2 ? 'file' : 'code',
  );
  const [authVersion, setAuthVersion] = useState<'contributor' | 'enterprise'>(
    license.edition === 2 ? 'enterprise' : 'contributor',
  );
  const [updateOpen, setUpdateOpen] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | undefined>(undefined);

  const handleSubmit = () => {
    const params: PostApiV1LicensePayload = {
      license_edition: authVersion,
      license_type: selected,
      license_code: code,
      license_file: file,
    };
    setLoading(true);

    postApiV1License(params)
      .then(() => {
        Message.success('激活成功');
        setUpdateOpen(false);
        setCode('');
        setFile(undefined);

        getLicenseInfo().then(res => {
          dispatch(setLicense(res));
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <>
      <Modal
        open={open}
        footer={null}
        title='关于 PandaWiki'
        onCancel={onClose}
      >
        <Stack gap={1} sx={{ fontSize: 14, lineHeight: '32px' }}>
          <Stack direction={'row'} alignItems={'center'}>
            <Box sx={{ width: 120, flexShrink: 0 }}>当前版本</Box>
            <Stack direction={'row'} alignItems={'center'} gap={2}>
              <Box sx={{ fontFamily: 'GBold', minWidth: 50 }}>{curVersion}</Box>
              {latestVersion === `v${curVersion}` ? (
                <Box sx={{ color: 'text.auxiliary', fontSize: 12 }}>
                  已是最新版本，无需更新
                </Box>
              ) : (
                <Button
                  size='small'
                  startIcon={
                    <Box>
                      <LottieIcon
                        id='version'
                        src={latestVersion === '' ? HelpCenter : IconUpgrade}
                        style={{ width: 16, height: 16, display: 'flex' }}
                      />
                    </Box>
                  }
                  onClick={() => {
                    window.open(
                      'https://pandawiki.docs.baizhi.cloud/node/01971615-05b8-7924-9af7-15f73784f893',
                    );
                  }}
                >
                  立即更新
                </Button>
              )}
            </Stack>
          </Stack>
          <Stack direction={'row'} alignItems={'center'}>
            <Box sx={{ width: 120, flexShrink: 0 }}>产品型号</Box>
            <Stack direction={'row'} alignItems={'center'} gap={2}>
              <Box sx={{ minWidth: 50 }}>
                {EditionType[license.edition as keyof typeof EditionType].text}
              </Box>
              {license.edition === 0 ? (
                <Stack direction={'row'} gap={2}>
                  <Button
                    size='small'
                    startIcon={
                      <Box>
                        <LottieIcon
                          id='version'
                          src={Takeoff}
                          style={{ width: 16, height: 16, display: 'flex' }}
                        />
                      </Box>
                    }
                    onClick={() => setUpdateOpen(true)}
                  >
                    激活授权
                  </Button>
                  <Button
                    size='small'
                    startIcon={
                      <Box>
                        <LottieIcon
                          id='consult'
                          src={HelpCenter}
                          style={{ width: 16, height: 16, display: 'flex' }}
                        />
                      </Box>
                    }
                    onClick={() => {
                      window.open('https://baizhi.cloud/consult');
                    }}
                  >
                    商务咨询
                  </Button>
                </Stack>
              ) : (
                <Stack direction={'row'} gap={2}>
                  <Button
                    size='small'
                    startIcon={
                      <Box>
                        <LottieIcon
                          id='version'
                          src={Takeoff}
                          style={{ width: 16, height: 16, display: 'flex' }}
                        />
                      </Box>
                    }
                    onClick={() => setUpdateOpen(true)}
                  >
                    切换授权
                  </Button>
                  <Button
                    size='small'
                    startIcon={
                      <Box>
                        <LottieIcon
                          id='consult'
                          src={HelpCenter}
                          style={{ width: 16, height: 16, display: 'flex' }}
                        />
                      </Box>
                    }
                    onClick={() => {
                      window.open('https://baizhi.cloud/consult');
                    }}
                  >
                    商务咨询
                  </Button>
                </Stack>
              )}
            </Stack>
          </Stack>
          {license.edition > 0 && (
            <Box>
              <Stack direction={'row'} alignItems={'center'}>
                <Box sx={{ width: 120, flexShrink: 0 }}>授权时间</Box>
                <Box>{dayjs.unix(license.started_at).format('YYYY-MM-DD')}</Box>
                <Box sx={{ mx: 1 }}>~</Box>
                <Box>{dayjs.unix(license.expired_at).format('YYYY-MM-DD')}</Box>
              </Stack>
              {dayjs.unix(license.expired_at).diff(dayjs(), 'day') < 0 && (
                <Box
                  sx={{
                    color: 'error.main',
                    ml: '120px',
                    fontSize: 13,
                    mt: -1,
                  }}
                >
                  授权已到期
                </Box>
              )}
            </Box>
          )}

          
        </Stack>
      </Modal>
      <Modal
        title='激活授权'
        open={updateOpen}
        onCancel={() => setUpdateOpen(false)}
        okText='确认激活'
        okButtonProps={{
          loading,
        }}
        width={500}
        onOk={handleSubmit}
      >
        <CusTabs
          sx={{ width: '100%', button: { width: '50%' } }}
          list={[
            { label: '在线激活', value: 'code', disabled: loading },
            { label: '离线激活', value: 'file', disabled: loading },
          ]}
          value={selected}
          change={(v: string) => setSelected(v as 'file' | 'code')}
        />
        <TextField
          select
          fullWidth
          sx={{ mt: 2 }}
          value={authVersion}
          onChange={e =>
            setAuthVersion(e.target.value as 'contributor' | 'enterprise')
          }
        >
          <MenuItem value='contributor'>联创版</MenuItem>
          <MenuItem value='enterprise'>企业版</MenuItem>
        </TextField>
        {selected === 'code' && (
          <TextField
            sx={{ mt: 2 }}
            label='请输入授权码'
            variant='outlined'
            value={code}
            fullWidth
            onChange={e => setCode(e.target.value)}
          />
        )}
        {selected === 'file' && (
          <Box sx={{ mt: 2 }}>
            <Upload
              file={file ? [file] : []}
              onChange={accept => setFile(accept[0])}
              type='drag'
              multiple={false}
              size={1024 * 1024}
            />
            {file && (
              <Stack
                direction={'row'}
                alignItems={'center'}
                justifyContent={'space-between'}
                sx={{
                  mt: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '10px',
                  px: 2,
                  py: 1,
                  fontSize: 14,
                }}
              >
                <Stack direction={'row'} alignItems={'center'} gap={1}>
                  <Icon type='icon-wenjian' />
                  {file.name}
                </Stack>
                <IconButton onClick={() => setFile(undefined)}>
                  <Icon type='icon-icon_tool_close' sx={{ fontSize: 16 }} />
                </IconButton>
              </Stack>
            )}
          </Box>
        )}
      </Modal>
    </>
  );
};

export default AuthTypeModal;
