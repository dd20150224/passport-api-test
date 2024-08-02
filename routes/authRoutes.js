// const passport = require('passport');
const router = require("express").Router();
const AuthController = require('../controllers/authController');

// Test
//
// login -> callback -> call different APIs
router.get('/test', AuthController.login);


router.get('/callback2', AuthController.callback);

module.exports = router;