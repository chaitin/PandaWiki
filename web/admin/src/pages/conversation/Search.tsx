import { useURLSearchParams } from '@/hooks';
import { IconButton, InputAdornment, Stack, TextField } from '@mui/material';
import { Icon } from 'ct-mui';
import { useState } from 'react';

const Search = () => {
  const [searchParams, setSearchParams] = useURLSearchParams();
  const oldSubject = searchParams.get('subject') || '';
  const oldRemoteIp = searchParams.get('remote_ip') || '';

  const [subject, setSubject] = useState(oldSubject);
  const [remoteIp, setRemoteIp] = useState(oldRemoteIp);

  return (
    <Stack direction={'row'} alignItems={'center'} gap={2}>
      <TextField
        label='问题'
        size='small'
        sx={{ width: 200 }}
        value={subject}
        onKeyUp={event => {
          if (event.key === 'Enter') {
            setSearchParams({ subject: subject || '', page: '1' });
          }
        }}
        onBlur={event =>
          setSearchParams({ subject: event.target.value, page: '1' })
        }
        onChange={event => setSubject(event.target.value)}
        InputProps={{
          endAdornment: subject ? (
            <InputAdornment position='end'>
              <IconButton
                onClick={() => {
                  setSubject('');
                  setSearchParams({ subject: '', page: '1' });
                }}
                size='small'
              >
                <Icon
                  type='icon-icon_tool_close'
                  sx={{ fontSize: 14, color: 'text.auxiliary' }}
                />
              </IconButton>
            </InputAdornment>
          ) : null,
        }}
      />
      <TextField
        label='来源IP'
        size='small'
        sx={{ width: 200 }}
        value={remoteIp}
        onKeyUp={event => {
          if (event.key === 'Enter') {
            setSearchParams({ remote_ip: remoteIp || '', page: '1' });
          }
        }}
        onBlur={event =>
          setSearchParams({ remote_ip: event.target.value, page: '1' })
        }
        onChange={event => setRemoteIp(event.target.value)}
        InputProps={{
          endAdornment: remoteIp ? (
            <InputAdornment position='end'>
              <IconButton
                onClick={() => {
                  setRemoteIp('');
                  setSearchParams({ remote_ip: '', page: '1' });
                }}
                size='small'
              >
                <Icon
                  type='icon-icon_tool_close'
                  sx={{ fontSize: 14, color: 'text.auxiliary' }}
                />
              </IconButton>
            </InputAdornment>
          ) : null,
        }}
      />
    </Stack>
  );
};

export default Search;
