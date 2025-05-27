import { useEffect, useRef } from "react";

function usePrevious<T>(value: T, initialValue: T): T {
  const ref = useRef<T>(initialValue);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

export default usePrevious;
