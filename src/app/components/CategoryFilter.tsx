'use client';

import { categories } from '../data/menuItems';

interface CategoryFilterProps {
    activeCategory: string;
    onCategoryChange: (category: string) => void;
}

export default function CategoryFilter({ activeCategory, onCategoryChange }: CategoryFilterProps) {
    return (
        <div className="sidebar-filter">
            {categories.map((category) => (
                <button
                    key={category.id}
                    onClick={() => onCategoryChange(category.id)}
                    className={`sidebar-category ${activeCategory === category.id ? 'active' : ''}`}
                >
                    <span className="category-icon">{category.icon}</span>
                    <span className="category-name">{category.nameTh}</span>
                </button>
            ))}
        </div>
    );
}
