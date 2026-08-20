import { DomainKnowledgeBaseDetail } from '@/request/types';
import { Box } from '@mui/material';
import CardRobotWebComponent from './CardRobot/WebComponent';

const CardRobot = ({ kb }: { kb: DomainKnowledgeBaseDetail; url: string }) => {
  return (
    <Box
      sx={{
        width: 1000,
        margin: 'auto',
        pb: 4,
      }}
    >
      <CardRobotWebComponent kb={kb} />
    </Box>
  );
};

export default CardRobot;
