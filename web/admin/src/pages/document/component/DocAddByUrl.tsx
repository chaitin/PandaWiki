import { createNode, getNotionIntegration, getNotionIntegrationDetail, scrapeCrawler, scrapeRSS, scrapeSitemap, uploadFile } from "@/api"
import Upload from "@/components/UploadFile/Drag"
import { useAppSelector } from "@/store"
import { formatByte } from "@/utils"
import { Close } from "@mui/icons-material"
import { Box, Button, Checkbox, CircularProgress, IconButton, LinearProgress, List, ListItem, ListItemText, Skeleton, Stack, TextField, Typography } from "@mui/material"
import { Ellipsis, Icon, Message, Modal } from "ct-mui"
import { useEffect, useState } from "react"
import { FileRejection } from "react-dropzone"

type DocAddByUrlProps = {
  type: 'OfflineFile' | 'URL' | 'RSS' | 'Sitemap' | 'Notion'
  parentId?: string | null
  open: boolean
  refresh?: () => void
  onCancel: () => void
}

const StepText = {
  1: {
    okText: '拉取数据',
    showCancel: true,
  },
  2: {
    okText: '导入数据',
    showCancel: true,
  },
  3: {
    okText: '完成',
    showCancel: false,
  }
}

type Item = {
  content: string
  title: string
  url: string
  success: -1 | 0 | 1
  id: string
}

