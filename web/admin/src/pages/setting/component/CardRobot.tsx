import { DomainKnowledgeBaseDetail } from '@/request/types';
import { Box } from '@mui/material';
import CardRobotWebComponent from './CardRobot/WebComponent';
import CardRobotApi from './CardRobotApi';
import CardRobotDing from './CardRobotDing';
import CardRobotDiscord from './CardRobotDiscord';
import CardRobotFeishu from './CardRobotFeishu';
import CardRobotLark from './CardRobotLark';
import CardRobotWechatOfficeAccount from './CardRobotWechatOfficeAccount';
import CardRobotWecom from './CardRobotWecom';
import CardRobotWecomAIBot from './CardRobotWecomAIBot';
import CardRobotWecomService from './CardRobotWecomService';

const CardRobot = ({
  kb,
  url,
}: {
  kb: DomainKnowledgeBaseDetail;
  url: string;
}) => {
  return (
    <Box
      sx={{
        width: 1000,
        margin: 'auto',
        pb: 4,
      }}
    >
      <CardRobotWebComponent kb={kb} />
      <CardRobotApi kb={kb} url={url} />
      <CardRobotDing kb={kb} />
      <CardRobotWechatOfficeAccount kb={kb} url={url} />
      <CardRobotWecom kb={kb} url={url} />
      <CardRobotWecomAIBot kb={kb} url={url} />
      <CardRobotWecomService kb={kb} url={url} />
      <CardRobotFeishu kb={kb} />
      <CardRobotLark kb={kb} url={url} />
      <CardRobotDiscord kb={kb} />
    </Box>
  );
};

export default CardRobot;
