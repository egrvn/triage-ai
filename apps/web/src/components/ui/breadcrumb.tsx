import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="breadcrumb" aria-label="Навигационная цепочка">
      <ol>
        <li>
          <Link to="/">Главная</Link>
        </li>
        {items.map((item) => (
          <li key={item.label}>
            <ChevronRight size={14} aria-hidden="true" />
            {item.href ? <Link to={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
