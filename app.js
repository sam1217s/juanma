import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './DB/database.js';
import userRouter from './router/user.js';
import dashboardRouter from './router/dashboard.js';
import { validarJWT } from './middlewares/tokens.js';

// Configuración inicial
dotenv.config();
const app = express();

// Obtener __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración CORS mejorada para producción
const allowedOrigins = [
  'http://localhost:4000',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  // Agrega aquí tu dominio de Render cuando lo tengas
  // 'https://tu-app.onrender.com'
];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // En desarrollo, permitir todos los orígenes
      if (process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('No permitido por CORS'));
      }
    }
  },
  credentials: true
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Log para debugging
console.log('🚀 Iniciando servidor...');
console.log('📊 Environment:', process.env.NODE_ENV);
console.log('🔌 Puerto:', process.env.PORT || 3000);

// Conexión a DB
connectDB();

// Trust proxy para Render
app.set('trust proxy', 1);

// Health check endpoint para Render
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 1. Archivos públicos (accesibles sin autenticación)
app.use(express.static(join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
  etag: false
}));

// 2. Archivos privados (requieren autenticación)
app.use('/private', validarJWT, express.static(join(__dirname, 'private'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : '0',
  etag: false
}));

// 3. Rutas API
app.use('/api/user', userRouter);
app.use('/api/user/dashboard', dashboardRouter);

// Ruta para el registro
app.get('/register', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'registro.html'));
});

// Ruta del dashboard protegida
app.get('/dashboard', validarJWT, (req, res) => {
  res.sendFile(join(__dirname, 'private', 'dashboard.html'));
});

// Ruta raíz
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Manejo de rutas no encontradas para API
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    msg: 'Ruta de API no encontrada' 
  });
});

// Catch-all handler: debe ir al final
app.get('*', (req, res) => {
  // Si es una ruta de API que no existe, devolver 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Ruta no encontrada' });
  }
  
  // Para otras rutas, servir el index.html
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error stack:', err.stack);
  
  // Error de CORS
  if (err.message.includes('CORS')) {
    return res.status(403).json({ 
      success: false, 
      msg: 'Acceso denegado por política CORS' 
    });
  }
  
  res.status(500).json({ 
    success: false, 
    msg: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message 
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📱 URL: ${process.env.NODE_ENV === 'production' ? 'https://tu-app.onrender.com' : `http://localhost:${PORT}`}`);
});