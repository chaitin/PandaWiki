import { Button, Stack, styled, Tooltip } from '@mui/material';
import { StyledFormLabel } from '@/components/Form';
import Card from '@/components/Card';
import InfoIcon from '@mui/icons-material/Info';

export const StyledFormItem = styled('div')<{ vertical?: boolean }>(
  ({ theme, vertical }) => ({
    display: 'flex',
    alignItems: vertical ? 'flex-start' : 'center',
    flexDirection: vertical ? 'column' : 'row',
    gap: vertical ? 0 : theme.spacing(2),
  }),
);

export const FormItem = ({
  label,
  children,
  required,
  vertical = false,
  tooltip,
  extra,
}: {
  label?: string | React.ReactNode;
  children?: React.ReactNode;
  required?: boolean;
  vertical?: boolean;
  tooltip?: React.ReactNode;
  extra?: React.ReactNode;
}) => {
  return (
    <StyledFormItem vertical={vertical}>
      <StyledFormLabel
        required={required}
        sx={{
          width: vertical ? '100%' : 156,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Stack direction='row' alignItems='center'>
          {label}
          {tooltip && typeof tooltip === 'string' ? (
            <Tooltip title={tooltip} placement='top' arrow>
              <InfoIcon sx={{ color: 'text.secondary', fontSize: 14, ml: 1 }} />
            </Tooltip>
          ) : (
            tooltip
          )}
        </Stack>
        {extra}
      </StyledFormLabel>
      {children}
    </StyledFormItem>
  );
};

const StyleSettingCardTitle = styled('div')(({ theme }) => ({
  fontWeight: 'bold',
  padding: theme.spacing(2, 1.5),
  backgroundColor: theme.palette.background.paper2,
}));

export const SettingCard = ({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) => {
  return (
    <Card sx={{ pb: 2 }}>
      <StyleSettingCardTitle>{title}</StyleSettingCardTitle>
      {children}
    </Card>
  );
};

const StyledSettingCardItem = styled('div')(({ theme }) => ({
  '&:not(:last-child)': {
    borderBottom: `1px solid ${theme.palette.divider}`,
    paddingBottom: theme.spacing(2),
  },
}));

const StyledSettingCardItemTitleWrapper = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  margin: theme.spacing(2),
  height: 32,
  fontWeight: 'bold',
}));

const StyledSettingCardItemTitle = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  '&::before': {
    content: '""',
    display: 'inline-block',
    width: 4,
    height: 12,
    backgroundColor: theme.palette.common.black,
    borderRadius: '2px',
    marginRight: theme.spacing(1),
  },
}));

const StyledSettingCardItemContent = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  padding: theme.spacing(0, 2),
}));

export const SettingCardItem = ({
  children,
  title,
  isEdit,
  onSubmit,
}: {
  children?: React.ReactNode;
  title?: React.ReactNode;
  isEdit: boolean;
  onSubmit: () => void;
}) => {
  return (
    <StyledSettingCardItem>
      <StyledSettingCardItemTitleWrapper>
        <StyledSettingCardItemTitle>{title}</StyledSettingCardItemTitle>
        {isEdit && (
          <Button variant='contained' size='small' onClick={onSubmit}>
            保存
          </Button>
        )}
      </StyledSettingCardItemTitleWrapper>
      <StyledSettingCardItemContent>{children}</StyledSettingCardItemContent>
    </StyledSettingCardItem>
  );
};
