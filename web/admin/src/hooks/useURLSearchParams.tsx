import { filterEmpty } from '@/utils';
import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

export const useURLSearchParams = (): [
  URLSearchParams,
  (other: Record<string, string> | null) => void,
] => {
  const { search } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [params, setParams] = useState<Record<string, string>>({});

  const setURLSearchParams = (other: Record<string, string> | null) => {
    if (other === null) setSearchParams({});
    else setSearchParams(filterEmpty({ ...params, ...other }));
  };

  useEffect(() => {
    const obj: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      obj[key] = value;
    });
    setParams(obj);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return [searchParams, setURLSearchParams];
};
