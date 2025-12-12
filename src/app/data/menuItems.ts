export interface MenuItem {
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

export const categories = [
    { id: 'all', name: 'All Menu', nameTh: 'ทั้งหมด', icon: '🍽️' },
    { id: 'hotpot', name: 'Hot Pot', nameTh: 'สุกี้', icon: '🍲' },
    { id: 'grilled', name: 'Grilled', nameTh: 'ปิ้งย่าง', icon: '🔥' },
    { id: 'seafood', name: 'Seafood', nameTh: 'อาหารทะเล', icon: '🦐' },
    { id: 'appetizer', name: 'Appetizers', nameTh: 'เรียกน้ำย่อย', icon: '🥟' },
    { id: 'drinks', name: 'Drinks', nameTh: 'เครื่องดื่ม', icon: '🥤' },
    { id: 'dessert', name: 'Desserts', nameTh: 'ของหวาน', icon: '🍧' },
];

export const menuItems: MenuItem[] = [
    // Hot Pot
    {
        id: 1,
        name: 'Signature Hot Pot Set',
        nameTh: 'ชุดสุกี้ซิกเนเจอร์',
        description: 'Premium hot pot with assorted meats, vegetables, and our special broth',
        price: 399,
        image: '/food/hotpot-signature.jpg',
        category: 'hotpot',
        isPopular: true,
    },
    {
        id: 2,
        name: 'Seafood Hot Pot',
        nameTh: 'สุกี้ทะเล',
        description: 'Fresh prawns, squid, fish, and mussels in spicy tom yum broth',
        price: 459,
        image: '/food/hotpot-seafood.jpg',
        category: 'hotpot',
        isSpicy: true,
    },
    {
        id: 3,
        name: 'Vegetarian Hot Pot',
        nameTh: 'สุกี้มังสวิรัติ',
        description: 'Tofu, mushrooms, and fresh vegetables in clear broth',
        price: 299,
        image: '/food/hotpot-veg.jpg',
        category: 'hotpot',
    },
    // Grilled
    {
        id: 4,
        name: 'Grilled Pork Collar',
        nameTh: 'คอหมูย่าง',
        description: 'Tender marinated pork collar grilled to perfection',
        price: 189,
        image: '/food/grilled-pork.jpg',
        category: 'grilled',
        isPopular: true,
    },
    {
        id: 5,
        name: 'Grilled Tiger Prawns',
        nameTh: 'กุ้งแม่น้ำเผา',
        description: 'Large river prawns grilled with herbs and garlic butter',
        price: 599,
        image: '/food/grilled-prawns.jpg',
        category: 'grilled',
        isNew: true,
    },
    {
        id: 6,
        name: 'BBQ Beef Skewers',
        nameTh: 'เนื้อย่างเสียบไม้',
        description: 'Juicy beef skewers with Thai spices',
        price: 159,
        image: '/food/grilled-beef.jpg',
        category: 'grilled',
        isSpicy: true,
    },
    // Seafood
    {
        id: 7,
        name: 'Steamed Fish with Lime',
        nameTh: 'ปลานึ่งมะนาว',
        description: 'Fresh sea bass steamed with lime, garlic, and chili',
        price: 359,
        image: '/food/seafood-fish.jpg',
        category: 'seafood',
        isSpicy: true,
    },
    {
        id: 8,
        name: 'Garlic Butter Crab',
        nameTh: 'ปูผัดเนย',
        description: 'Stir-fried crab with aromatic garlic butter sauce',
        price: 699,
        image: '/food/seafood-crab.jpg',
        category: 'seafood',
        isPopular: true,
    },
    {
        id: 9,
        name: 'Grilled Squid',
        nameTh: 'ปลาหมึกย่าง',
        description: 'Tender grilled squid with seafood dipping sauce',
        price: 249,
        image: '/food/seafood-squid.jpg',
        category: 'seafood',
    },
    // Appetizers
    {
        id: 10,
        name: 'Crispy Spring Rolls',
        nameTh: 'ปอเปี๊ยะทอด',
        description: 'Golden crispy rolls filled with vegetables and glass noodles',
        price: 89,
        image: '/food/appetizer-springroll.jpg',
        category: 'appetizer',
    },
    {
        id: 11,
        name: 'Tom Yum Soup',
        nameTh: 'ต้มยำกุ้ง',
        description: 'Famous Thai spicy and sour soup with prawns',
        price: 149,
        image: '/food/appetizer-tomyum.jpg',
        category: 'appetizer',
        isPopular: true,
        isSpicy: true,
    },
    {
        id: 12,
        name: 'Satay Chicken',
        nameTh: 'ไก่สะเต๊ะ',
        description: 'Grilled chicken skewers with peanut sauce',
        price: 99,
        image: '/food/appetizer-satay.jpg',
        category: 'appetizer',
    },
    // Drinks
    {
        id: 13,
        name: 'Thai Iced Tea',
        nameTh: 'ชาเย็น',
        description: 'Classic Thai sweet milk tea over ice',
        price: 59,
        image: '/food/drink-thaitea.jpg',
        category: 'drinks',
        isPopular: true,
    },
    {
        id: 14,
        name: 'Coconut Shake',
        nameTh: 'มะพร้าวปั่น',
        description: 'Refreshing coconut smoothie with coconut meat',
        price: 79,
        image: '/food/drink-coconut.jpg',
        category: 'drinks',
    },
    {
        id: 15,
        name: 'Lemongrass Soda',
        nameTh: 'โซดาตะไคร้',
        description: 'Sparkling lemongrass drink with honey',
        price: 69,
        image: '/food/drink-lemongrass.jpg',
        category: 'drinks',
        isNew: true,
    },
    // Desserts
    {
        id: 16,
        name: 'Mango Sticky Rice',
        nameTh: 'ข้าวเหนียวมะม่วง',
        description: 'Sweet sticky rice with fresh mango and coconut cream',
        price: 119,
        image: '/food/dessert-mango.jpg',
        category: 'dessert',
        isPopular: true,
    },
    {
        id: 17,
        name: 'Thai Ice Cream',
        nameTh: 'ไอศกรีมกะทิ',
        description: 'Coconut ice cream with peanuts and sticky rice',
        price: 79,
        image: '/food/dessert-icecream.jpg',
        category: 'dessert',
    },
    {
        id: 18,
        name: 'Roti with Condensed Milk',
        nameTh: 'โรตีนมข้น',
        description: 'Crispy Thai roti with sweet condensed milk',
        price: 69,
        image: '/food/dessert-roti.jpg',
        category: 'dessert',
        isNew: true,
    },
];

export const getPopularItems = () => menuItems.filter((item) => item.isPopular);
export const getNewItems = () => menuItems.filter((item) => item.isNew);
export const getItemsByCategory = (category: string) =>
    category === 'all' ? menuItems : menuItems.filter((item) => item.category === category);
