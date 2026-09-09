import { useCallback, useEffect, useRef, useState } from 'react';
import type { DemoState } from './types';
import { isRunning, scheduleWorkflow } from './workflow';

export function useDemoWorkflow() {
  const [state, setState] = useState<DemoState>('idle');
  const [run, setRun] = useState(0);
  const cancel = useRef<(() => void) | null>(null);
  const running = useRef(false);
  useEffect(() => () => { cancel.current?.(); }, []);
  const start = useCallback(() => {
    if (running.current) return;
    cancel.current?.();
    running.current = true;
    setRun(value => value + 1);
    setState('extracting');
    cancel.current = scheduleWorkflow(next => {
      setState(next);
      running.current = isRunning(next);
    }, { set(callback, delay) {
      const timer = window.setTimeout(callback, delay);
      return () => window.clearTimeout(timer);
    } });
  }, []);
  const validate = useCallback(() => {
    setState(current => current === 'reply-ready' ? 'validated' : current);
  }, []);
  const revise = useCallback(() => {
    setState(current => current === 'validated' ? 'reply-ready' : current);
  }, []);
  return { state, run, start, validate, revise };
}
