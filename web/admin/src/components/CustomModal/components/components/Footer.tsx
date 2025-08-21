import { Box, IconButton, Stack } from '@mui/material';
import { AppSetting } from '@/api';
import { Icon } from '@ctzhian/ui';
import { Option } from '../config/FooterConfig';
import Logo from '@/assets/images/logo-dark.png';
import Overlay from '../basicComponents/Overlay';
import { useState } from 'react';
interface FooterProps {
  settings: Partial<AppSetting>;
  renderMode: 'pc' | 'mobile';
  options: Option[];
}

const Footer = ({ settings, renderMode, options }: FooterProps) => {
  const {
    corp_name = '',
    icp = '',
    brand_name = '',
    brand_desc = '',
    brand_logo = '',
    brand_groups = [],
  } = settings.footer_settings || {};
  const {
    show_brand_info = 'false',
    social_media_accounts = [],
    footer_show_intro = true,
  } = settings?.web_app_custom_style || {};
  const [curOverlayType, setCurOverlayType] = useState('');
  const [open, setOpen] = useState(false);
  const [wechatData, setWechatData] = useState<{ src: string; text: string }>({
    src: '',
    text: '',
  });
  const [phoneData, setPhoneData] = useState<{ phone: string; text: string }>({
    phone: '',
    text: '',
  });
  return (
    <>
      {renderMode === 'pc' && (
        <Stack
          direction={'column'}
          sx={{
            position: 'sticky',
            bottom: 0,
            paddingX: '15%',
            bgcolor: 'background.footer',
            maxWidth: '100%',
            minWidth: 0,
          }}
        >
          <Stack
            direction='row'
            py={footer_show_intro ? 6 : brand_groups.length > 0 ? 6 : 0}
          >
            {footer_show_intro !== false && (
              <Stack direction={'column'} gap={3} sx={{ width: '300px' }}>
                <Stack direction={'row'} gap={2} alignItems={'center'}>
                  {brand_logo ? <img src={brand_logo} height={24} /> : null}
                  <Box
                    sx={{
                      fontSize: '24px',
                      lineHeight: '32px',
                      fontWeight: 'bold',
                      color: 'white',
                    }}
                  >
                    {brand_name}
                  </Box>
                </Stack>
                <Box
                  sx={{
                    width: '260px',
                    color: 'rgba(255, 255, 255, 0.70)',
                    lineHeight: '24px',
                    fontSize: '12px',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {brand_desc}
                </Box>
                <Stack direction={'column'} gap={'26px'}>
                  {social_media_accounts?.map((account, index) => {
                    return (
                      <Stack
                        direction={'row'}
                        key={index}
                        sx={{
                          position: 'relative',
                          '&:hover': { color: '#fff' },
                          '&:hover .popup': { display: 'flex !important' },
                          color: 'rgba(255, 255, 255, 0.70)',
                        }}
                        gap={1}
                      >
                        <Icon
                          type={
                            options.find(item => item.key === account.channel)
                              ?.type || ''
                          }
                          sx={{
                            fontSize: '20px',
                            color: 'inherit',
                          }}
                        />
                        <Box
                          sx={{
                            lineHeight: '24px',
                            fontSize: '12px',
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
                              sx={{
                                position: 'absolute',
                                bottom: '100%',
                                transform: 'translateY(-10px)',
                                left: 0,
                                boxShadow:
                                  ' 0px 4px 8px 0px rgba(255,255,255,0.25)',
                                borderRadius: '4px',
                              }}
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
                                    color: '#21222D',
                                    maxWidth: '120px',
                                    textAlign: 'center',
                                  }}
                                >
                                  {account.text}
                                </Box>
                              )}
                            </Stack>
                          )}
                        {account.channel === 'phone' && account?.phone && (
                          <Stack
                            className={'popup'}
                            bgcolor={'#fff'}
                            px={1.5}
                            py={1}
                            sx={{
                              position: 'absolute',
                              bottom: '100%',
                              transform: 'translateY(-10px)',
                              left: 0,
                              boxShadow:
                                ' 0px 4px 8px 0px rgba(255,255,255,0.25)',
                              borderRadius: '4px',
                            }}
                            display={'none'}
                            zIndex={999}
                          >
                            {account.phone && (
                              <Box
                                sx={{
                                  fontSize: '12px',
                                  lineHeight: '16px',
                                  color: '#21222D',
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
                  })}
                </Stack>
              </Stack>
            )}

            <Stack
              direction={'row'}
              width={'100%'}
              justifyContent={
                brand_groups.length > 1 ? 'space-around' : 'flex-start'
              }
            >
              {brand_groups.length > 0 &&
                brand_groups.map((group, index) => {
                  return (
                    <Stack direction={'column'} key={index}>
                      <Box
                        sx={{
                          fontWeight: 600,
                          fontSize: '14px',
                          color: '#ffffff',
                          lineHeight: '22px',
                          marginBottom: '24px',
                        }}
                      >
                        {group.name}
                      </Box>
                      <Stack gap={2}>
                        {group.links.map((link, index) => {
                          return (
                            <Box
                              key={index}
                              gap={2}
                              sx={{
                                fontWeight: 300,
                                fontSize: '12px',
                                lineHeight: '20px',
                                color: 'rgba(255,255,255,0.5)',
                              }}
                            >
                              {link.name}
                            </Box>
                          );
                        })}
                      </Stack>
                    </Stack>
                  );
                })}
            </Stack>
          </Stack>

          {!(footer_show_intro === false && brand_groups.length === 0) && (
            <Stack
              sx={{
                bgcolor: 'rgba(236, 238, 241, 0.10)',
                width: '100%',
                height: '1px',
                mt: 2,
              }}
            ></Stack>
          )}

          <Stack
            direction={'row'}
            alignItems={'center'}
            justifyContent={'center'}
            sx={{ marginX: 'auto', marginTop: '23px' }}
          >
            {corp_name && (
              <Stack
                sx={{
                  fontSize: '12px',
                  lineHeight: '24px',
                  color: 'rgba(255, 255, 255, 0.30)',
                }}
              >
                {corp_name}
              </Stack>
            )}

            {icp && (
              <>
                <Stack
                  sx={{
                    height: '10px',
                    width: '1px',
                    bgcolor: 'rgba(255, 255, 255, 0.10)',
                    mx: '12px',
                  }}
                ></Stack>
                <Stack
                  sx={{
                    fontSize: '12px',
                    lineHeight: '24px',
                    color: 'rgba(255, 255, 255, 0.30)',
                  }}
                >
                  {icp}
                </Stack>
              </>
            )}
            {show_brand_info && (
              <>
                {(icp || corp_name) && (
                  <Stack
                    sx={{
                      height: '10px',
                      width: '1px',
                      bgcolor: 'rgba(255, 255, 255, 0.10)',
                      mx: '12px',
                    }}
                  ></Stack>
                )}

                <Stack
                  direction={'row'}
                  alignItems={'center'}
                  sx={{
                    fontSize: '12px',
                    lineHeight: '24px',
                    color: '#FFFFFF',
                  }}
                  // onClick={() => {
                  //   window.open('https://pandawiki.docs.baizhi.cloud/');
                  // }}
                  gap={0.5}
                >
                  <img src={Logo} alt='PandaWiki' width={16} height={16} />
                  本网站由 PandaWiki 提供技术支持
                </Stack>
              </>
            )}
          </Stack>
        </Stack>
      )}
      {renderMode === 'mobile' && (
        <>
          <Stack
            direction={'column'}
            sx={{
              position: 'sticky',
              bottom: 0,
              p: 3,
              bgcolor: 'background.footer',
              maxWidth: '100%',
              minWidth: 0,
            }}
          >
            {footer_show_intro !== false && (
              <Stack direction={'column'} gap={2}>
                <Stack direction={'row'} gap={2} alignItems={'center'}>
                  {brand_logo ? (
                    <img src={brand_logo} width={24} height={24} />
                  ) : null}
                  <Box
                    sx={{
                      fontSize: '24px',
                      lineHeight: '32px',
                      fontWeight: 'bold',
                      color: 'white',
                    }}
                  >
                    {brand_name}
                  </Box>
                </Stack>
                <Box
                  sx={{
                    width: '260px',
                    color: 'rgba(255, 255, 255, 0.70)',
                    lineHeight: '24px',
                    fontSize: '12px',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {brand_desc}
                </Box>
                <Stack direction={'column'} gap={2.5}>
                  {social_media_accounts?.map((account, index) => {
                    return (
                      <Stack
                        direction={'row'}
                        key={index}
                        sx={{
                          position: 'relative',
                          color: 'rgba(255, 255, 255, 0.70)',
                        }}
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
                        <Icon
                          type={
                            options.find(item => item.key === account.channel)
                              ?.type!
                          }
                          sx={{
                            fontSize: '20px',
                            color: 'inherit',
                          }}
                        />
                        <Box
                          sx={{
                            lineHeight: '24px',
                            fontSize: '12px',
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
                              sx={{
                                position: 'absolute',
                                top: '40px',
                                left: 0,
                                boxShadow:
                                  ' 0px 4px 8px 0px rgba(255,255,255,0.25)',
                                borderRadius: '4px',
                              }}
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
                  })}
                </Stack>
              </Stack>
            )}

            <Stack
              direction={'row'}
              width={'100%'}
              flexWrap={'wrap'}
              rowGap={3}
              mt={footer_show_intro ? 5 : brand_groups.length > 0 ? 5 : 0}
            >
              {brand_groups.length > 0 &&
                brand_groups.map((group, index) => {
                  return (
                    <Stack
                      direction={'column'}
                      key={index}
                      sx={{ width: '50%' }}
                    >
                      <Box
                        sx={{
                          fontWeight: 600,
                          fontSize: '14px',
                          color: '#ffffff',
                          lineHeight: '22px',
                          marginBottom: '24px',
                        }}
                      >
                        {group.name}
                      </Box>
                      <Stack gap={2}>
                        {group.links.map((link, index) => {
                          return (
                            <Box
                              key={index}
                              gap={2}
                              sx={{
                                fontWeight: 300,
                                fontSize: '12px',
                                lineHeight: '20px',
                                color: 'rgba(255,255,255,0.5)',
                              }}
                            >
                              {link.name}
                            </Box>
                          );
                        })}
                      </Stack>
                    </Stack>
                  );
                })}
            </Stack>
            {!(footer_show_intro === false && brand_groups.length === 0) && (
              <Stack
                sx={{
                  height: '1px',
                  width: '100%',
                  bgcolor: 'rgba(255, 255, 255, 0.10)',
                  mt: 5,
                  mb: 3,
                }}
              ></Stack>
            )}

            <Stack direction={'column'} gap={0.5}>
              {corp_name && (
                <Stack
                  sx={{
                    fontSize: '12px',
                    lineHeight: '24px',
                    color: 'rgba(255, 255, 255, 0.30)',
                  }}
                >
                  {corp_name}
                </Stack>
              )}
              {icp && (
                <Stack
                  sx={{
                    fontSize: '12px',
                    lineHeight: '24px',
                    color: 'rgba(255, 255, 255, 0.30)',
                  }}
                >
                  {icp}
                </Stack>
              )}
              {show_brand_info && (
                <Stack
                  direction={'row'}
                  alignItems={'center'}
                  sx={{
                    fontSize: '12px',
                    lineHeight: '24px',
                    color: '#FFFFFF',
                  }}
                  // onClick={() => {
                  //   window.open('https://pandawiki.docs.baizhi.cloud/');
                  // }}
                  gap={0.5}
                >
                  <img src={Logo} alt='PandaWiki' width={16} height={16} />
                  本网站由 PandaWiki 提供技术支持
                </Stack>
              )}
            </Stack>
          </Stack>
          <Overlay open={open} onClose={setOpen}>
            <Stack
              sx={{
                width: '270px',
                alignItems: 'center',
                borderRadius: '4px',
                boxShadow: '0px 4px 8px 0px rgba(255,255,255,0.25)',
                bgcolor: '#fff',
                padding: 3,
              }}
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
                    sx={{
                      fontSize: '24px',
                      lineHeight: '32px',
                      color: '#000',
                    }}
                  >
                    {wechatData?.text}
                  </Box>
                </>
              )}
              {curOverlayType === 'phone' && (
                <>
                  <Box
                    sx={{
                      fontSize: '24px',
                      lineHeight: '32px',
                      color: '#000',
                      width: '100%',
                    }}
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
                    sx={{
                      fontSize: '24px',
                      lineHeight: '32px',
                      color: '#000',
                    }}
                    gap={1}
                  >
                    <Icon
                      type={
                        options.find(item => item.key === 'phone')?.type || ''
                      }
                      sx={{
                        fontSize: '22px',
                        color: 'rgba(33, 34, 45, 0.70)',
                      }}
                    />
                    <Box
                      sx={{
                        fontSize: '24px',
                        lineHeight: '32px',
                        color: '#000',
                      }}
                    >
                      {phoneData?.text}
                    </Box>
                  </Stack>
                </>
              )}
            </Stack>
          </Overlay>
        </>
      )}
    </>
  );
};

export default Footer;
