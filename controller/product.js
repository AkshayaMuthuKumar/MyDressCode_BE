const { pool } = require('../config/database'); // Adjust the path as needed
//Oct15

const generateCategoryId = async () => {
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM categories');
  const count = rows[0].count + 1; // Increment by 1 for the new ID
  return `CAT${String(count).padStart(2, '0')}`; // Generate ID like CAT01, CAT02, etc.
};

const generateProductId = async () => {
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM products');
  const count = rows[0].count + 1; // Increment by 1 for the new ID
  return `MDC${String(count).padStart(2, '0')}`; // Generate ID like CAT01, CAT02, etc.
};

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads'); // Directory where files will be saved
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique file name
  },
});
console.log("storage", storage)
const upload = multer({ storage });

const addCategory = async (req, res) => {
  try {
    const { category, subcategory, discount } = req.body;
    if (!category || !subcategory) {
      return res.status(400).json({ message: 'Category and subcategory are required' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    const image = req.file.path;

    const categoryId = await generateCategoryId();
    const discountValue = discount === '' || discount === undefined ? null : discount;
    const sql = `
          INSERT INTO categories (category_id, category, subcategory, discount, image)
          VALUES (?, ?, ?, ?, ?)
      `;
    const [result] = await pool.query(sql, [categoryId, category, subcategory, discountValue, image]);

    res.status(201).json({ message: 'Category added successfully', categoryId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error adding category' });
  }
};

const getCategory = async (req, res) => {
  try {
    // Fetch distinct categories
    const [categoriesResult] = await pool.query('SELECT DISTINCT category FROM categories');
    const categories = categoriesResult.map(row => row.category);

    // Fetch distinct subcategories
    const [subcategoriesResult] = await pool.query('SELECT DISTINCT subcategory FROM categories');
    const subcategories = subcategoriesResult.map(row => row.subcategory);

    // Return the result in a JSON response
    res.json({
      categories,
      subcategories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error while fetching categories' });
  }
};

const addProduct = async (req, res) => {
  const {
    name,
    subcategory,
    categoryId, // categoryId from the request body
    size,
    brand,
    originalAmount,
    discountAmount,
    stock,
    description
  } = req.body;

  // Check if file is uploaded
  if (!req.file) {
    return res.status(400).json({ message: 'Image file is required' });
  }

  const image = req.file.path; // Get the image path from the file object
  const productId = await generateProductId();


  try {
    // Step 1: Fetch the category name from the categories table using the provided categoryId
    const [categoryRow] = await pool.query(`
          SELECT category FROM categories WHERE category_id = ?
      `, [categoryId]);
    if (categoryRow.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const categoryName = categoryRow[0].category; // Get the category name

    // Step 2: Insert the product into the products table
    const sql = `
          INSERT INTO products (category_id, product_id, category, name, subcategory, size, brand, image, originalAmount, discountAmount, stock, description)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

    const [result] = await pool.query(sql, [
      categoryId,          // foreign key categoryId
      productId,
      categoryName,          // category name fetched from categories table
      name,                  // product name
      subcategory,           // subcategory of the product
      size,                  // size of the product
      brand,                 // brand of the product
      image,                 // image path
      originalAmount,        // original price
      discountAmount ? discountAmount : null, // discount price (can be null)
      stock,
      description
    ]);

    res.status(201).json({ message: 'Product added successfully!', productId: result.insertId });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ message: 'Error adding product', error });
  }
};


const getCategoryIdBySubcategory = async (req, res) => {
  const { subcategory } = req.query;

  if (!subcategory) {
    return res.status(400).json({ message: 'Subcategory is required' });
  }

  try {
    // Query to fetch the category ID based on the subcategory name
    const [result] = await pool.query(
      'SELECT category_id FROM categories WHERE subcategory = ?',
      [subcategory]
    );

    if (result.length > 0) {
      res.json({ categoryId: result[0].category_id });
    } else {
      res.status(404).json({ message: 'Subcategory not found' });
    }
  } catch (error) {
    console.error('Error fetching category ID by subcategory:', error);
    res.status(500).json({ message: 'Server error while fetching category ID' });
  }
};

const getTopCategories = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT category, COUNT(*) AS count, MIN(image) AS image, MIN(category_id) AS category_id
      FROM products 
      GROUP BY category
    `);

    const subcategory = rows.map(row => ({
      name: row.category,
      count: row.count,
      image: `${req.protocol}://${req.get('host')}/${row.image.replace(/\\/g, '/')}`, // Correct the image path format
      category_id: row.category_id
    }));

    console.log("subcategory", subcategory);

    res.json({ subcategory });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
};

const getProductsbySelectedCategory = async (req, res) => {
  try {
    const { getProductsbySelectedCategory } = req.query; // Extract the category from the query string

    let query = 'SELECT * FROM products';
    const queryParams = [];

    if (getProductsbySelectedCategory) {
      // If category is provided in the query, modify the SQL query to filter by category
      query += ' WHERE category = ?';
      queryParams.push(getProductsbySelectedCategory);
    }

    // Querying products with or without filtering by category
    const [products] = await pool.query(query, queryParams);

    // Send the filtered products as a response
    res.status(200).json({
      message: 'Products fetched successfully',
      data: products,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Error fetching products' });
  }
};

const getUniqueFilters = async (req, res) => {
  try {
    // Querying unique categories and their corresponding subcategories
    const [categoriesWithSubcategories] = await pool.query(`
      SELECT 
        category, 
        subcategory 
      FROM 
        products 
      GROUP BY 
        category, subcategory
    `);

    // Create a map to hold categories and their subcategories
    const filters = {};

    categoriesWithSubcategories.forEach(row => {
      // If the category does not exist in the filters object, initialize it
      if (!filters[row.category]) {
        filters[row.category] = [];
      }
      // Add the subcategory to the corresponding category
      filters[row.category].push(row.subcategory);
    });

    // Extract unique categories and their subcategories
    const uniqueCategories = Object.entries(filters).map(([category, subcategories]) => ({
      category,
      subcategories: [...new Set(subcategories)] // Remove duplicate subcategories
    }));

    // Querying unique brands, sizes, and prices
    const [brands] = await pool.query('SELECT DISTINCT brand FROM products');
    const [sizes] = await pool.query('SELECT DISTINCT size FROM products');
    const [prices] = await pool.query('SELECT DISTINCT originalAmount as price FROM products');

    // Send the filters result as a response
    res.status(200).json({
      message: 'Filters fetched successfully',
      filters: {
        categories: uniqueCategories,
        brands: brands.map(row => row.brand),
        sizes: sizes.map(row => row.size),
        prices: prices.map(row => row.price)
      }
    });
  } catch (error) {
    console.error('Error fetching filters:', error);
    res.status(500).json({ message: 'Error fetching filters' });
  }
};

const getProductById = async (req, res) => {
  const { productId } = req.params; // Extract productId from the request parameters

  try {
    // Query to fetch product details by productId
    const [result] = await pool.query('SELECT * FROM products WHERE product_id = ?', [productId]);

    // Check if the product exists
    if (result.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Send the product details as a response
    res.status(200).json({
      message: 'Product fetched successfully',
      data: result[0], // Send the first product found
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Error fetching product' });
  }
};

const getProduct = async (req, res) => {
  try {
    // Fetch recent products including their images
    const [recentProducts] = await pool.query(`
      SELECT id, category_id, product_id, category, name, subcategory, size, brand, 
             image, originalAmount, discountAmount, stock, description, createdAt
      FROM products 
      ORDER BY createdAt DESC 
      LIMIT 6
    `);

    // Fetch discounted products including their images
    const [discountedProducts] = await pool.query(`
      SELECT id, category_id, product_id, category, name, subcategory, size, brand, 
             image, originalAmount, discountAmount, stock, description, createdAt
      FROM products 
      ORDER BY (originalAmount - discountAmount) DESC 
      LIMIT 6
    `);

    // Format the image URLs similar to how it's done in getTopCategories
    const formatProductImages = (products) => {
      return products.map(product => ({
        ...product,
        image: `${req.protocol}://${req.get('host')}/${product.image.replace(/\\/g, '/')}` // Correct the image path format
      }));
    };

    // Format the images for both recent and discounted products
    const formattedRecentProducts = formatProductImages(recentProducts);
    const formattedDiscountedProducts = formatProductImages(discountedProducts);

    res.status(200).json({
      message: 'Products fetched successfully',
      data: {
        recent: formattedRecentProducts,
        popular: formattedDiscountedProducts,
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Error fetching products' });
  }
};


const getReviewsByProductId = async (req, res) => {
  const { productId } = req.params; // Extract productId from the request parameters

  try {
    // Query to fetch reviews for the product
    const [result] = await pool.query('SELECT * FROM reviews WHERE productId = ? ORDER BY createdAt DESC', [productId]);

    // Check if there are reviews for the product
    if (result.length === 0) {
      return res.status(404).json({ message: 'No reviews found for this product' });
    }

    // Send the reviews as a response
    res.status(200).json({
      message: 'Reviews fetched successfully',
      data: result, // Send all reviews for the product
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Error fetching reviews' });
  }
};

const addReview = async (req, res) => {
  const { productId, name, email, purchaseDate, experience, rating, review } = req.body; // Extract review data from the request body

  // Basic validation
  if (!productId || !name || !email || !purchaseDate || !experience || !rating || !review) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Query to insert the new review into the reviews table
    const [result] = await pool.query(
      'INSERT INTO reviews (productId, name, email, purchaseDate, experience, rating, review) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [productId, name, email, purchaseDate, experience, rating, review]
    );

    // Send a success response if the review was added
    res.status(201).json({
      message: 'Review added successfully',
      data: {
        id: result.insertId, // ID of the new review
        productId,
        name,
        email,
        purchaseDate,
        experience,
        rating,
        review,
      },
    });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ message: 'Error adding review' });
  }
};

const getJustArrivedProducts = async (req, res) => {
  try {
    // Query to fetch all products ordered by createdAt in descending order
    const [result] = await pool.query(`
      SELECT id, category_id, product_id, category, name, subcategory, size, brand, 
             image, originalAmount, discountAmount, stock, description, createdAt
      FROM products
      ORDER BY createdAt DESC
    `);

    res.status(200).json({
      message: 'Just arrived products fetched successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error fetching just arrived products:', error);
    res.status(500).json({ message: 'Server error while fetching just arrived products' });
  }
};


module.exports = {
  addCategory,
  getCategory,
  addProduct,
  getCategoryIdBySubcategory,
  upload,
  getTopCategories,
  getUniqueFilters,
  getProductsbySelectedCategory,
  getProductById,
  getReviewsByProductId,
  addReview,
  getProduct,
  getJustArrivedProducts
};
