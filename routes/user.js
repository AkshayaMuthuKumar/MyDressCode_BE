const express = require('express');
const { signupUser, loginUser, updateUserRole, getUsers, getCurrentUser,  toggleWishlistItem,
    getUserWishlist,
    toggleCartItem,  getUserCart,
     } = require('../controller/user');
const { authenticateJWT } = require('../middleware/jwtMiddleware'); 
//Oct15

const router = express.Router();

router.post('/signupUser', signupUser);
router.post('/loginUser', loginUser); // Use 'image' as the field name in your form
router.put('/:user_id/updateRole', updateUserRole);
router.get('/getUsers', getUsers  );
router.get('/current-user', authenticateJWT, getCurrentUser);
router.post('/:user_id/toggleWishlistItem', authenticateJWT, toggleWishlistItem);
router.get('/:user_id/getUserWishlist',authenticateJWT, getUserWishlist);
router.post('/:user_id/toggleCartItem', authenticateJWT, toggleCartItem);
// Cart routes
router.get('/:user_id/getUserCart',authenticateJWT, getUserCart);

module.exports = router;
