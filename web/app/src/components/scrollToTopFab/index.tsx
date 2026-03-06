'use client';

import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { Fab, Zoom } from '@mui/material';
import { useEffect, useState } from 'react';

interface ScrollToTopFabProps {
  scrollContainerId?: string;
  threshold?: number;
}

const ScrollToTopFab = ({
  scrollContainerId = 'scroll-container',
  threshold = 300,
}: ScrollToTopFabProps) => {
  const [show, setShow] = useState(false);

  const handleScroll = () => {
    const container = document.getElementById(scrollContainerId);
    setShow(container ? container.scrollTop > threshold : false);
  };

  const scrollToTop = () => {
    const container = document.getElementById(scrollContainerId);
    container?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const container = document.getElementById(scrollContainerId);
    container?.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, [scrollContainerId]);

  return (
    <Zoom in={show}>
      <Fab
        size='small'
        onClick={scrollToTop}
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 16,
          zIndex: 10000,
          backgroundColor: 'background.paper3',
          color: 'text.primary',
          '&:hover': { backgroundColor: 'background.paper2' },
        }}
      >
        <KeyboardArrowUpIcon sx={{ fontSize: 24 }} />
      </Fab>
    </Zoom>
  );
};

export default ScrollToTopFab;
