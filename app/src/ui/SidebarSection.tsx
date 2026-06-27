import { ReactNode } from 'react';

interface SidebarSectionProps {
  title?: string;
  children: ReactNode;
  withDivider?: boolean;
}

export default function SidebarSection({ title, children, withDivider = true }: SidebarSectionProps) {
  return (
    <>
      {withDivider && <div className="border-t border-border" />}
      <div>
        {title && (
          <p className="text-[10px] font-semibold uppercase tracking-widest text-subtle mb-2">
            {title}
          </p>
        )}
        {children}
      </div>
    </>
  );
}
