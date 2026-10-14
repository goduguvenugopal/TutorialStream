import React from 'react';
import { Layers, Folder, Code2, Cpu } from 'lucide-react';

export default function CategoryPills({
  categories = [],
  selectedCategory,
  onSelectCategory,
  totalCount = 0,
  categoryCounts = {},
}) {
  const getCategoryIcon = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes('node')) return <Cpu size={14} />;
    if (lower.includes('react')) return <Code2 size={14} />;
    return <Folder size={14} />;
  };

  return (
    <div className="category-row">
      <button
        className={`category-chip ${selectedCategory === 'ALL' ? 'active' : ''}`}
        onClick={() => onSelectCategory('ALL')}
      >
        <Layers size={14} />
        <span>All Tutorials</span>
        <span className="category-chip-count">{totalCount}</span>
      </button>

      {categories.map((cat) => (
        <button
          key={cat}
          className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
          onClick={() => onSelectCategory(cat)}
        >
          {getCategoryIcon(cat)}
          <span>{cat}</span>
          {categoryCounts[cat] !== undefined && (
            <span className="category-chip-count">{categoryCounts[cat]}</span>
          )}
        </button>
      ))}
    </div>
  );
}
