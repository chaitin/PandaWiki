import HelpCenter from '@/assets/json/help-center.json';
import IconUpgrade from '@/assets/json/upgrade.json';
import LottieIcon from "@/components/LottieIcon";
import { EditionType } from '@/constant/enums';
import { useAppSelector } from '@/store';
import { Box, Stack, Tooltip } from "@mui/material";
import { Icon } from 'ct-mui';
import { useEffect, useState } from 'react';
import packageJson from '../../../package.json';
import AuthTypeModal from './AuthTypeModal';

const Version = () => {
  const { license } = useAppSelector(state => state.config)
  const curVersion = import.meta.env.VITE_APP_VERSION || packageJson.version
  const [latestVersion, setLatestVersion] = useState<string | undefined>(undefined)
  const [typeOpen, setTypeOpen] = useState(false)

  useEffect(() => {
    fetch('https://release.baizhi.cloud/panda-wiki/version.txt')
      .then(response => response.text())
      .then(data => {
        setLatestVersion(data)
      })
      .catch(error => {
        console.error(error)
        setLatestVersion('')
      })
  }, [])

  if (latestVersion === undefined) return null

  return (
    <>
      <Stack justifyContent={'center'} gap={0.5} sx={{
        borderTop: '1px solid',
        borderColor: 'divider',
        pt: 2,
        mt: 1,
        cursor: 'pointer',
        color: 'text.primary',
        fontSize: 12,
      }} onClick={() => setTypeOpen(true)}>
        <Stack direction={'row'} gap={0.5}>
          <Box sx={{ width: 30, color: 'text.auxiliary' }}>型号</Box>
          <Icon type='icon-banben' sx={{ fontSize: 16, color: 'success.main' }} />
          {EditionType[license.edition as keyof typeof EditionType].text}
        </Stack>
        <Stack direction={'row'} gap={0.5}>
          <Box sx={{ width: 30, color: 'text.auxiliary' }}>版本</Box>
          <Box sx={{ whiteSpace: 'nowrap' }}>{curVersion}</Box>
          {latestVersion !== `v${curVersion}` && <Tooltip
            placement='top'
            arrow
            title={latestVersion === '' ? '无法获取最新版本' : '检测到新版本，点击查看'}
          >
            <Box>
              <LottieIcon
                id='version'
                src={latestVersion === '' ? HelpCenter : IconUpgrade}
                style={{ width: 16, height: 16 }}
              />
            </Box>
          </Tooltip>}
        </Stack>
      </Stack>
      <AuthTypeModal
        open={typeOpen}
        onClose={() => setTypeOpen(false)}
        latestVersion={latestVersion}
        curVersion={curVersion}
      />
    </>
  )
}

export default Version;