'use client';

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ChallengeData {
  challenge?: { c?: number; d?: number; s?: number };
  expires?: number;
  token?: string;
}

interface RedeemResult {
  success?: boolean;
  message?: string;
  token?: string;
  expires?: number;
}

const LOCK_KEY = 'pandawiki_captcha_lock';
const LOCK_DURATION = 5 * 60 * 1000; // 5 分钟
const MAX_ATTEMPTS = 3;

async function postJson(url: string, body?: object): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}分${seconds.toString().padStart(2, '0')}秒`;
}

/**
 * 中文数学验证码 Hook。
 * 后端返回两个整数相加，前端用 MUI Dialog 让用户输入答案，校验通过后返回 token。
 * 连续失败 MAX_ATTEMPTS 次后锁定 LOCK_DURATION 毫秒。
 *
 * 注意：使用原生 fetch 直接请求 /share/v1/captcha/*，绕过前端 httpClient 的
 * 统一包装逻辑，以兼容 @cap.js/widget 期望的裸响应格式。
 */
export function useMathCaptcha(basePath: string) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockUntil, setLockUntil] = useState(0);
  const [remaining, setRemaining] = useState(0);

  const tokenRef = useRef('');
  const promiseRef = useRef<{
    resolve: (token: string) => void;
    reject: (reason: Error) => void;
  } | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setValue('');
    setError('');
    setAttemptCount(0);
  }, []);

  const readLockUntil = useCallback((): number => {
    if (typeof window === 'undefined') return 0;
    const raw = localStorage.getItem(LOCK_KEY);
    return raw ? parseInt(raw, 10) : 0;
  }, []);

  const applyLock = useCallback(() => {
    const until = Date.now() + LOCK_DURATION;
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCK_KEY, String(until));
    }
    setLockUntil(until);
    setIsLocked(true);
    setRemaining(LOCK_DURATION);
  }, []);

  const clearLock = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCK_KEY);
    }
    setIsLocked(false);
    setLockUntil(0);
    setRemaining(0);
  }, []);

  const fetchQuestion = useCallback(async (): Promise<string> => {
    const data = (await postJson(
      `${basePath}/share/v1/captcha/challenge`,
    )) as ChallengeData;
    const a = data?.challenge?.d ?? 1;
    const b = data?.challenge?.s ?? 1;
    setQuestion(`${a} + ${b} = ?`);
    const token = data?.token ?? '';
    tokenRef.current = token;
    return token;
  }, [basePath]);

  const checkLocked = useCallback((): boolean => {
    const until = readLockUntil();
    const now = Date.now();
    if (until > now) {
      setLockUntil(until);
      setIsLocked(true);
      setRemaining(until - now);
      return true;
    }
    clearLock();
    return false;
  }, [readLockUntil, clearLock]);

  const requestCaptcha = useCallback(async (): Promise<string> => {
    const locked = checkLocked();
    setOpen(true);
    if (!locked) {
      setAttemptCount(0);
      setValue('');
      setError('');
      await fetchQuestion();
    }
    return new Promise<string>((resolve, reject) => {
      promiseRef.current = { resolve, reject };
    });
  }, [checkLocked, fetchQuestion]);

  const handleConfirm = useCallback(async () => {
    if (isLocked) {
      close();
      promiseRef.current?.reject(new Error('验证已被锁定'));
      promiseRef.current = null;
      return;
    }

    const v = value.trim();
    if (v === '') {
      setError('请输入答案');
      return;
    }
    const answer = parseInt(v, 10);
    if (Number.isNaN(answer)) {
      setError('请输入数字');
      return;
    }

    const result = (await postJson(`${basePath}/share/v1/captcha/redeem`, {
      token: tokenRef.current,
      solutions: [answer],
    })) as RedeemResult;

    if (result?.success) {
      close();
      promiseRef.current?.resolve(result.token ?? tokenRef.current);
      promiseRef.current = null;
      clearLock();
      return;
    }

    const nextAttempt = attemptCount + 1;
    setAttemptCount(nextAttempt);

    if (nextAttempt >= MAX_ATTEMPTS) {
      applyLock();
      setValue('');
      setError('验证失败次数过多，请 5 分钟后重试');
      return;
    }

    setError('验证失败，请重新输入');
    setValue('');
    await fetchQuestion();
  }, [
    basePath,
    value,
    attemptCount,
    isLocked,
    close,
    clearLock,
    applyLock,
    fetchQuestion,
  ]);

  const handleCancel = useCallback(() => {
    close();
    promiseRef.current?.reject(new Error('用户取消验证'));
    promiseRef.current = null;
  }, [close]);

  // 锁定倒计时
  useEffect(() => {
    if (!isLocked || !open) return;
    const tick = () => {
      const now = Date.now();
      const r = Math.max(0, lockUntil - now);
      setRemaining(r);
      if (r === 0) {
        clearLock();
        setError('');
        setAttemptCount(0);
        fetchQuestion();
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [isLocked, open, lockUntil, clearLock, fetchQuestion]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Enter') handleConfirm();
      if (e.key === 'Escape') handleCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, handleConfirm, handleCancel]);

  const renderQuestion = (q: string) => {
    const match = q.match(/(\d+)\s*\+\s*(\d+)\s*=\s*\?/);
    if (!match) return <span>{q}</span>;
    const [, a, b] = match;
    return (
      <Box component='span' sx={{ fontSize: 18, letterSpacing: 2 }}>
        <Box
          component='span'
          sx={{ color: '#fff', fontWeight: 700, fontSize: 22 }}
        >
          {a}
        </Box>
        <Box component='span' sx={{ color: 'rgba(255,255,255,0.7)', mx: 1 }}>
          +
        </Box>
        <Box
          component='span'
          sx={{ color: '#fff', fontWeight: 700, fontSize: 22 }}
        >
          {b}
        </Box>
        <Box component='span' sx={{ color: 'rgba(255,255,255,0.7)', mx: 1 }}>
          = ?
        </Box>
      </Box>
    );
  };

  const dialog = (
    <Dialog open={open} onClose={handleCancel} maxWidth='xs' fullWidth>
      <DialogTitle>安全验证</DialogTitle>
      <DialogContent>
        {isLocked ? (
          <Typography sx={{ color: '#ff4d4f', fontSize: 14, mb: 1 }}>
            验证失败次数过多，请 {formatRemaining(remaining)} 后重试
          </Typography>
        ) : (
          <>
            <Box sx={{ mb: 2 }}>{renderQuestion(question)}</Box>
            <TextField
              autoFocus
              fullWidth
              label='请输入数字答案'
              value={value}
              onChange={e => {
                setValue(e.target.value);
                setError('');
              }}
              error={!!error}
              helperText={error}
              type='text'
              inputProps={{ inputMode: 'numeric' }}
              disabled={isLocked}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>{isLocked ? '关闭' : '取消'}</Button>
        {!isLocked && (
          <Button onClick={handleConfirm} variant='contained'>
            确定
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );

  return { dialog, requestCaptcha };
}
