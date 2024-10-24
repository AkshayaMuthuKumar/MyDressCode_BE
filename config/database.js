const mysql = require('mysql2/promise');
//Oct15
// Create a connection pool with mysql2
const db = mysql.createPool({
  host: 'bjitio8jkqvxjg22yx2o-mysql.services.clever-cloud.com',
  user: 'uen6fxfvuac2fdee',
  password: 'mn0x5pBMruBSglUK2KG5', // Replace with your MySQL password
  database: 'bjitio8jkqvxjg22yx2o',
  waitForConnections: true,
});

const usersTable = `

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(15) NOT NULL UNIQUE,
    isAdmin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;

// Queries to create each table
const categoriesTable = `
  CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id VARCHAR(10) NOT NULL UNIQUE,
    category VARCHAR(255) NOT NULL,
    subcategory VARCHAR(255) NOT NULL,
    discount DECIMAL(5, 2) DEFAULT NULL,
    image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;

const productTable = `
  CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id VARCHAR(255) NOT NULL,
    product_id VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    subcategory VARCHAR(255) NOT NULL,
    size VARCHAR(50) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    image VARCHAR(255),
    originalAmount DECIMAL(10, 2),
    discountAmount DECIMAL(10, 2),
    stock INT,
    description VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id ) REFERENCES categories(category_id) 
  );
`;

const reviewTable = `
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,              
  productId VARCHAR(255) NOT NULL,                         
  name VARCHAR(255) NOT NULL,                     
  email VARCHAR(255) NOT NULL,                    
  purchaseDate DATE NOT NULL,                     
  experience VARCHAR(255) NOT NULL,              
  rating INT CHECK (rating >= 1 AND rating <= 5), 
  review TEXT,                                   
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
  FOREIGN KEY (productId) REFERENCES products(product_id) ON DELETE CASCADE
);`

const wishlistTable = `
CREATE TABLE wishlist (
     id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    product_id VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    image VARCHAR(255),
    price DECIMAL(10, 2),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    UNIQUE (user_id, product_id)
);`

const addToCartTable = `
CREATE TABLE cart (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    product_id VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    image VARCHAR(255),
    quantity INT DEFAULT 1,
    price DECIMAL(10, 2),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    UNIQUE (user_id, product_id)
);
`

const createTables = async () => {
  const tableQueries = [
    usersTable,
    categoriesTable,
    productTable,
    reviewTable,
    wishlistTable,
    addToCartTable
  ];

  for (const tableQuery of tableQueries) {
    try {
      await db.query(tableQuery);
      console.log('Table created successfully');
    } catch (error) {
      console.error('Error creating table: ' + error.message);
    }
  }
};


createTables(); // Ensure tables are created

module.exports = {
  pool: db
};