const DocAddByUrl = ({ type, open, refresh, onCancel, parentId = null }: DocAddByUrlProps) => {

  const { kb_id } = useAppSelector(state => state.config)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [selectIds, setSelectIds] = useState<string[]>([])
  const [requestQueue, setRequestQueue] = useState<(() => Promise<any>)[]>([])
  const [isCancelled, setIsCancelled] = useState(false)

  const [acceptedFiles, setAcceptedFiles] = useState<File[]>([])
  const [rejectedFiles, setRejectedFiles] = useState<FileRejection[]>([])
  const [isUploading, setIsUploading] = useState(0)
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [size] = useState(1024 * 1024 * 20)

  const onChangeFile = (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    setAcceptedFiles(acceptedFiles)
    setRejectedFiles(rejectedFiles)
    setIsUploading(0)
  }

  const handleRemove = (index: number) => {
    const newFiles = acceptedFiles.filter((_, i) => i !== index)
    setAcceptedFiles(newFiles)
  }

  const handleCancel = () => {
    setIsCancelled(true)
    setRequestQueue([])
    setStep(1)
    setUrl('')
    setItems([])
    setSelectIds([])
    setAcceptedFiles([])
    setRejectedFiles([])
    setIsUploading(0)
    setCurrentFileIndex(0)
    setUploadProgress(0)
    setLoading(false)
    onCancel()
    refresh?.()
  }

  const getUrlByUploadFile = async (file: File, onProgress: (progress: number) => void) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("kb_id", kb_id)
    const response = await uploadFile(formData, {
      onUploadProgress: (event) => onProgress(event.progress)
    })
    return '/static-file/' + response.key
  }

  const handleOfflineFile = async () => {
    if (isUploading === 1) return
    setIsUploading(1)
    setCurrentFileIndex(0)
    const urls: { url: string, title: string }[] = []
    const errorIdx: number[] = []
    try {
      for (let i = 0; i < acceptedFiles.length; i++) {
        setCurrentFileIndex(i)
        setUploadProgress(0)
        try {
          const url = await getUrlByUploadFile(acceptedFiles[i], (progress) => {
            setUploadProgress(progress)
          })
          urls.push({ url, title: acceptedFiles[i].name.split('.')[0] })
        } catch (error) {
          errorIdx.push(i)
          console.error(`文件 ${acceptedFiles[i].name} 上传失败:`, error)
        }
      }
      setStep(2)
      for (const { url, title } of urls) {
        const res = await scrapeCrawler({ url })
        setItems(prev => [...prev, { ...res, url, title: title || res.title, success: -1, id: '' }])
      }
      setLoading(false)
    } catch (error) {
      console.error(error)
    }
  }

  const handleURL = async () => {
    const newQueue: (() => Promise<any>)[] = []
    if (type === 'URL') {
      const urls = url.split('\n')
      for (const url of urls) {
        newQueue.push(async () => {
          const res = await scrapeCrawler({ url })
          setItems(prev => [...prev, { ...res, url, success: -1, id: '' }])
        })
      }
    }
    if (type === 'RSS') {
      const { items = [] } = await scrapeRSS({ url })
      for (const item of items) {
        if (item.url) {
          newQueue.push(async () => {
            const res = await scrapeCrawler({ url: item.url })
            setItems(prev => [...prev, { ...res, url: item.url, success: -1, id: '' }])
          })
        }
      }
    }
    if (type === 'Sitemap') {
      const res = await scrapeSitemap({ url })
      const urls = res.items.map(item => item.url)
      for (const url of urls) {
        newQueue.push(async () => {
          const res = await scrapeCrawler({ url })
          setItems(prev => [...prev, { ...res, url, success: -1, id: '' }])
        })
      }
    }
    if (type === 'Notion') {
      const data = await getNotionIntegration({ integration: url })
      for (const item of data) {
        newQueue.push(async () => {
          const res = await getNotionIntegrationDetail({ pages: [item], integration: url, kb_id })
          setItems(prev => [...prev, { ...res[0], url: item.id, success: -1, id: '' }])
        })
      }
    }
    setStep(2)
    setRequestQueue(newQueue)
  }

  const handleOk = async () => {
    if (step === 3) {
      handleCancel()
      refresh?.()
    } else if (step === 1) {
      setLoading(true)
      setIsCancelled(false)
      if (type === 'OfflineFile') handleOfflineFile()
      else handleURL()
    } else if (step === 2) {
      if (selectIds.length === 0) {
        Message.error('请选择要导入的文档')
        return
      }
      setItems(prev => prev.map(item => ({ ...item, success: 0 })))
      const newItems = [...items]
      for (const url of selectIds) {
        try {
          const curItem = items.find(item => item.url === url)
          if (!curItem || (curItem.id !== '' && curItem.id !== '-1')) {
            continue
          }
          const res = await createNode({
            name: curItem?.title || '',
            content: curItem?.content || '',
            parent_id: parentId,
            type: 2,
            kb_id
          })
          const index = newItems.findIndex(item => item.url === url)
          if (index !== -1) {
            Message.success(newItems[index].title + '导入成功')
            newItems[index] = {
              ...newItems[index],
              success: 1,
              id: res.id
            }
          }
        } catch (error) {
          const index = newItems.findIndex(item => item.url === url)
          if (index !== -1) {
            Message.error(newItems[index].title + '导入失败')
            newItems[index] = {
              ...newItems[index],
              success: 1,
              id: '-1'
            }
          }
        }
      }
      const allSuccess = newItems.every(item => item.success === 1 && item.id !== '-1' && item.id !== '')
      setItems(newItems)
      if (allSuccess) {
        setStep(3)
      }
    }
  }

  const processUrl = async () => {
    if (isCancelled) {
      setItems([])
    }
    if (requestQueue.length === 0 || isCancelled) {
      setLoading(false)
      setRequestQueue([])
      return
    }

    setLoading(true)
    const newQueue = [...requestQueue]
    const requests = newQueue.splice(0, 2)

    try {
      await Promise.all(requests.map(request => request()))
      if (newQueue.length > 0 && !isCancelled) {
        setRequestQueue(newQueue)
      } else {
        setLoading(false)
        setRequestQueue([])
      }
    } catch (error) {
      console.error('请求执行出错:', error)
      if (newQueue.length > 0 && !isCancelled) {
        setRequestQueue(newQueue)
      } else {
        setLoading(false)
        setRequestQueue([])
      }
    }
  }

  useEffect(() => {
    processUrl()
  }, [requestQueue.length, isCancelled])

  return <Modal
    title={`通过 ${type === 'OfflineFile' ? '离线文件' : type} 导入`}
    open={open}
    onCancel={handleCancel}
    onOk={handleOk}
    disableEscapeKeyDown
    okText={StepText[step].okText}
    showCancel={StepText[step].showCancel}
    okButtonProps={{ loading }}
  >
    {step === 1 && (type === 'OfflineFile' ? <Box>
      <Upload
        file={acceptedFiles}
        onChange={(accept, reject) => onChangeFile(accept, reject)}
        type='drag'
        multiple
        accept='.txt, .md, .xls, .xlsx, .docx, .pdf, .html'
        size={size}
      />
      {isUploading === 1 && <Box sx={{ mt: 2 }}>
        <Box sx={{ fontSize: 14, mb: 1 }}>
          正在上传文件 {currentFileIndex + 1} / {acceptedFiles.length}
        </Box>
        <Stack direction='row' alignItems={'center'} justifyContent={'space-between'} gap={2}>
          <Box sx={{ fontSize: 12 }}>
            {acceptedFiles[currentFileIndex]?.name}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
            <CircularProgress size={20} sx={{ mr: 1.5 }} />
            <Typography variant="body2">{uploadProgress}%</Typography>
          </Box>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={uploadProgress}
          sx={{
            height: '4px !important',
            borderRadius: 4,
            "& .MuiLinearProgress-bar": {
              borderRadius: 4,
            },
          }}
        />
      </Box>}
      {(acceptedFiles.length > 0 || rejectedFiles.length > 0) && (
        <Box sx={{ mt: 2, maxHeight: 300, overflow: 'auto' }}>
          <List dense>
            {acceptedFiles.map((file, index) => {
              return <ListItem
                key={`${file.name}-${index}`}
                sx={{
                  borderBottom: '1px dashed',
                  borderColor: 'divider',
                  ':hover': {
                    backgroundColor: 'background.paper2'
                  }
                }}
                secondaryAction={
                  isUploading === 2 ? <Box sx={{ color: 'error.main', fontSize: 12 }}>上传失败</Box>
                    : <IconButton edge='end' onClick={() => handleRemove(index)}>
                      <Close sx={{ fontSize: 14 }} />
                    </IconButton>
                }
              >
                <ListItemText
                  primary={file.name}
                  secondary={formatByte(file.size)}
                />
                {size && file.size > size && (
                  <Typography variant='caption' color='error' sx={{ ml: 2, fontSize: 12 }}>
                    超过大小限制
                  </Typography>
                )}
              </ListItem>
            })}
          </List>
        </Box>
      )}
    </Box> : <>
      <Stack direction={'row'} alignItems={'center'} justifyContent={'space-between'} sx={{
        fontSize: 14,
        lineHeight: '32px',
        mb: 1,
      }}>
        {type === 'Notion' ? 'Notion Integration' : `${type} 地址`}
        {type === 'Notion' && <Box component='a'
          href='https://pandawiki.docs.baizhi.cloud/node/01975f23-1c18-74aa-9a05-955b5128c49d' target='_blank'
          sx={{ fontSize: 12, color: 'primary.main' }}>
          使用方法
        </Box>}
      </Stack>
      <TextField
        fullWidth
        multiline={type === 'URL'}
        rows={type === 'URL' ? 4 : 1}
        value={url}
        placeholder={type === 'URL' ? '每行一个 URL' : type === 'Notion' ? 'Notion Integration' : `${type} 地址`}
        autoFocus
        onChange={(e) => setUrl(e.target.value)}
      />
    </>)}
    {step !== 1 && <Box sx={{
      borderRadius: '10px',
      border: '1px solid',
      borderColor: 'divider',
      maxHeight: 'calc(100vh - 300px)',
      overflowX: 'hidden',
      overflowY: 'auto',
    }}>
      {step === 2 && <Stack direction={'row'} alignItems={'center'} gap={1} sx={{
        px: 2,
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        <Checkbox
          size="small"
          sx={{ flexShrink: 0, p: 0, m: 0 }}
          checked={selectIds.length === items.length}
          onChange={() => {
            if (selectIds.length === items.length) {
              setSelectIds([])
            } else {
              setSelectIds(items.map(item => item.url))
            }
          }}
        />
        <Box sx={{ fontSize: 14 }}>全选</Box>
      </Stack>}
      <Stack>
        {items.map((item, idx) => <Stack direction={'row'} alignItems={'center'} gap={1} key={item.url} sx={{
          px: 2,
          py: 1,
          cursor: 'pointer',
          borderBottom: idx === items.length - 1 ? 'none' : '1px solid',
          borderColor: 'divider',
          ':hover': {
            bgcolor: 'background.paper2'
          }
        }}>
          {item.success === 0 ?
            <Icon type='icon-shuaxin' sx={{ fontSize: 18, color: 'text.auxiliary', animation: 'loadingRotate 1s linear infinite' }} />
            : item.id === '' ? <Checkbox
              size="small"
              id={item.url}
              sx={{ flexShrink: 0, p: 0, m: 0 }}
              checked={selectIds.includes(item.url)}
              onChange={() => {
                setSelectIds(prev => {
                  if (prev.includes(item.url)) {
                    return prev.filter(it => it !== item.url)
                  }
                  return [...prev, item.url]
                })
              }}
            /> : <Stack direction={'row'} justifyContent={'center'} alignItems={'center'} sx={{ flexShrink: 0, width: 20, height: 20 }}>
              {item.id === '-1' ? <Icon type='icon-icon_tool_close' sx={{ fontSize: 18, color: 'error.main' }} />
                : <Icon type='icon-duihao' sx={{ fontSize: 18, color: 'success.main' }} />}
            </Stack>}
          <Box component="label" sx={{ flexGrow: 1, cursor: 'pointer', width: 0 }} htmlFor={item.url}>
            <Ellipsis sx={{ fontSize: 14 }}>{item.title || item.url}</Ellipsis>
            {item.content && <Ellipsis sx={{ fontSize: 12, color: 'text.auxiliary' }}>{item.content}</Ellipsis>}
          </Box>
          {item.id === '-1' ? <Button size='small' variant='outlined' onClick={() => {
            setItems(prev => prev.map(it => it.url === item.url ? { ...it, success: 0, id: '' } : it))
            createNode({
              name: item.title,
              content: item.content,
              parent_id: parentId,
              type: 2,
              kb_id
            }).then(res => {
              Message.success(item.title + '导入成功')
              setItems(prev => prev.map(it => it.url === item.url ? { ...it, success: 1, id: res.id } : it))
            }).catch(() => {
              Message.error(item.title + '导入失败')
            })
          }}>重新导入</Button> : null}
        </Stack>)}
        {loading && <Stack direction={'row'} alignItems={'center'} gap={1} sx={{
          px: 2,
          py: 1,
          cursor: 'pointer',
          bgcolor: 'background.paper2'
        }}>
          <Stack direction={'row'} justifyContent={'center'} alignItems={'center'} sx={{ flexShrink: 0, width: 20, height: 20 }}>
            <Icon type='icon-shuaxin' sx={{ fontSize: 18, color: 'text.auxiliary', animation: 'loadingRotate 1s linear infinite' }} />
          </Stack>
          <Box component="label" sx={{ flexGrow: 1 }}>
            <Skeleton variant="text" width={200} height={21} />
            <Skeleton variant="text" height={18} />
          </Box>
        </Stack>}
      </Stack>
    </Box>}
  </Modal>
}

export default DocAddByUrl
