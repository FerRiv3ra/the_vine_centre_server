const validateFields = require("../middlewares/validate-fields");
const validateJWT = require("../middlewares/validate-jwt");
const isAdminRole = require("../middlewares/validate-roles");
const validateFile = require("../middlewares/validate-file");

module.exports = {
  ...validateFields,
  ...validateJWT,
  ...isAdminRole,
  ...validateFile,
};
