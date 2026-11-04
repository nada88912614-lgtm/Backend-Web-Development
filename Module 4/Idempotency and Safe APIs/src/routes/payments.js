
'use strict';
// routes/payments.js

const router = require('express').Router();
const { charges, idempotency, nextChargeId } = require('../store');

router.post('/', (req, res) => {

  // Step 1: Read the Idempotency-Key header
  const key = req.headers['idempotency-key'];

  // Step 2: Reject requests without an idempotency key
  if (!key) {
    return res.status(400).json({
      error: {
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'Idempotency-Key header is required'
      }
    });
  }

  // Step 3: Check if the key already exists
  if (idempotency.has(key)) {
    const saved = idempotency.get(key);

    return res.status(saved.status).json(saved.body);
  }

  // Step 4: Create a new charge
  const amount = req.body && req.body.amount;

  const charge = {
    id: nextChargeId(),
    amount,
    status: 'charged'
  };

  // Step 5: Add the charge to the charges array
  charges.push(charge);

  // Step 6: Prepare the response body
  const body = {
    id: charge.id,
    amount: charge.amount,
    status: charge.status
  };

  // Step 7: Store the key and complete response
  idempotency.set(key, {
    status: 201,
    body: body
  });

  // Step 8: Return the response
  return res.status(201).json(body);
});

module.exports = router;
