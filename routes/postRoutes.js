const router = require('express').Router()
const AuthController = require("../controllers/authController");


router.post('/register', AuthController.registerUser);
router.post('/login', AuthController.login);
router.post('/forgotPassword', AuthController.forgotPassword);
router.post('/resetPassword/:token', AuthController.resetPassword);

module.exports  = router