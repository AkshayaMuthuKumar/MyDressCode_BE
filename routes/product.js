const express = require('express');
const { addCategory, getCategory, addProduct, getCategoryIdBySubcategory, upload, getTopCategories, getProductById, getUniqueFilters, getProductsbySelectedCategory,getReviewsByProductId, 
addReview,getProduct, getJustArrivedProducts } = require('../controller/product');
//Oct15

const router = express.Router();


router.post('/addCategory',  upload.single('image'), addCategory);
router.post('/addProduct', upload.single('image'), addProduct); // Use 'image' as the field name in your form

router.get('/getCategory', getCategory);
router.get('/getTopCategories', getTopCategories);
router.get('/getProductById/:productId', getProductById);
router.get('/getUniqueFilters', getUniqueFilters);
router.get('/getCategoryIdBySubcategory', getCategoryIdBySubcategory);
router.get('/getProductsbySelectedCategory', getProductsbySelectedCategory);
router.get('/getReviewsByProductId/:productId', getReviewsByProductId);
router.post('/addReview', addReview);
router.get('/getProduct', getProduct);
router.get('/just-arrived', getJustArrivedProducts);




module.exports = router;
