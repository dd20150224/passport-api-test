const router = require("express").Router();
const HelpController = require('../controllers/helpController');

router.get('/', HelpController.index);

module.exports = router;