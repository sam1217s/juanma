import jwt from 'jsonwebtoken';
import User from '../models/user.js'; 

export const generarJWT = (userId) => {
    return new Promise((resolve, reject) => {
        const payload = { userId };
        jwt.sign(
            payload, 
            process.env.JWT_SECRET, 
            {
                expiresIn: process.env.JWT_TIME || '1h'
            }, 
            (err, token) => {
                if (err) {
                    console.error("Error generando token:", err);
                    reject("No se pudo generar el token");
                } else {
                    resolve(token);
                }
            }
        );
    });
};

export const validarJWT = async (req, res, next) => {
  // ✅ BUSCAR TOKEN EN COOKIE O HEADER
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    if (req.accepts('html')) {
      return res.redirect('/?error=no_token');
    }
    return res.status(401).json({ success: false, msg: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      res.clearCookie('token');
      if (req.accepts('html')) {
        return res.redirect('/?error=user_not_found');
      }
      return res.status(401).json({ success: false, msg: 'User not found' });
    }

    req.user = user;
    req.userId = user._id;
    next();

  } catch (error) {
    res.clearCookie('token');
    
    if (req.accepts('html')) {
      let redirectUrl = '/?error=invalid_token';
      if (error.name === 'TokenExpiredError') {
        redirectUrl = '/?error=token_expired';
      } else if (error.name === 'JsonWebTokenError') {
        redirectUrl = '/?error=malformed_token';
      }
      return res.redirect(redirectUrl);
    }
    
    return res.status(401).json({ 
      success: false, 
      msg: 'Invalid token',
      error: error.name 
    });
  }
};
