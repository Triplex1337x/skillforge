import * as React from 'react';
import { Slot } from 'radix-ui';
import { cva } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
const variants = cva('button', {variants:{variant:{default:'primary',outline:'outline',ghost:'ghost'}}});
export function Button({className,variant='default',asChild=false,...props}: React.ComponentProps<'button'> & {variant?: 'default'|'outline'|'ghost'; asChild?:boolean}) {
  const Component = asChild ? Slot.Root : 'button';
  return <Component className={twMerge(clsx(variants({variant}),className))} {...props}/>;
}
