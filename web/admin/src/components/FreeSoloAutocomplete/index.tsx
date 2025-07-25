import { useCommitPendingInput } from '@/hooks'
import {
  Autocomplete,
  AutocompleteProps,
  Box,
  Chip,
  TextField,
  TextFieldProps,
} from '@mui/material'
import { ReactNode } from 'react'

export type FreeSoloAutocompleteProps<T> = {
  width?: number
  placeholder?: string
  inputProps?: TextFieldProps
  options?: T[]
} & ReturnType<typeof useCommitPendingInput<T>> &
  Omit<
    AutocompleteProps<T, true, false, true>,
    | 'renderInput'
    | 'value'
    | 'onChange'
    | 'inputValue'
    | 'onInputChange'
    | 'options'
  >

export function FreeSoloAutocomplete<T>({
  width,
  placeholder,
  value,
  setValue,
  inputValue,
  setInputValue,
  commit,
  inputProps = {},
  options = [],
  ...autocompleteProps
}: FreeSoloAutocompleteProps<T>) {
  return (
    <Autocomplete<T, true, false, true>
      multiple
      fullWidth
      freeSolo
      options={options}
      sx={width ? { width } : {}}
      slotProps={{
        listbox: {
          sx: {
            bgcolor: 'background.paper2',
          },
        },
      }}
      value={value}
      onChange={(_, newValue) => setValue(newValue as T[])}
      inputValue={inputValue}
      onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
      onBlur={commit}
      renderInput={(params) => (
        <TextField
          {...params}
          {...inputProps}
          variant='outlined'
          placeholder={placeholder}
        />
      )}
      renderTags={(value, getTagProps) => {
        return value.map((option, index: number) => {
          return (
            <Chip
              variant='outlined'
              size='small'
              label={<Box sx={{ fontSize: '12px' }}>{option as ReactNode}</Box>}
              {...getTagProps({ index })}
              key={index}
            />
          )
        })
      }}
      blurOnSelect={false}
      {...autocompleteProps}
    />
  )
}
