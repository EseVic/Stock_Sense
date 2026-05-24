const router         = require("express").Router();
const AuthController = require("../controllers/auth.controller");
const auth           = require("../middleware/auth");

router.post("/register",            AuthController.register);
router.post("/login",               AuthController.login);
router.get("/me",              auth, AuthController.me);

// Email verification
router.get("/verify-email",         AuthController.verifyEmail);
router.post("/resend-verification", AuthController.resendVerification);

// Password reset
router.post("/forgot-password",     AuthController.forgotPassword);
router.post("/reset-password",      AuthController.resetPassword);

module.exports = router;