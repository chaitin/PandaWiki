import { getAppDetail, KnowledgeBaseListItem } from "@/api"
import Card from "@/components/Card"
import { Box, Divider } from "@mui/material"
import { useEffect, useState } from "react"
import CardAuth from "./CardAuth"
import CardCatalog from "./CardCatalog"
import CardFooter from "./CardFooter"
import CardStyle from "./CardStyle"
import CardVisit from "./CardVisit"
import CardWebCustomCode from "./CardWebCustomCode"
import CardWebHeader from "./CardWebHeader"
import CardWebSEO from "./CardWebSEO"
import CardWebWelcome from "./CardWebWelcome"

interface CardWebProps {
  kb: KnowledgeBaseListItem
  refresh: () => void
}

const CardWeb = ({ kb, refresh }: CardWebProps) => {
  const [info, setInfo] = useState<any>({})

  const getInfo = async () => {
    const res = await getAppDetail({ kb_id: kb.id, type: 1 })
    setInfo(res)
  }

  useEffect(() => {
    getInfo()
  }, [kb])

  if (!info.id) return <></>

  return <Card>
    <Box sx={{ fontWeight: 'bold', px: 2, py: 1.5, bgcolor: 'background.paper2' }}>门户网站</Box>
    <CardVisit kb={kb} refresh={refresh} />
    <Divider sx={{ my: 2 }} />
    <CardAuth kb={kb} refresh={refresh} />
    <Divider sx={{ my: 2 }} />
    <CardStyle
      id={info.id}
      data={info}
      refresh={(value) => {
        setInfo({
          ...info,
          settings: {
            ...info.settings,
            ...value,
          }
        })
      }}
    />
    <Divider sx={{ my: 2 }} />
    <CardWebHeader
      id={info.id}
      data={info}
      refresh={(value) => {
        setInfo({
          ...info,
          settings: {
            ...info.settings,
            ...value,
          }
        })
      }}
    />
    <Divider sx={{ my: 2 }} />
    <CardCatalog
      id={info.id}
      data={info}
      refresh={(value) => {
        setInfo({
          ...info,
          settings: {
            ...info.settings,
            catalog_settings: {
              ...info.settings?.catalog_settings,
              ...value,
            },
          }
        })
      }}
    />
    <Divider sx={{ my: 2 }} />
    <CardFooter
      id={info.id}
      data={info}
      refresh={(value) => {
        setInfo({
          ...info,
          settings: {
            ...info.settings,
            footer_settings: {
              ...info.settings?.footer_settings,
              ...value,
            },
          }
        })
      }}
    />
    <Divider sx={{ my: 2 }} />
    <CardWebWelcome
      id={info.id}
      data={info}
      refresh={(value) => {
        setInfo({
          ...info,
          settings: {
            ...info.settings,
            ...value,
          }
        })
      }}
    />
    <Divider sx={{ my: 2 }} />
    <CardWebSEO
      id={info.id}
      data={info}
      refresh={(value) => {
        setInfo({
          ...info,
          settings: {
            ...info.settings,
            ...value,
          }
        })
      }}
    />
    <Divider sx={{ my: 2 }} />
    <CardWebCustomCode
      id={info.id}
      data={info}
      refresh={(value) => {
        setInfo({
          ...info,
          settings: {
            ...info.settings,
            ...value,
          }
        })
      }}
    />
  </Card>
}
export default CardWeb