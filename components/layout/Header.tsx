"use client";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-8 backdrop-blur-sm">
      {title && (
        <h2 className="text-lg font-semibold text-remax-blue-dark lg:hidden">
          {title}
        </h2>
      )}

      <div className="flex flex-1 items-center justify-end" />
    </header>
  );
}