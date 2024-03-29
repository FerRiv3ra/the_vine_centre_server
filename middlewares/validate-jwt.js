const { request, response } = require('express');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const validateJWT = async (req = request, res = response, next) => {
  const token = req.header('x-token');

  if (!token) {
    return res.status(401).json({
      msg: 'There are not token in the request',
    });
  }

  try {
    const { uid } = jwt.verify(token, process.env.SECRETORPRIVATEKEY);

    const user = await Admin.findById(uid);

    if (!user) {
      return res.status(401).json({
        msg: 'Invalid token',
      });
    }

    if (!user.state) {
      return res.status(401).json({
        msg: 'Invalid token',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      msg: 'Invalid token',
    });
  }
};

module.exports = {
  validateJWT,
};
