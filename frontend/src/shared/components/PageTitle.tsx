interface PageTitleProps {
  title: string;
  subtitle: string;
}

export function PageTitle({ title, subtitle }: PageTitleProps) {
  return <header className="page-title"><h1>{title}</h1><p>{subtitle}</p></header>;
}
