import { AppDetail, CustomCodeSetting, updateAppDetail } from "@/api"
import { Box, Button, Stack, TextField } from "@mui/material"
import { Message } from "ct-mui"
import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"

interface CardWebCustomCodeProps {
  id: string
  data: AppDetail
  refresh: (value: CustomCodeSetting) => void
}

const CardWebCustomCode = ({ id, data, refresh }: CardWebCustomCodeProps) => {
  const [isEdit, setIsEdit] = useState(false)

  const { handleSubmit, control, setValue, formState: { errors } } = useForm({
    defaultValues: {
      head_code: '',
      body_code: '',
    }
  })

  const onSubmit = (value: CustomCodeSetting) => {
    updateAppDetail({ id }, { settings: { ...data.settings, ...value } }).then(() => {
      Message.success('保存成功')
      refresh(value)
      setIsEdit(false)
    })
  }

  useEffect(() => {
    setValue('head_code', data.settings?.head_code || '')
    setValue('body_code', data.settings?.body_code || '')
  }, [data])

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
      }}>自定义代码</Box>
      {isEdit && <Button variant="contained" size="small" onClick={handleSubmit(onSubmit)}>保存</Button>}
    </Stack>
    <Stack gap={2} sx={{ m: 2 }}>
      <Stack direction='row' gap={2} alignItems={'flex-start'}>
        <Box sx={{ width: 156, fontSize: 14, lineHeight: '32px', flexShrink: 0 }}>注入到 Head 标签</Box>
        <Controller
          control={control}
          name="head_code"
          render={({ field }) => <TextField
            sx={{ fontFamily: 'monospace' }}
            fullWidth
            multiline
            rows={4}
            {...field}
            placeholder="输入 Head 代码"
            error={!!errors.head_code}
            helperText={errors.head_code?.message}
            onChange={(event) => {
              setIsEdit(true)
              field.onChange(event)
            }}
          />}
        />
      </Stack>
      <Stack direction='row' gap={2} alignItems={'flex-start'} sx={{ fontSize: 14, lineHeight: '32px' }}>
        <Box sx={{ width: 156, fontSize: 14, flexShrink: 0 }}>注入到 Body 标签</Box>
        <Controller
          control={control}
          name="body_code"
          render={({ field }) => <TextField
            sx={{ fontFamily: 'monospace' }}
            fullWidth
            {...field}
            multiline
            rows={4}
            placeholder="输入 Body 代码"
            error={!!errors.body_code}
            helperText={errors.body_code?.message}
            onChange={(event) => {
              setIsEdit(true)
              field.onChange(event)
            }}
          />}
        />
      </Stack>

    </Stack>
  </>
}
export default CardWebCustomCode