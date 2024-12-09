var { PrismaClient } = require('@prisma/client');
var prisma = new PrismaClient();

var getAllProducts = async (page, LIMIT) => {
    try {
        const skip = (page - 1) * LIMIT

        const products = await prisma.product.findMany({
            skip: skip, // bỏ qua (skip) product(s)
            take: LIMIT // lấy (LIMIT) product(s)
        });

        const totalProducts = await prisma.product.count(); // lấy tổng sản phẩm
        const totalPages = Math.ceil(totalProducts / LIMIT); // tính tổng số trang

        return {
            products: products, // ds sản phẩm
            currentPage: page, // trang hiện tại
            totalProducts: totalProducts, // tổng sp
            totalPages: totalPages // tổng trang
        };
    } catch (error) {
        console.error('Error fetching products:', error);
        throw error;
    }
};

var getDescriptionByProductName = async (productName) => {
    try {
        return await prisma.product.findUnique({
            where: { name: productName }
        });
    } catch (error) {
        console.error("Error fetching description by product ID:", error);
        throw new Error("Database error while fetching product description");
    }
};

var getRelevantProducts = async (category, excludeProductId, limit = 4) => {
    return prisma.product.findMany({
        where: {
            category: category, // Match the category
            NOT: { id: excludeProductId }, // Exclude the current product
        },
        take: limit, // Limit the results
    });
};

// Filter
const findProducts = async (searchQuery, filters, excludeProductId, limit) => {
    try {
        const whereConditions = {};

        // Add search query condition
        if (searchQuery) {
            whereConditions.OR = [
                { name: { contains: searchQuery, mode: 'insensitive' } },
            ];
        }

        // Add price filter conditions
        if (filters.price && Array.isArray(filters.price)) {
            const priceConditions = filters.price.map(p => {
                const range = p.split('-');
                if (range.length === 1) {
                    if (p.startsWith('>')) {
                        return { price: { gt: parseFloat(p.slice(1)) } };
                    } else if (p.startsWith('<')) {
                        return { price: { lt: parseFloat(p.slice(1)) } };
                    }
                } else {
                    return { price: { gte: parseFloat(range[0]), lte: parseFloat(range[1]) } };
                }
            });
            whereConditions.OR = whereConditions.OR ? [...whereConditions.OR, ...priceConditions] : priceConditions;
        }

        // Add gender filter conditions
        if (filters.gender && filters.gender.length > 0) {
            whereConditions.gender = { in: filters.gender };
        }

        // Add category filter conditions
        if (filters.category && filters.category.length > 0) {
            whereConditions.category = { in: filters.category };
        }

        // Add kind filter conditions
        if (filters.kind && filters.kind.length > 0) {
            const childMapping = {
                tops: ["Shirt", "T-shirt", "Coat", "Sweater", "Cardigan"],
                bottoms: ["Trousers", "Dress", "Skirt", "Jeans", "Pants", "Shorts"],
                shoes: ["Sandals", "Sneakers", "High heels", "Slip-ons", "Slippers", "Flip-flops", "Boots", "Ballet flats", "Crocs"],
                accessories: ["Hat", "Belt", "Socks", "Scarf", "Glove", "Sunglasses", "Wallet", "Purse"]
            };

            // Get all selected child values
            const selectedChildren = filters.kind.filter(kind =>
                Object.values(childMapping).flat().includes(kind)
            );

            // Remove parent if corresponding child is selected
            const filteredKinds = filters.kind.filter(kind => {
                if (childMapping[kind]) {
                    // Remove parent if at least one child value is selected
                    return !selectedChildren.some(child => childMapping[kind].includes(child));
                }
                return true;
            });

            const kindConditions = filteredKinds.flatMap(kind => {
                if (childMapping[kind]) {
                    return childMapping[kind].map(child => ({ kind: child }));
                } else {
                    return { kind: kind };
                }
            });

            whereConditions.OR = whereConditions.OR ? [...whereConditions.OR, ...kindConditions] : kindConditions;
        }

        // Exclude specific product
        if (excludeProductId) {
            whereConditions.NOT = { id: excludeProductId };
        }

        //console.log('whereConditions:', whereConditions);

        // Fetch products with the combined conditions
        const products = await prisma.product.findMany({
            where: whereConditions,
            take: limit,
        });

        return products;
    } catch (error) {
        console.error('Error finding products:', error);
        throw error;
    }
};

// Search by name and description
const findProductsBySearchQuery = async (query, page, LIMIT) => {
    try {
        const skip = (page - 1) * LIMIT

        const products = await prisma.product.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { shortDescription: { contains: query, mode: 'insensitive' } },
                    { longDescription: { contains: query, mode: 'insensitive' } },
                ],
            },
            skip: skip,
            take: LIMIT
        });

        const totalProducts = await prisma.product.count({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { shortDescription: { contains: query, mode: 'insensitive' } },
                    { longDescription: { contains: query, mode: 'insensitive' } },
                ],
            },
        })

        const totalPages = Math.ceil(totalProducts / LIMIT)

        return {
            products: products,
            currentPage: page,
            totalProducts: totalProducts,
            totalPages: totalPages
        }
    } catch (error) {
        console.error("Error searching products:", error);
        throw error;
    }
};

module.exports = { getAllProducts, getDescriptionByProductName, getRelevantProducts, findProducts, findProductsBySearchQuery };