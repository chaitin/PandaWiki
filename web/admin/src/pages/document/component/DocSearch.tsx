import { useURLSearchParams } from '@/hooks';
import { IconButton, InputAdornment, Stack, TextField } from '@mui/material';
import { Icon } from 'ct-mui';
import { useState } from 'react';

const DocSearch = () => {
  const [searchParams, setSearchParams] = useURLSearchParams();
  const oldSearch = searchParams.get('search') || '';
  const [search, setSearch] = useState(oldSearch);

  return (
    <Stack direction={'row'} alignItems={'center'} gap={2}>
      <TextField
        label='搜索内容'
        size='small'
        sx={{ width: 300 }}
        value={search}
        onKeyUp={event => {
          if (event.key === 'Enter') {
            setSearchParams({ search: search || '' });
          }
        }}
        onBlur={event => setSearchParams({ search: event.target.value })}
        onChange={event => setSearch(event.target.value)}
        InputProps={{
          endAdornment: search ? (
            <InputAdornment position='end'>
              <IconButton
                onClick={() => {
                  setSearch('');
                  setSearchParams({ search: '' });
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

export default DocSearch;
