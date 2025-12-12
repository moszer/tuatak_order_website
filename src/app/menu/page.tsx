'use client';

import { useState, useMemo, useEffect } from 'react';
import MenuCard from '../components/MenuCard';
import CategoryFilter from '../components/CategoryFilter';

interface MenuItem {
    id: number;
    name: string;
    nameTh: string;
    description: string;
    price: number;
    image: string;
    category: string;
    isPopular?: boolean;
    isSpicy?: boolean;
    isNew?: boolean;
}

export default function MenuPage() {
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMenuItems();
    }, []);

    const fetchMenuItems = async () => {
        try {
            const response = await fetch('/api/menu');
            const data = await response.json();
            setMenuItems(data.menuItems || []);
        } catch (error) {
            console.error('Error fetching menu items:', error);
            // Fallback to empty array
            setMenuItems([]);
        } finally {
            setLoading(false);
        }
    };

    const getItemsByCategory = (category: string) => {
        return category === 'all' 
            ? menuItems 
            : menuItems.filter((item) => item.category === category);
    };

    const filteredItems = useMemo(() => {
        let items = getItemsByCategory(activeCategory);

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            items = items.filter(
                item =>
                    item.name.toLowerCase().includes(query) ||
                    item.nameTh.includes(query) ||
                    (item.description && item.description.toLowerCase().includes(query))
            );
        }

        return items;
    }, [activeCategory, searchQuery, menuItems]);

    return (
        <div className="min-h-screen bg-background pt-20">
            {/* Header */}
            <section className="py-12 bg-dark">
                <div className="container">
                    <div className="max-w-2xl mx-auto text-center">
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                            Our <span className="text-gradient">Menu</span>
                        </h1>
                        <p className="text-gray-400 text-lg mb-8">
                            Explore our delicious selection of Thai hot pot, grilled dishes, and more
                        </p>

                        {/* Search */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search for dishes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-6 py-4 pl-14 rounded-full bg-dark-lighter border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
                            />
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-500"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-5 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Category Filter */}
            <section className="sticky top-20 z-40 bg-background/95 backdrop-blur-lg border-b border-white/5">
                <div className="container">
                    <CategoryFilter
                        activeCategory={activeCategory}
                        onCategoryChange={setActiveCategory}
                    />
                </div>
            </section>

            {/* Menu Grid */}
            <section className="section">
                <div className="container">
                    {/* Results Count */}
                    <div className="flex justify-between items-center mb-8">
                        <p className="text-gray-400">
                            Showing <span className="text-white font-medium">{filteredItems.length}</span> items
                            {searchQuery && (
                                <span> for &quot;{searchQuery}&quot;</span>
                            )}
                        </p>
                    </div>

                    {/* Menu Items */}
                    {loading ? (
                        <div className="text-center py-16">
                            <div className="text-6xl mb-4 animate-spin">🍲</div>
                            <p className="text-gray-400">Loading menu...</p>
                        </div>
                    ) : filteredItems.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredItems.map((item, index) => (
                                <div
                                    key={item.id}
                                    className="animate-slideUp"
                                    style={{ animationDelay: `${index * 0.05}s` }}
                                >
                                    <MenuCard item={item} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="text-6xl mb-4">🔍</div>
                            <h3 className="text-xl font-semibold text-white mb-2">No items found</h3>
                            <p className="text-gray-400 mb-6">Try adjusting your search or category filters</p>
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setActiveCategory('all');
                                }}
                                className="btn-primary"
                            >
                                Clear Filters
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* Promo Banner */}
            <section className="py-16 gradient-primary">
                <div className="container">
                    <div className="max-w-3xl mx-auto text-center">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            🎉 Order for 4+ people and get 10% off!
                        </h2>
                        <p className="text-xl text-white/80 mb-6">
                            Perfect for family dinners and group gatherings
                        </p>
                        <button className="bg-white text-primary font-semibold px-8 py-4 rounded-full hover:bg-gray-100 transition-colors">
                            Apply Promo Code: FAMILY10
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
