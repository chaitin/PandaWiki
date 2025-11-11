'use client';
import React from 'react';
import { Box, Divider, Stack, Link, alpha } from '@mui/material';
import { useState } from 'react';
import { IconDianhua, IconWeixingongzhonghao } from '@panda-wiki/icons';
import Overlay from './Overlay';
import { DocWidth } from '../constants';
import { PROJECT_NAME } from '../constants';
import { decodeBase64 } from '../utils';

interface DomainSocialMediaAccount {
  channel?: string;
  icon?: string;
  link?: string;
  text?: string;
  phone?: string;
}

interface CustomStyle {
  allow_theme_switching?: boolean;
  header_search_placeholder?: string;
  show_brand_info?: boolean;
  social_media_accounts?: DomainSocialMediaAccount[];
  footer_show_intro?: boolean;
}

export interface BrandGroup {
  name: string;
  links: {
    name: string;
    url: string;
  }[];
}

interface FooterSetting {
  footer_style: 'simple' | 'complex';
  corp_name: string;
  icp: string;
  brand_name: string;
  brand_desc: string;
  brand_logo: string;
  brand_groups: BrandGroup[];
}

const Footer = React.memo(
  ({
    mobile,
    catalogWidth,
    showBrand = true,
    isDocPage = false,
    docWidth = 'full',
    customStyle,
    footerSetting,
    logo,
  }: {
    mobile?: boolean;
    catalogWidth?: number;
    showBrand?: boolean;
    isDocPage?: boolean;
    docWidth?: string;
    customStyle?: CustomStyle;
    footerSetting?: FooterSetting;
    logo?: string;
  }) => {
    const [curOverlayType, setCurOverlayType] = useState('');
    const [open, setOpen] = useState(false);
    const [wechatData, setWechatData] = useState<{ src: string; text: string }>(
      {
        src: '',
        text: '',
      },
    );
    const [phoneData, setPhoneData] = useState<{ phone: string; text: string }>(
      {
        phone: '',
        text: '',
      },
    );

    if (mobile)
      return (
        <>
          <Box
            id='footer'
            sx={theme => ({
              position: 'relative',
              fontSize: '12px',
              fontWeight: 'normal',
              zIndex: 1,
              px: 3,
              bgcolor: alpha(theme.palette.text.primary, 0.05),
              borderTop: '1px solid',
              borderColor: 'divider',
              width: '100%',
              '.MuiLink-root': {
                color: 'inherit',
              },
            })}
          >
            {showBrand && (
              <Box
                pt={
                  customStyle?.footer_show_intro
                    ? 5
                    : (footerSetting?.brand_groups?.length || 0) > 0
                      ? 5
                      : 0
                }
              >
                {customStyle?.footer_show_intro !== false && (
                  <Box sx={{ mb: 3 }}>
                    <Stack direction={'row'} alignItems={'center'} gap={1}>
                      {footerSetting?.brand_logo && (
                        <img
                          src={footerSetting.brand_logo}
                          alt='LiteWiki'
                          height={24}
                        />
                      )}
                      <Box
                        sx={{
                          fontWeight: 'bold',
                          lineHeight: '32px',
                          fontSize: 24,
                          color: 'white',
                        }}
                      >
                        {footerSetting?.brand_name}
                      </Box>
                    </Stack>
                    {footerSetting?.brand_desc && (
                      <Box
                        sx={{
                          fontSize: 12,
                          lineHeight: '26px',
                          mt: 2,
                          color: 'rgba(255, 255, 255, 0.70)',
                        }}
                      >
                        {footerSetting.brand_desc}
                      </Box>
                    )}
                    <Stack direction={'column'} gap={2.5} mt={2}>
                      {customStyle?.social_media_accounts?.map(
                        (account, index) => {
                          return (
                            <Stack
                              direction={'row'}
                              key={index}
                              sx={theme => ({
                                position: 'relative',
                                color: alpha(theme.palette.text.primary, 0.7),
                              })}
                              gap={1}
                              onClick={() => {
                                setCurOverlayType(account.channel || '');
                                if (account.channel === 'phone') {
                                  setPhoneData({
                                    phone: account.phone || '',
                                    text: account.text || '',
                                  });
                                  setOpen(true);
                                }
                                if (account.channel === 'wechat_oa') {
                                  setWechatData({
                                    src: account.icon || '',
                                    text: account.text || '',
                                  });
                                  setOpen(true);
                                }
                              }}
                            >
                              {account.channel === 'wechat_oa' && (
                                <IconWeixingongzhonghao
                                  sx={{ fontSize: '20px', color: 'inherit' }}
                                />
                              )}
                              {account.channel === 'phone' && (
                                <IconDianhua
                                  sx={{ fontSize: '20px', color: 'inherit' }}
                                ></IconDianhua>
                              )}
                              <Box
                                sx={{
                                  lineHeight: '24px',
                                  fontSize: '14px',
                                  color: 'inherit',
                                }}
                              >
                                {account.text}
                              </Box>
                              {account.channel === 'wechat_oa' &&
                                (account?.text || account?.icon) && (
                                  <Stack
                                    direction={'column'}
                                    alignItems={'center'}
                                    bgcolor={'#fff'}
                                    p={1.5}
                                    sx={theme => ({
                                      position: 'absolute',
                                      bottom: '100%',
                                      transform: 'translateY(-10px)',
                                      left: 0,
                                      boxShadow:
                                        ' 0px 4px 8px 0px ' +
                                        alpha(theme.palette.text.primary, 0.25),
                                      borderRadius: '4px',
                                      bgcolor: theme.palette.background.default,
                                    })}
                                    gap={1}
                                    display={'none'}
                                    zIndex={999}
                                  >
                                    {account.icon && (
                                      <img
                                        src={account.icon}
                                        width={83}
                                        height={83}
                                      ></img>
                                    )}
                                    {account.text && (
                                      <Box
                                        sx={{
                                          fontSize: '12px',
                                          lineHeight: '16px',
                                          color: '#21222D',
                                          maxWidth: '83px',

                                          textAlign: 'center',
                                        }}
                                      >
                                        {account.text}
                                      </Box>
                                    )}
                                  </Stack>
                                )}
                            </Stack>
                          );
                        },
                      )}
                    </Stack>
                  </Box>
                )}

                <Stack direction={'row'} flexWrap={'wrap'} gap={2}>
                  {footerSetting?.brand_groups?.map((group, idx) => (
                    <Stack
                      gap={1}
                      key={group.name}
                      sx={{
                        fontSize: 14,
                        lineHeight: '22px',
                        width: 'calc(50% - 8px)',
                        ...(idx > 1 && {
                          mt: 1,
                        }),
                        '& a:hover': {
                          color: 'primary.main',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          fontSize: 16,
                          lineHeight: '24px',
                          mb: 1,
                          color: '#ffffff',
                        }}
                      >
                        {group.name}
                      </Box>
                      {group.links?.map(link => (
                        <Box
                          sx={theme => ({
                            color: alpha(theme.palette.text.primary, 0.5),
                          })}
                          key={link.name}
                        >
                          <Link
                            href={link?.url || ''}
                            target='_blank'
                            key={link.name}
                          >
                            {link.name}
                          </Link>
                        </Box>
                      ))}
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}
            {!(
              customStyle?.footer_show_intro === false &&
              footerSetting?.brand_groups?.length === 0
            ) && (
              <Stack
                sx={theme => ({
                  height: '1px',
                  width: '100%',
                  bgcolor: alpha(theme.palette.text.primary, 0.1),
                  mt: 5,
                  mb: 3,
                })}
              ></Stack>
            )}

            {!!footerSetting?.corp_name && (
              <Box
                sx={theme => ({
                  height: 40,
                  lineHeight: '40px',
                  color: alpha(theme.palette.text.primary, 0.3),
                })}
              >
                {footerSetting?.corp_name}
              </Box>
            )}
            {!!footerSetting?.icp && (
              <Box
                sx={{
                  height: 40,
                  lineHeight: '40px',
                  color: 'rgba(255, 255, 255, 0.30)',
                }}
              >
                {footerSetting?.icp}
              </Box>
            )}
            {customStyle?.show_brand_info !== false && (
              <Stack
                direction={'row'}
                alignItems={'center'}
                gap={0.5}
                sx={theme => ({
                  height: 40,
                  lineHeight: '40px',
                  color: alpha(theme.palette.text.primary, 0.3),
                })}
              >
                <Link href={'https://wiki.webinfra.cloud/'} target='_blank'>
                  <Stack
                    direction={'row'}
                    alignItems={'center'}
                    gap={0.5}
                    sx={{
                      cursor: 'pointer',
                    }}
                  >
                    <Box>{decodeBase64(PROJECT_NAME)}</Box>
                    <img src={logo} alt='LiteWiki' width={0} height={0} />
                  </Stack>
                </Link>
              </Stack>
            )}
          </Box>
          <Overlay open={open} onClose={setOpen}>
            <Stack
              sx={theme => ({
                width: '270px',
                alignItems: 'center',
                borderRadius: '4px',
                boxShadow:
                  '0px 4px 8px 0px ' + alpha(theme.palette.text.primary, 0.25),
                bgcolor: theme.palette.background.default,
                padding: 3,
              })}
              gap={2}
            >
              {curOverlayType === 'wechat_oa' && (
                <>
                  <img
                    src={wechatData?.src}
                    width={'222px'}
                    height={'222px'}
                  ></img>
                  <Box
                    sx={theme => ({
                      fontSize: '24px',
                      lineHeight: '32px',
                      color: theme.palette.text.primary,
                    })}
                  >
                    {wechatData?.text}
                  </Box>
                </>
              )}
              {curOverlayType === 'phone' && (
                <>
                  <Box
                    sx={theme => ({
                      fontSize: '24px',
                      lineHeight: '32px',
                      color: theme.palette.text.primary,
                      width: '100%',
                    })}
                    onClick={() => {
                      window.location.href = `tel:${phoneData?.phone}`;
                    }}
                  >
                    {phoneData?.phone}
                  </Box>
                  <Stack
                    direction={'row'}
                    alignItems={'center'}
                    width={'100%'}
                    sx={theme => ({
                      fontSize: '24px',
                      lineHeight: '32px',
                      color: theme.palette.text.primary,
                    })}
                    gap={1}
                  >
                    <IconDianhua
                      sx={theme => ({
                        fontSize: '24px',
                        color: alpha(theme.palette.text.primary, 0.7),
                      })}
                    ></IconDianhua>
                    <Box
                      sx={theme => ({
                        fontSize: '24px',
                        lineHeight: '32px',
                        color: theme.palette.text.primary,
                      })}
                    >
                      {phoneData?.text}
                    </Box>
                  </Stack>
                </>
              )}
            </Stack>
          </Overlay>
        </>
      );

    return (
      <Box
        id='footer'
        style={{
          width: '100%',
        }}
        sx={theme => ({
          px: mobile ? 3 : 5,
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          fontSize: '12px',
          zIndex: 1,
          color: '#fff',
          bgcolor: alpha(theme.palette.text.primary, 0.05),
          '.MuiLink-root': {
            color: 'inherit',
          },
        })}
      >
        <Box
          sx={{
            width: '100%',

            // ...(isDocPage &&
            //   !mobile &&
            //   docWidth !== 'full' && {
            //     width: `calc(${DocWidth[docWidth as keyof typeof DocWidth].value}px + ${catalogWidth}px + 192px + 240px)`,
            //     // width:
            //     //   DocWidth[docWidth as keyof typeof DocWidth].value +
            //     //   catalogWidth +
            //     //   192 +
            //     //   240,
            //     // maxWidth: `calc(100% - 265px - 192px)`,
            //     // maxWidth: `calc(100vw - 80px)`,
            //     // ...(docWidth !== 'full' && {
            //     //   width: `calc(${catalogWidth}px + 192px + 264px + ${DocWidth[docWidth as keyof typeof DocWidth].value}px)`,
            //     // }),
            //   }),
          }}
        >
          {showBrand && (
            <Box
              py={
                customStyle?.footer_show_intro
                  ? 6
                  : (footerSetting?.brand_groups?.length || 0) > 0
                    ? 6
                    : 0
              }
            >
              <Stack
                direction={'row'}
                gap={10}
                justifyContent={
                  customStyle?.footer_show_intro === false
                    ? 'center'
                    : 'flex-start'
                }
              >
                {customStyle?.footer_show_intro !== false && (
                  <Stack
                    direction={'column'}
                    sx={{ width: '30%', minWidth: 200 }}
                    gap={3}
                  >
                    <Stack direction={'row'} alignItems={'center'} gap={1}>
                      {footerSetting?.brand_logo && (
                        <img
                          src={footerSetting.brand_logo}
                          alt='LiteWiki'
                          height={36}
                        />
                      )}
                      <Box
                        sx={{
                          fontWeight: 'bold',
                          lineHeight: '32px',
                          fontSize: 24,
                          color: 'text.primary',
                        }}
                      >
                        {footerSetting?.brand_name}
                      </Box>
                    </Stack>

                    {footerSetting?.brand_desc && (
                      <Box
                        sx={theme => ({
                          fontSize: 14,
                          lineHeight: '26px',
                          color: alpha(theme.palette.text.primary, 0.7),
                        })}
                      >
                        {footerSetting.brand_desc}
                      </Box>
                    )}
                    <Stack direction={'column'} gap={'26px'}>
                      {customStyle?.social_media_accounts?.map(
                        (account, index) => {
                          return (
                            <Stack
                              direction={'row'}
                              key={index}
                              sx={theme => ({
                                position: 'relative',
                                '&:hover': {
                                  color: theme.palette.primary.main,
                                },
                                '&:hover .popup': {
                                  display: 'flex !important',
                                },
                                color: alpha(theme.palette.text.primary, 0.7),
                                cursor: 'default',
                              })}
                              gap={1}
                            >
                              {account.channel === 'wechat_oa' && (
                                <IconWeixingongzhonghao
                                  sx={{ fontSize: '20px', color: 'inherit' }}
                                ></IconWeixingongzhonghao>
                              )}
                              {account.channel === 'phone' && (
                                <IconDianhua
                                  sx={{ fontSize: '20px', color: 'inherit' }}
                                ></IconDianhua>
                              )}

                              <Box
                                sx={{
                                  lineHeight: '24px',
                                  fontSize: '14px',
                                  color: 'inherit',
                                }}
                              >
                                {account.text}
                              </Box>
                              {account.channel === 'wechat_oa' &&
                                (account?.text || account?.icon) && (
                                  <Stack
                                    className={'popup'}
                                    direction={'column'}
                                    alignItems={'center'}
                                    bgcolor={'#fff'}
                                    p={1.5}
                                    sx={theme => ({
                                      position: 'absolute',
                                      top: '40px',
                                      left: 0,
                                      boxShadow:
                                        ' 0px 4px 8px 0px ' +
                                        alpha(theme.palette.text.primary, 0.25),
                                      borderRadius: '4px',
                                      bgcolor: theme.palette.background.default,
                                    })}
                                    gap={1}
                                    display={'none'}
                                    zIndex={999}
                                  >
                                    {account.icon && (
                                      <img
                                        src={account.icon}
                                        width={120}
                                        height={120}
                                      ></img>
                                    )}
                                    {account.text && (
                                      <Box
                                        sx={{
                                          fontSize: '12px',
                                          lineHeight: '16px',
                                          color: 'text.primary',
                                          maxWidth: '120px',
                                          textAlign: 'center',
                                        }}
                                      >
                                        {account.text}
                                      </Box>
                                    )}
                                  </Stack>
                                )}
                              {account.channel === 'phone' &&
                                account?.phone && (
                                  <Stack
                                    className={'popup'}
                                    bgcolor={'#fff'}
                                    px={1.5}
                                    py={1}
                                    sx={theme => ({
                                      position: 'absolute',
                                      bottom: '100%',
                                      transform: 'translateY(-10px)',
                                      left: 0,
                                      boxShadow:
                                        '0px 4px 8px 0px ' +
                                        alpha(theme.palette.text.primary, 0.25),
                                      borderRadius: '4px',
                                      bgcolor: theme.palette.background.default,
                                    })}
                                    display={'none'}
                                    zIndex={999}
                                  >
                                    {account.phone && (
                                      <Box
                                        sx={{
                                          fontSize: '12px',
                                          lineHeight: '16px',
                                          color: 'text.primary',
                                          textAlign: 'center',
                                        }}
                                      >
                                        {account.phone}
                                      </Box>
                                    )}
                                  </Stack>
                                )}
                            </Stack>
                          );
                        },
                      )}
                    </Stack>
                  </Stack>
                )}

                <Stack
                  direction={'row'}
                  width={'100%'}
                  justifyContent={'flex-start'}
                  flexWrap='wrap'
                >
                  {footerSetting?.brand_groups?.map(group => (
                    <Stack
                      gap={1.5}
                      key={group.name}
                      sx={{
                        flex: '0 0 33.33%',
                        fontSize: 14,
                        lineHeight: '22px',
                        minWidth: '100px',
                        '& a:hover': {
                          color: 'primary.main',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          fontSize: 16,
                          lineHeight: '24px',
                          mb: 1,
                          color: 'text.primary',
                        }}
                      >
                        {group.name}
                      </Box>
                      {group.links?.map(link => (
                        <Box
                          sx={theme => ({
                            color: alpha(theme.palette.text.primary, 0.5),
                          })}
                          key={link.name}
                        >
                          <Link
                            href={link?.url || ''}
                            target='_blank'
                            key={link.name}
                          >
                            {link.name}
                          </Link>
                        </Box>
                      ))}
                    </Stack>
                  ))}
                </Stack>
              </Stack>
            </Box>
          )}
          {!(
            customStyle?.footer_show_intro === false &&
            footerSetting?.brand_groups?.length === 0
          ) && (
            <Stack
              sx={theme => ({
                bgcolor: alpha(theme.palette.text.primary, 0.1),
                width: '100%',
                height: '1px',
              })}
            ></Stack>
          )}
          <Box
            sx={{
              height: 40,
              lineHeight: '40px',
              textAlign: 'center',
            }}
          >
            <Stack
              direction={'row'}
              alignItems={'center'}
              justifyContent={'center'}
            >
              <Stack
                direction={'row'}
                alignItems={'center'}
                gap={1}
                sx={theme => ({
                  color: alpha(theme.palette.text.primary, 0.5),
                })}
              >
                {!!footerSetting?.corp_name && (
                  <Box>{footerSetting?.corp_name}</Box>
                )}
                {!!footerSetting?.icp && (
                  <>
                    <Divider
                      orientation='vertical'
                      sx={theme => ({
                        mx: 0.5,
                        height: 16,
                        borderColor: alpha(theme.palette.text.primary, 0.1),
                      })}
                    />
                    <Link href={`https://beian.miit.gov.cn/`} target='_blank'>
                      {footerSetting?.icp}
                    </Link>
                  </>
                )}
                {customStyle?.show_brand_info !== false && (
                  <>
                    {(footerSetting?.corp_name || footerSetting?.icp) && (
                      <Divider
                        orientation='vertical'
                        sx={theme => ({
                          mx: 0.5,
                          height: 16,
                          borderColor: alpha(theme.palette.text.primary, 0.1),
                        })}
                      />
                    )}
                    <Stack
                      direction={'row'}
                      alignItems={'center'}
                      gap={0.5}
                      sx={theme => ({
                        color: alpha(theme.palette.text.primary, 0.5),
                      })}
                    >
                      <Link
                        href={'https://wiki.webinfra.cloud/'}
                        target='_blank'
                      >
                        <Stack
                          direction={'row'}
                          alignItems={'center'}
                          gap={0.5}
                          sx={{
                            cursor: 'pointer',
                            '&:hover': {
                              color: 'primary.main',
                            },
                          }}
                        >
                          <Box>{decodeBase64(PROJECT_NAME)}</Box>
                          <img src={logo} alt='LiteWiki' width={0} height={0} />
                        </Stack>
                      </Link>
                    </Stack>
                  </>
                )}
              </Stack>
            </Stack>
          </Box>
        </Box>
      </Box>
    );
  },
);

export default Footer;
