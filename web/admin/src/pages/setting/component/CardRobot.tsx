import { KnowledgeBaseListItem } from '@/api'
import Card from "@/components/Card"
import { Box, Divider } from "@mui/material"
import CardRobotApi from './CardRobotApi'
import CardRobotDing from './CardRobotDing'
import CardRobotDiscord from './CardRobotDiscord'
import CardRobotFeishu from './CardRobotFeishu'
import CardRobotWebComponent from './CardRobotWebComponent'
import CardRobotWechatOfficeAccount from './CardRobotWechatOfficeAccount'
import CardRobotWecom from './CardRobotWecom'
import CardRobotWecomService from './CardRobotWecomService'

const CardRobot = ({ kb, url }: { kb: KnowledgeBaseListItem, url: string }) => {
  return <Card>
    <Box sx={{ fontWeight: 'bold', px: 2, py: 1.5, bgcolor: 'background.paper2' }}>问答机器人</Box>
    <CardRobotWebComponent kb={kb} />
    <Divider sx={{ my: 2 }} />
    <CardRobotApi kb={kb} />
    <Divider sx={{ my: 2 }} />
    <CardRobotDing kb={kb} />
    <Divider sx={{ my: 2 }} />
    <CardRobotFeishu kb={kb} />
    <Divider sx={{ my: 2 }} />
    <CardRobotWechatOfficeAccount kb={kb} url={url} />
    <Divider sx={{ my: 2 }} />
    <CardRobotWecom kb={kb} url={url} />
    <Divider sx={{ my: 2 }} />
    <CardRobotWecomService kb={kb} url={url} />
    <Divider sx={{ my: 2 }} />
    <CardRobotDiscord kb={kb} />
  </Card>
}

export default CardRobot
