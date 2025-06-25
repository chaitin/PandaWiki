import { useStore } from '@/provider';
import { addOpacityToColor, copyText } from '@/utils';
import { Box, IconButton, useTheme } from '@mui/material';
import { Icon } from 'ct-mui';
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { anOldHope } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

interface MarkDownProps {
  loading?: boolean
  content: string
}

const MarkDown = ({ loading = false, content }: MarkDownProps) => {
  const theme = useTheme();
  const { themeMode = 'light' } = useStore();
  const [showThink, setShowThink] = useState(false)

  let answer = content
  if (!answer.includes('\n\n</think>')) {
    const idx = answer.indexOf('\n</think>')
    if (idx !== -1) {
      answer = content.slice(0, idx) + '\n\n</think>' + content.slice(idx + 9)
    }
  }

  if (content.length === 0) return null

  return <Box
    className={`markdown-body ${themeMode === 'dark' ? 'md-dark' : ''}`}
    sx={{
      fontSize: '14px',
      background: 'transparent',
      '#chat-thinking': {
        display: 'flex',
        alignItems: 'flex-end',
        gap: '16px',
        fontSize: '12px',
        color: 'text.tertiary',
        marginBottom: '40px',
        lineHeight: '20px',
        bgcolor: 'background.paper',
        padding: '16px',
        cursor: 'pointer',
        borderRadius: '10px',
        div: {
          transition: 'height 0.3s',
          overflow: 'hidden',
          height: showThink ? 'auto' : '60px',
        },
      }
    }}
  >
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      rehypePlugins={[
        rehypeRaw,
        [
          rehypeSanitize,
          {
            tagNames: [
              ...(defaultSchema.tagNames! as string[]),
              'think',
              'error'
            ]
          },
        ],
      ]}
      components={{
        // @ts-ignore
        think: (props: React.HTMLAttributes<HTMLElement>) => {
          return <div id='chat-thinking'>
            <div className={!showThink ? 'three-ellipsis' : ''} {...props}></div>
            {!loading && <IconButton size='small' onClick={() => setShowThink(!showThink)} sx={{
              bgcolor: 'background.paper',
              ':hover': {
                bgcolor: addOpacityToColor(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
              }
            }}>
              <Icon
                type='icon-xiajiantou'
                sx={{ fontSize: 18, flexShrink: 0, transform: showThink ? 'rotate(-180deg)' : 'rotate(0deg)' }}
              />
            </IconButton>}
          </div>
        },
        error: (props: React.HTMLAttributes<HTMLElement>) => {
          return <div className='chat-error' {...props}></div>
        },
        h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h2 {...props} />,
        a: ({ children, style, ...rest }: React.HTMLAttributes<HTMLAnchorElement>) => (
          <a
            {...rest}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: theme.palette.primary.main,
              textDecoration: 'underline',
              ...style
            }}
          >
            {children}
          </a>
        ),
        img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
          const { style, alt, src, width, height, ...rest } = props;
          return (
            <img
              alt={alt || 'markdown-img'}
              src={src || ''}
              {...rest}
              style={{
                width: width || 'auto',
                height: height || 'auto',
                ...style,
                borderRadius: '10px',
                marginLeft: '5px',
                boxShadow: '0px 0px 3px 1px rgba(0,0,5,0.15)',
                cursor: 'pointer',
              }}
              referrerPolicy='no-referrer'
            />
          );
        },
        code({ children, className, style, ...rest }: React.HTMLAttributes<HTMLElement>) {
          const match = /language-(\w+)/.exec(className || '');
          return match ? (
            <SyntaxHighlighter
              showLineNumbers
              {...rest}
              language={match[1] || 'bash'}
              style={{ ...anOldHope, 'hljs': {} }}
              onClick={() => {
                copyText(String(children).replace(/\n$/, ''))
              }}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code {...rest} className={className} onClick={() => {
              copyText(String(children))
            }}>
              {children}
            </code>
          );
        }
      }}
    >
      {answer}
    </ReactMarkdown>
  </Box>
}

export default MarkDown