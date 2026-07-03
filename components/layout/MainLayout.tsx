import { PathChecker } from "./PathChecker";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return <PathChecker>{children}</PathChecker>;
}