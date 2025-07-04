import { KnowledgeBaseListItem } from '@/api'
import PluginLogo from '@/assets/images/plugin.png'
import Card from "@/components/Card"
import { Box, Divider, Stack, Switch } from "@mui/material"
import { Message } from 'ct-mui'
import CardRebotApi from './CardRebotApi'
import CardRebotDing from './CardRebotDing'
import CardRebotFeishu from './CardRebotFeishu'
import CardRebotWecom from './CardRebotWecom'
import CardRebotWecomService from './CardRebotWecomService'
import CardRebotDiscord from './CardRebotDiscord'

const CardRebot = ({ kb, url }: { kb: KnowledgeBaseListItem, url: string }) => {
  const AppList = {
    2: {
      name: '网页挂件机器人',
      icon: PluginLogo,
      configDisabled: true,
    },
  }
  return <Card>
    <Box sx={{ fontWeight: 'bold', px: 2, py: 1.5, bgcolor: 'background.paper2' }}>问答机器人</Box>
    <CardRebotApi kb={kb} />
    <Divider sx={{ my: 2 }} />
    <CardRebotDing kb={kb} />
    <Divider sx={{ my: 2 }} />
    <CardRebotFeishu kb={kb} />
    <Divider sx={{ my: 2 }} />
    <CardRebotWecom kb={kb} url={url} />
    <Divider sx={{ my: 2 }} />
    <CardRebotWecomService kb={kb} url={url} />
    <Divider sx={{ my: 2 }} />
    <CardRebotDiscord kb={kb} />
    <Divider sx={{ my: 2 }} />
    {Object.values(AppList).map((value, index) => <Box key={index}>
      <Stack direction='row' alignItems={'center'} justifyContent={'space-between'} sx={{ m: 2 }}>
        <Box sx={{ fontWeight: 'bold' }}>{value.name}</Box>
        <Switch checked={false} onChange={() => {
          Message.warning('敬请期待')
        }} />
      </Stack>
    </Box>)}
  </Card>
}

export default CardRebot
