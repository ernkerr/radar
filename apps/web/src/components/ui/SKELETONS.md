# Skeleton Loading Design System

Every component that fetches data should show a skeleton placeholder while loading. This prevents empty page flashes and gives users immediate visual structure.

## Setup

We use [shadcn/ui's Skeleton](https://ui.shadcn.com/docs/components/skeleton) as the base primitive, which renders an `animate-pulse` div with a shimmer effect. Higher-level skeleton patterns are defined in `skeletons.tsx`.

## Available Patterns

| Pattern | Import | Use For |
|---------|--------|---------|
| `<Skeleton />` | `@/components/ui/skeleton` | Custom one-off shapes (base primitive) |
| `<FormSkeleton />` | `@/components/ui/skeletons` | Settings forms, profile editors, edit modals |
| `<TableSkeleton />` | `@/components/ui/skeletons` | Any tabular data list |
| `<CardGridSkeleton />` | `@/components/ui/skeletons` | Dashboard cards, source cards in grids |
| `<SourceListSkeleton />` | `@/components/ui/skeletons` | Vertical list of bordered cards |
| `<PageContentSkeleton />` | `@/components/ui/skeletons` | Fallback for entire page content area |

## How to Add Skeletons to a New Component

### 1. Add a loading state

```tsx
const [loading, setLoading] = useState(true);
```

### 2. Set loading to false after data arrives

```tsx
async function load() {
  const { data } = await supabase.from("table").select("*");
  if (data) setItems(data);
  setLoading(false);  // always set false, even if data is null
}
```

### 3. Return the skeleton when loading

```tsx
if (loading) return <TableSkeleton columns={4} rows={3} />;
```

### 4. Pick the right pattern

- **Form with labeled inputs** → `<FormSkeleton fields={N} />`
- **Data table** → `<TableSkeleton columns={N} rows={N} />`
- **Card grid** → `<CardGridSkeleton count={N} columns={N} />`
- **Vertical card list** → `<SourceListSkeleton count={N} />`
- **Something custom** → compose with `<Skeleton className="h-4 w-32" />`

## Props Reference

### `FormSkeleton`
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fields` | number | 4 | Number of label+input field pairs |
| `withButton` | boolean | true | Show a save button skeleton |

### `TableSkeleton`
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | number | 3 | Number of table columns |
| `rows` | number | 3 | Number of placeholder data rows |
| `withHeader` | boolean | true | Show title + action button above table |

### `CardGridSkeleton`
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `count` | number | 3 | Number of cards to show |
| `columns` | number | 3 | Grid column count |

### `SourceListSkeleton`
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `count` | number | 4 | Number of list items |

### `PageContentSkeleton`
No props. Generic fallback with heading + 3 field skeletons.

## Building Custom Skeletons

For layouts that don't match any pattern, compose directly with the base `<Skeleton />`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

function MyCustomSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-48" />        {/* heading */}
      <Skeleton className="h-4 w-full" />       {/* text line */}
      <Skeleton className="h-32 w-full" />      {/* content block */}
      <Skeleton className="h-8 w-24 rounded-full" />  {/* badge/pill */}
    </div>
  );
}
```

Size the skeleton to match the real content dimensions. Use `rounded-full` for badges/pills, `rounded-md` (default) for everything else.

## Checklist for New Pages/Components

When building a new page or component that fetches data:

- [ ] Add `const [loading, setLoading] = useState(true)`
- [ ] Call `setLoading(false)` after fetch completes
- [ ] Return a skeleton pattern (or custom skeleton) when `loading` is true
- [ ] Skeleton layout matches the real content structure (same number of columns, similar widths)
- [ ] Page shell (nav, heading, tabs) renders immediately — only the data area uses skeletons
