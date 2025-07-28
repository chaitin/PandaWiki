import { AppDetail, FeishuBotSetting, getAppDetail, KnowledgeBaseListItem, updateAppDetail } from "@/api"
import { Box, Button, FormControlLabel, Link, Radio, RadioGroup, Stack, TextField } from "@mui/material"
import { Message } from "ct-mui"
import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"

const CardRobotFeishu = ({ kb }: { kb: KnowledgeBaseListItem }) => {
  const [isEdit, setIsEdit] = useState(false)
  const [detail, setDetail] = useState<AppDetail | null>(null)
  const [isEnabled, setIsEnabled] = useState(false)


  const { control, handleSubmit, formState: { errors }, reset } = useForm<FeishuBotSetting>({
    defaultValues: {
      feishu_bot_is_enabled: false,
      feishu_bot_app_id: '',
      feishu_bot_app_secret: '',
      feishu_bot_welcome_str: '',
    }
  })

  const getDetail = () => {
    getAppDetail({ kb_id: kb.id, type: 4 }).then(res => {
      setDetail(res)
      setIsEnabled(res.settings.feishu_bot_is_enabled)
      reset({
        feishu_bot_is_enabled: res.settings.feishu_bot_is_enabled,
        feishu_bot_app_id: res.settings.feishu_bot_app_id,
        feishu_bot_app_secret: res.settings.feishu_bot_app_secret,
        feishu_bot_welcome_str: res.settings.feishu_bot_welcome_str,
      })
    })
  }

  const onSubmit = (data: FeishuBotSetting) => {
    if (!detail) return
    updateAppDetail({ id: detail.id }, {
      settings: {
        feishu_bot_is_enabled: data.feishu_bot_is_enabled,
        feishu_bot_app_id: data.feishu_bot_app_id,
        feishu_bot_app_secret: data.feishu_bot_app_secret,
        feishu_bot_welcome_str: data.feishu_bot_welcome_str,
      }
    }).then(() => {
      Message.success('保存成功')
      setIsEdit(false)
      getDetail()
      reset()
    })
  }

  useEffect(() => {
    getDetail()
  }, [kb])

  return <>
    <Stack direction='row' alignItems={'center'} justifyContent={'space-between'} sx={{
      m: 2,
      height: 32,
      fontWeight: 'bold',
    }}>
      <Box sx={{
        '&::before': {
          content: '""',
          display: 'inline-block',
          width: 4,
          height: 12,
          bgcolor: 'common.black',
          borderRadius: '2px',
          mr: 1,
        },
      }}>飞书机器人</Box>
      <Box sx={{ flexGrow: 1, ml: 1 }}>
        <Link
          component='a' 
          href='https://pandawiki.docs.baizhi.cloud/node/01971b5f-4520-7c4b-8b4e-683ec5235adc' 
          target="_blank"
          sx={{
            fontSize: 14,
            textDecoration: 'none',
            fontWeight: 'normal',
            '&:hover': {
              fontWeight: 'bold',
            }
          }}>使用方法</Link>
      </Box>
      {isEdit && <Button variant="contained" size="small" onClick={handleSubmit(onSubmit)}>保存</Button>}
    </Stack>
    <Stack gap={2} sx={{ m: 2 }}>
      <Stack direction={'row'} alignItems={'center'} gap={2}>
        <Box sx={{ width: 156, fontSize: 14, lineHeight: '32px' }}>飞书机器人</Box>
        <Controller
          control={control}
          name="feishu_bot_is_enabled"
          render={({ field }) => <RadioGroup row {...field} onChange={(e) => {
            field.onChange(e.target.value === "true")
            setIsEnabled(e.target.value === "true")
            setIsEdit(true)
          }}>
            <FormControlLabel value={true} control={<Radio size='small' />} label={<Box sx={{ width: 100 }}>启用</Box>} />
            <FormControlLabel value={false} control={<Radio size='small' />} label={<Box sx={{ width: 100 }}>禁用</Box>} />
          </RadioGroup>}
        />
      </Stack>
      {isEnabled && <>
        <Stack direction='row' gap={2} alignItems={'center'} justifyContent={'space-between'} >
          <Box sx={{ width: 156, fontSize: 14, lineHeight: '32px', flexShrink: 0 }}>
            App ID
            <Box component={'span'} sx={{ color: 'red', ml: 0.5 }}>*</Box>
          </Box>
          <Controller
            control={control}
            name="feishu_bot_app_id"
            rules={{
              required: 'App ID',
            }}
            render={({ field }) => <TextField
              {...field}
              fullWidth
              placeholder="> 飞书开放平台 > 凭证与基础信息 > 应用凭证 > App ID"
              onChange={(e) => {
                field.onChange(e.target.value)
                setIsEdit(true)
              }}
              error={!!errors.feishu_bot_app_id}
              helperText={errors.feishu_bot_app_id?.message}
            />}
          />
        </Stack>
        <Stack direction='row' gap={2} alignItems={'center'} justifyContent={'space-between'} >

          <Box sx={{ width: 156, fontSize: 14, lineHeight: '32px', flexShrink: 0}}>
            App Secret
            <Box component={'span'} sx={{ color: 'red', ml: 0.5 }}>*</Box>
          </Box>
          <Controller
            control={control}
            name="feishu_bot_app_secret"
            rules={{
              required: 'App Secret',
            }}
            render={({ field }) => <TextField
              {...field}
              fullWidth
              placeholder="> 飞书开放平台 > 凭证与基础信息 > 应用凭证 > App Secret"
              onChange={(e) => {
                field.onChange(e.target.value)
                setIsEdit(true)
              }}
              error={!!errors.feishu_bot_app_secret}
              helperText={errors.feishu_bot_app_secret?.message}
            />}
          />
        </Stack>
      </>}
      
      {/* <Box sx={{ fontSize: 14, lineHeight: '32px', my: 1 }}>
        用户欢迎语
      </Box>
      <Controller
        control={control}
        name="feishu_bot_welcome_str"
        render={({ field }) => <TextField
          {...field}
          multiline
          rows={4}
          fullWidth
          size="small"
          placeholder={`欢迎使用网站监测 AI 助手，我将回答您关于网站监测的问题，如:\n 1. 网站监测的监控节点 IP 是什么 \n 2. 网站监测大模型落地案例`}
          onChange={(e) => {
            field.onChange(e.target.value)
            setIsEdit(true)
          }}
          error={!!errors.feishu_bot_welcome_str}
          helperText={errors.feishu_bot_welcome_str?.message}
        />}
      /> */}
    </Stack>
  </>
}

export default CardRobotFeishu