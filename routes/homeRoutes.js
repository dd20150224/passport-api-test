const router = require("express").Router();
const HomeController = require('../controllers/homeController');

router.get('/', HomeController.home);
router.get('/dashboard', HomeController.dashboard);

module.exports = router;