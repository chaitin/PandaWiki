import { getApiV1AppDetail } from '@/request/App';
import {
  DomainAppDetailResp,
  DomainKnowledgeBaseDetail,
} from '@/request/types';
import { Box } from '@mui/material';
import { useEffect, useState } from 'react';
import CardCustom from './CardCustom';
import CardListen from './CardListen';
import CardStyle from './CardStyle';

interface CardWebProps {
  kb: DomainKnowledgeBaseDetail;
  refresh: () => void;
}

const CardWeb = ({ kb, refresh }: CardWebProps) => {
  const [info, setInfo] = useState<DomainAppDetailResp | null>(null);

  const getInfo = async () => {
    const res = await getApiV1AppDetail({ kb_id: kb.id!, type: '1' });
    setInfo(res);
  };

  useEffect(() => {
    getInfo();
  }, [kb]);

  if (!info?.id) return <></>;

  return (
    <Box
      sx={{
        width: 1000,
        margin: 'auto',
        pb: 4,
      }}
    >
      <CardCustom
        kb={kb}
        refresh={value => {
          setInfo({
            ...info,
            settings: {
              ...info.settings,
              ...value,
            },
          });
        }}
        info={info}
      />
      <CardStyle
        id={info.id}
        data={info}
        refresh={value => {
          setInfo({
            ...info,
            settings: {
              ...info.settings,
              theme_mode: value.theme_mode,
              theme_and_style: {
                ...info.settings?.theme_and_style,
                doc_width: value.doc_width,
                bg_image: value.bg_image,
              },
            },
          });
        }}
      />
      <CardListen kb={kb} refresh={refresh} />
    </Box>
  );
};
export default CardWeb;
