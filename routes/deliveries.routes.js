const { Router } = require('express');
const { check } = require('express-validator');
const {
  createDelivery,
  getAllDeliveries,
  putDelivery,
  deleteDelivery,
  getDelivery,
  sendEmail,
} = require('../controllers/deliveries');
const { validVisit } = require('../helpers/db-validators');
const { validateJWT, validateFields } = require('../middlewares');

const router = Router();

//GET all deliveries
router.get('/', getAllDeliveries);

router.post('/email', [validateJWT, validateFields], sendEmail);

//GET delivery by user ID
router.get(
  '/:id',
  [check('id', 'ID is required').not().isEmpty(), validateFields],
  getDelivery
);

//Create delivery
router.post(
  '/',
  [
    validateJWT,
    check('customerId', 'The customer ID is required').not().isEmpty(),
    check('customerId', 'The customer ID have to be a number').isNumeric(),
    check('uid', 'Customer ID no valid').not().isEmpty(),
    check('uid', 'Customer ID no valid').isMongoId(),
    validateFields,
  ],
  createDelivery
);

// Edit delivery
router.put(
  '/:id',
  [
    validateJWT,
    check('id', 'Is not valid ID').isMongoId(),
    check('id').custom(validVisit),
    validateFields,
  ],
  putDelivery
);

// Delete delivery
router.delete(
  '/:id',
  [
    check('id', 'Is not valid ID').isMongoId(),
    check('id').custom(validVisit),
    validateFields,
  ],
  deleteDelivery
);

module.exports = router;
