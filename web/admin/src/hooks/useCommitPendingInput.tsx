import { useRef, useState } from 'react';

export function useCommitPendingInput<T>({
  value,
  setValue,
}: {
  value: T[];
  setValue: (v: T[]) => void;
}) {
  const [inputValue, setInputValue] = useState('');
  // 用于同步获取最新值（解决闭包问题）
  const valueRef = useRef(value);
  valueRef.current = value;

  // 提交未完成的输入
  const commit = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      const newValue = [...valueRef.current, trimmed as T];
      setValue(newValue);
      setInputValue('');
    }
  };

  return {
    /** 已提交的值 */
    value,
    /** 设置已提交的值（用于外部修改） */
    setValue,
    /** 当前输入框中的临时值 */
    inputValue,
    /** 设置临时值 */
    setInputValue,
    /** 提交未完成的输入 */
    commit,
  };
}
