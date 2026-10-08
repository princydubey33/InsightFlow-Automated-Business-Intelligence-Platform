import React, { useEffect, useRef } from 'react';
import { useInView, useMotionValue, useTransform, motion, animate } from 'framer-motion';

interface AnimatedCountProps {
  value: number;
  duration?: number;
  formatter?: (value: number) => string;
}

export default function AnimatedCount({ value, duration = 2, formatter = (v) => Math.round(v).toString() }: AnimatedCountProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10%" });
  
  const motionValue = useMotionValue(0);

  useEffect(() => {
    if (isInView) {
      const controls = animate(motionValue, value, {
        duration: duration,
        ease: "easeOut",
      });
      return controls.stop;
    }
  }, [isInView, value, duration, motionValue]);

  const display = useTransform(motionValue, (current) => formatter(current));

  return <motion.span ref={ref}>{display}</motion.span>;
}
