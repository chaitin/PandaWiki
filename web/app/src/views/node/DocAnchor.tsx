'use client'

import { NodeDetail } from "@/assets/type";
import { IconArrowDown } from "@/components/icons";
import useScroll from "@/utils/useScroll";
import { Box, IconButton, Stack } from "@mui/material";
import { UseTiptapEditorReturn } from "ct-tiptap-editor";
import { useEffect, useState } from "react";

interface Heading {
  id: string
  title: string
  heading: number
}

interface DocAnchorProps {
  summary: string
  node?: NodeDetail
  editorRef: UseTiptapEditorReturn
}

const HeadingSx = [
  { fontWeight: 400, color: 'text.secondary' },
  { fontWeight: 400, color: 'text.tertiary' },
  { fontWeight: 400, color: 'text.disabled' },
]

const DocAnchor = ({ summary, node, editorRef }: DocAnchorProps) => {
  const [headings, setHeadings] = useState<Heading[]>([])
  const { activeHeading, scrollToElement } = useScroll(headings)

  const [expand, setExpand] = useState(true)

  const levels = Array.from(new Set(headings.map(it => it.heading).sort((a, b) => a - b))).slice(0, 3)

  const handleClick = (e: React.MouseEvent<HTMLDivElement>, heading: Heading) => {
    e.preventDefault();
    if (scrollToElement) {
      scrollToElement(heading.id, 80);
    } else {
      const element = document.getElementById(heading.id);
      if (element) {
        const offset = 80;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
        location.hash = encodeURIComponent(heading.title);
      }
    }
  };

  useEffect(() => {
    if (node && editorRef && editorRef.editor) {
      editorRef.getNavs().then((navs) => {
        setHeadings(navs || [])
      })
    }
  }, [node, editorRef])

  return <Box sx={{
    fontSize: 12,
    position: 'fixed',
    zIndex: 5,
    top: 96,
    right: 16,
    width: 200,
  }}>
    {summary && <Box sx={{
      bgcolor: 'background.paper',
      borderRadius: '10px',
      border: '1px solid',
      borderColor: 'divider',
      p: 2,
      mb: 2,
    }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box sx={{
          fontWeight: 'bold',
          cursor: 'pointer',
          color: 'text.secondary',
        }}>
          文档摘要
        </Box>
        <IconButton size="small" sx={{ width: 17, height: 17 }} onClick={() => setExpand(!expand)}>
          <IconArrowDown sx={{ transform: expand ? 'rotate(0deg)' : 'rotate(-180deg)' }} />
        </IconButton>
      </Stack>
      {expand && <Box sx={{
        color: 'text.tertiary',
        maxHeight: '110px',
        mt: 1,
        lineHeight: '20px',
        textAlign: 'justify',
        overflowY: 'auto',
        overflowX: 'hidden',
        '&::-webkit-scrollbar': {
          display: 'none',
        },
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
      }}>{summary}</Box>}
    </Box>}
    {headings.length > 0 && <Box sx={{
      bgcolor: 'background.paper',
      borderRadius: '10px',
      border: '1px solid',
      borderColor: 'divider',
      padding: '16px',
    }}>
      <Box sx={{
        fontWeight: 'bold',
        cursor: 'pointer',
        mb: 1,
        color: 'text.secondary',
      }}>
        内容大纲
      </Box>
      <Box sx={{
        maxHeight: 'calc(100vh - 359px)',
        overflowY: 'auto',
        overflowX: 'hidden',
        lineHeight: '32px',
        '&::-webkit-scrollbar': {
          display: 'none',
        },
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
      }}>
        {headings.filter(it => levels.includes(it.heading)).map((heading) => {
          const idx = levels.indexOf(heading.heading)
          return <Box key={heading.id} sx={{
            cursor: 'pointer',
            pl: idx * 2,
            ...HeadingSx[idx],
            color: activeHeading?.id === heading.id ? 'primary.main' : HeadingSx[idx].color,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            ':hover': {
              color: 'primary.main'
            }
          }} onClick={(e) => handleClick(e, heading)}>
            {heading.title}
          </Box>
        })}
      </Box>
    </Box>}
  </Box>
}

export default DocAnchor;