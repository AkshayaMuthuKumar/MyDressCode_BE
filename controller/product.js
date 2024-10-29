const { pool } = require('../config/database'); // Adjust the path as needed
const aws = require('aws-sdk');
const multerS3 = require('multer-s3');
const multer = require('multer');

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

const path = require('path');

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'uploads'); // Directory where files will be saved
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + path.extname(file.originalname)); // Unique file name
//   },
// });

const s3 = new aws.S3({
  endpoint: process.env.AWS_S3_ENDPOINT,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'bucket-730c4e6d-4708-47c9-9c55-bac3c7c4a190-fsbucket.services.clever-cloud.com',
    acl: 'public-read', // Set the access control for the uploaded file
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, Date.now().toString() + path.extname(file.originalname)); // Unique file name
    },
  }),
});

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
    const baseUrl = 'https://bucket-730c4e6d-4708-47c9-9c55-bac3c7c4a190-fsbucket.services.clever-cloud.com/';

    const subcategory = rows.map(row => ({
      name: row.category,
      count: row.count,
      image: baseUrl + row.image, // Construct the full URL // Image is already the S3 URL
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
    const baseUrl = 'https://bucket-730c4e6d-4708-47c9-9c55-bac3c7c4a190-fsbucket.services.clever-cloud.com/';

    // Format the image paths for each product
    const formattedProducts = products.map(product => ({
      
      ...product,
      image: baseUrl + product.image // Assuming the image is an S3 URL directly


    }));

    // Send the filtered products with formatted image paths as a response
    res.status(200).json({
      message: 'Products fetched successfully',
      data: formattedProducts,
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
    const baseUrl = 'https://bucket-730c4e6d-4708-47c9-9c55-bac3c7c4a190-fsbucket.services.clever-cloud.com/';

    // Format the image URLs similar to how it's done in getTopCategories
    const formatProductImages = (products) => {
      return products.map(product => ({
        ...product,
        image: baseUrl + product.image // Use the S3 URL directly
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

const addCategory = async (req, res) => {
  try {
    const { category, subcategory, discount } = req.body;
    if (!category || !subcategory) {
      return res.status(400).json({ message: 'Category and subcategory are required' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    const image = req.file.location; // S3 image URL
    const categoryId = await generateCategoryId();
    const discountValue = discount ? discount : null;
    
    const sql = `
      INSERT INTO categories (category_id, category, subcategory, discount, image)
      VALUES (?, ?, ?, ?, ?)
    `;
    await pool.query(sql, [categoryId, category, subcategory, discountValue, image]);

    res.status(201).json({ message: 'Category added successfully', categoryId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error adding category' });
  }
};

// Get distinct categories and subcategories
const getCategory = async (req, res) => {
  try {
    const [categoriesResult] = await pool.query('SELECT DISTINCT category FROM categories');
    const categories = categoriesResult.map(row => row.category);

    const [subcategoriesResult] = await pool.query('SELECT DISTINCT subcategory FROM categories');
    const subcategories = subcategoriesResult.map(row => row.subcategory);

    res.json({ categories, subcategories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error while fetching categories' });
  }
};

// Add a new product
const addProduct = async (req, res) => {
  const { name, subcategory, categoryId, size, brand, originalAmount, discountAmount, stock, description } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: 'Image file is required' });
  }

  const image = req.file.location; // S3 image URL
  const productId = await generateProductId();

  try {
    const [categoryRow] = await pool.query('SELECT category FROM categories WHERE category_id = ?', [categoryId]);
    if (categoryRow.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const categoryName = categoryRow[0].category;

    const sql = `
      INSERT INTO products (category_id, product_id, category, name, subcategory, size, brand, image, originalAmount, discountAmount, stock, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await pool.query(sql, [
      categoryId, productId, categoryName, name, subcategory, size, brand, image, originalAmount, discountAmount ? discountAmount : null, stock, description
    ]);

    res.status(201).json({ message: 'Product added successfully!', productId });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ message: 'Error adding product', error });
  }
};

// Fetch product by ID
const getProductById = async (req, res) => {
  const { productId } = req.params;
  try {
    const [result] = await pool.query('SELECT * FROM products WHERE product_id = ?', [productId]);
    if (result.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const product = result[0];
    product.image = product.image; // S3 image URL already stored

    res.status(200).json({ message: 'Product fetched successfully', data: product });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Error fetching product' });
  }
};

const searchProducts = async (req, res) => {
  //Oct29
  const { name } = req.query; // Extracting search parameters from the query

  let sqlQuery = 'SELECT * FROM products WHERE 1=1'; // Base query to ensure safe query addition
  const queryParams = [];

  // Dynamically add conditions based on provided search parameters
  if (name) {
    sqlQuery += ' AND name LIKE ?';
    queryParams.push(`%${name}%`); // Using LIKE for partial matching on product name
  }

  try {
    const [results] = await pool.query(sqlQuery, queryParams);

    // If no products are found, return a 404 response
    if (results.length === 0) {
      return res.status(404).json({ message: 'No products found' });
    }

    // Map through results to append S3 URL to each product's image
    const products = results.map(product => ({
      ...product,
      image: `https://your-s3-bucket-url/${product.image}` // S3 URL format for images
    }));

    // Return successful response with products
    res.status(200).json({ message: 'Products fetched successfully', data: products });
  } catch (error) {
    console.error('Error searching for products:', error);
    res.status(500).json({ message: 'Error searching for products' });
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
  getJustArrivedProducts,
  searchProducts
};
