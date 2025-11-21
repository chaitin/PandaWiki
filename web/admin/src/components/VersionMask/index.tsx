import { VersionInfoMap } from '@/constant/version';
import { useVersionInfo } from '@/hooks';
import { ConstsLicenseEdition } from '@/request/types';
import { styled, SxProps, Tooltip } from '@mui/material';
import React from 'react';

const StyledMaskWrapper = styled('div')(({ theme }) => ({
  position: 'relative',
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));

const StyledMask = styled('div')(({ theme }) => ({
  position: 'absolute',
  inset: -8,
  zIndex: 99,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flex: 1,
  borderRadius: '10px',
  border: `1px solid ${theme.palette.divider}`,
  background: 'rgba(241,242,248,0.8)',
  backdropFilter: 'blur(0.5px)',
}));

const StyledMaskContent = styled('div')(({ theme }) => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledMaskVersion = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  padding: theme.spacing(0.5, 1),
  backgroundColor: theme.palette.background.paper3,
  borderRadius: '10px',
  fontSize: 12,
  lineHeight: 1,
  color: theme.palette.light.main,
}));

const VersionMask = ({
  permission = [
    ConstsLicenseEdition.LicenseEditionFree,
    ConstsLicenseEdition.LicenseEditionProfession,
    ConstsLicenseEdition.LicenseEditionBusiness,
    ConstsLicenseEdition.LicenseEditionEnterprise,
  ],
  children,
  wrapperSx,
  sx,
}: {
  permission?: ConstsLicenseEdition[];
  children?: React.ReactNode;
  wrapperSx?: SxProps;
  sx?: SxProps;
}) => {
  const versionInfo = useVersionInfo();
  const hasPermission = permission.includes(versionInfo.permission);
  if (hasPermission) return children;
  const nextVersionInfo = VersionInfoMap[permission[0]];

  return (
    <StyledMaskWrapper sx={wrapperSx}>
      {children}
      <StyledMask sx={sx}>
        <StyledMaskContent>
          <StyledMaskVersion sx={{ backgroundColor: nextVersionInfo.bgColor }}>
            <img
              src={nextVersionInfo.image}
              style={{ width: 12, objectFit: 'contain', marginTop: 1 }}
              alt={nextVersionInfo.label}
            />
            {nextVersionInfo?.label}可用
          </StyledMaskVersion>
        </StyledMaskContent>
      </StyledMask>
    </StyledMaskWrapper>
  );
};

export const VersionCanUse = ({
  permission = [
    ConstsLicenseEdition.LicenseEditionFree,
    ConstsLicenseEdition.LicenseEditionProfession,
    ConstsLicenseEdition.LicenseEditionBusiness,
    ConstsLicenseEdition.LicenseEditionEnterprise,
  ],
  sx,
  mode = 'text',
}: {
  permission?: ConstsLicenseEdition[];
  sx?: SxProps;
  mode?: 'icon' | 'text';
}) => {
  const versionInfo = useVersionInfo();
  const hasPermission = permission.includes(versionInfo.permission);
  if (hasPermission) return null;
  const nextVersionInfo = VersionInfoMap[permission[0]];
  return (
    <StyledMaskContent
      sx={{
        width: 'auto',
        ml: mode === 'icon' ? 0.5 : 1,
        // 允许 Tooltip 在 disabled 的父元素中正常工作
        pointerEvents: 'auto',
        ...sx,
      }}
      onClick={e => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      {mode === 'icon' ? (
        <Tooltip title={nextVersionInfo.label + '可用'} placement='top' arrow>
          <img
            src={nextVersionInfo.image}
            style={{ width: 14, objectFit: 'contain' }}
            alt={nextVersionInfo.label}
          />
        </Tooltip>
      ) : (
        <StyledMaskVersion sx={{ backgroundColor: nextVersionInfo.bgColor }}>
          <img
            src={nextVersionInfo.image}
            style={{ width: 12, objectFit: 'contain', marginTop: 1 }}
            alt={nextVersionInfo.label}
          />
          {nextVersionInfo?.label}可用
        </StyledMaskVersion>
      )}
    </StyledMaskContent>
  );
};

export default VersionMask;
