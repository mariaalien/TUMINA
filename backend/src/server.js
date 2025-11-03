const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');

// SERVICIOS (UNA SOLA VEZ)
const excelReports = require('./services/excelReports');
const simpleExporter = require('./services/simpleExporter');
const pdfExporter = require('./services/pdfExporter');

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ 
    mensaje: '🚀 Servidor ANM-FRI funcionando!',
    fecha: new Date().toISOString()
  });
});

// Ruta de prueba para la API
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    database: 'Conectado',
    version: '1.0.0'
  });
});

// Ruta para probar la conexión a la base de datos
app.get('/api/test-db', async (req, res) => {
  try {
    const count = await prisma.usuario.count();
    res.json({ 
      success: true,
      message: '✅ Conexión a base de datos exitosa',
      totalUsuarios: count
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: '❌ Error al conectar con la base de datos',
      error: error.message
    });
  }
});

// ============ RUTAS DE AUTENTICACIÓN ============

// REGISTRO de nuevo usuario
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, nombre, rol, tituloMineroId } = req.body;

    if (!email || !password || !nombre) {
      return res.status(400).json({
        success: false,
        message: 'Email, contraseña y nombre son obligatorios'
      });
    }

    const usuarioExiste = await prisma.usuario.findUnique({
      where: { email }
    });

    if (usuarioExiste) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }

    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        email,
        password: passwordHash,
        nombre,
        rol: rol || 'OPERADOR',
        tituloMineroId: tituloMineroId || null
      }
    });

    const { password: _, ...usuarioSinPassword } = nuevoUsuario;

    res.status(201).json({
      success: true,
      message: '✅ Usuario creado exitosamente',
      usuario: usuarioSinPassword
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear usuario',
      error: error.message
    });
  }
});

// LOGIN de usuario
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Intento de login:', email);

    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: {
        tituloMinero: {
          select: {
            id: true,
            numeroTitulo: true,
            municipio: true,
            codigoMunicipio: true
          }
        }
      }
    });

    if (!usuario) {
      console.log('❌ Usuario no encontrado:', email);
      return res.status(401).json({
        success: false,
        message: 'Email o contraseña incorrectos'
      });
    }

    const bcrypt = require('bcryptjs');
    const passwordValida = await bcrypt.compare(password, usuario.password);

    if (!passwordValida) {
      console.log('❌ Contraseña incorrecta para:', email);
      return res.status(401).json({
        success: false,
        message: 'Email o contraseña incorrectos'
      });
    }

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        id: usuario.id, 
        email: usuario.email, 
        rol: usuario.rol,
        tituloMineroId: usuario.tituloMineroId
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ Login exitoso:', email);

    res.json({
      success: true,
      message: 'Login exitoso',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        tituloMinero: usuario.tituloMinero
      }
    });

  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: error.message
    });
  }
});

// Ruta protegida de prueba
app.get('/api/auth/perfil', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      usuario
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token inválido o expirado',
      error: error.message
    });
  }
});

// ============ RUTAS FRI PRODUCCIÓN ============

// ==================== OBTENER FRIS CON FILTROS (CORREGIDO) ====================

// GET Producción
app.get('/api/fri/produccion', async (req, res) => {
  try {
    console.log('\n🔍 ===== PETICIÓN GET /api/fri/produccion =====');
    console.log('Headers:', req.headers.authorization ? 'Token presente' : 'Sin token');
    console.log('Query params:', req.query);

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      console.log('❌ Token no proporcionado');
      return res.status(401).json({ success: false, message: 'Token no proporcionado' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Usuario autenticado:', decoded.email, '- Rol:', decoded.rol);

    const filtros = {};

    // Solo sus registros si no es ADMIN
    if (decoded.rol !== 'ADMIN') {
      filtros.usuarioId = decoded.id;
      console.log('👤 Usuario no-admin, filtrando por usuarioId:', decoded.id);
    } else {
      console.log('👑 Usuario ADMIN, sin filtro de usuario');
    }

    // Aplicar filtros de query
    const { fechaInicio, fechaFin, tituloMineroId, usuarioId, mineral, estado } = req.query;

    console.log('📝 Construyendo filtros...');

    if (fechaInicio && fechaFin) {
      filtros.fechaCorte = {
        gte: new Date(fechaInicio),
        lte: new Date(fechaFin)
      };
      console.log(`   📅 Rango de fechas: ${fechaInicio} a ${fechaFin}`);
    } else if (fechaInicio) {
      filtros.fechaCorte = { gte: new Date(fechaInicio) };
      console.log(`   📅 Desde: ${fechaInicio}`);
    } else if (fechaFin) {
      filtros.fechaCorte = { lte: new Date(fechaFin) };
      console.log(`   📅 Hasta: ${fechaFin}`);
    }

    if (tituloMineroId && tituloMineroId !== '') {
      filtros.tituloMineroId = tituloMineroId;
      console.log(`   🏔️ Título minero: ${tituloMineroId}`);
    }

    if (usuarioId && usuarioId !== '' && decoded.rol === 'ADMIN') {
      filtros.usuarioId = usuarioId;
      console.log(`   👤 Usuario: ${usuarioId}`);
    }

    if (mineral && mineral !== '') {
      filtros.mineral = mineral;
      console.log(`   ⛏️ Mineral: ${mineral}`);
    }

    if (estado && estado !== '') {
      filtros.estado = estado;
      console.log(`   📊 Estado: ${estado}`);
    }

    console.log('🔍 Filtros finales:', JSON.stringify(filtros, null, 2));

    const fris = await prisma.fRIProduccion.findMany({
      where: filtros,
      include: {
        usuario: { select: { id: true, nombre: true, email: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true, codigoMunicipio: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`✅ Encontrados: ${fris.length} registros`);
    
    if (fris.length > 0) {
      console.log('📋 Primeros 2 registros:');
      fris.slice(0, 2).forEach((f, i) => {
        console.log(`   ${i + 1}. ${f.fechaCorte} - ${f.mineral} - ${f.estado}`);
      });
    }

    res.json({ success: true, total: fris.length, fris });

  } catch (error) {
    console.error('❌ ERROR en GET producción:', error);
    res.status(500).json({ success: false, message: 'Error al obtener FRIs', error: error.message });
  }
});
// GET Inventarios
app.get('/api/fri/inventarios', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token no proporcionado' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const filtros = {};
    if (decoded.rol !== 'ADMIN') {
      filtros.usuarioId = decoded.id;
    }

    const { fechaInicio, fechaFin, tituloMineroId, usuarioId, mineral, estado } = req.query;

    if (fechaInicio && fechaFin) {
      filtros.fechaCorte = { gte: new Date(fechaInicio), lte: new Date(fechaFin) };
    } else if (fechaInicio) {
      filtros.fechaCorte = { gte: new Date(fechaInicio) };
    } else if (fechaFin) {
      filtros.fechaCorte = { lte: new Date(fechaFin) };
    }

    if (tituloMineroId && tituloMineroId !== '') filtros.tituloMineroId = tituloMineroId;
    if (usuarioId && usuarioId !== '' && decoded.rol === 'ADMIN') filtros.usuarioId = usuarioId;
    if (mineral && mineral !== '') filtros.mineral = mineral;
    if (estado && estado !== '') filtros.estado = estado;

    console.log('🔍 Filtros Inventarios:', filtros);

    const fris = await prisma.fRIInventarios.findMany({
      where: filtros,
      include: {
        usuario: { select: { id: true, nombre: true, email: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, total: fris.length, fris });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener FRIs', error: error.message });
  }
});

// GET Paradas
app.get('/api/fri/paradas', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token no proporcionado' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const filtros = {};
    if (decoded.rol !== 'ADMIN') filtros.usuarioId = decoded.id;

    const { fechaInicio, fechaFin, tituloMineroId, usuarioId, estado } = req.query;

    if (fechaInicio && fechaFin) {
      filtros.fechaCorte = { gte: new Date(fechaInicio), lte: new Date(fechaFin) };
    } else if (fechaInicio) {
      filtros.fechaCorte = { gte: new Date(fechaInicio) };
    } else if (fechaFin) {
      filtros.fechaCorte = { lte: new Date(fechaFin) };
    }

    if (tituloMineroId && tituloMineroId !== '') filtros.tituloMineroId = tituloMineroId;
    if (usuarioId && usuarioId !== '' && decoded.rol === 'ADMIN') filtros.usuarioId = usuarioId;
    if (estado && estado !== '') filtros.estado = estado;

    const fris = await prisma.fRIParadas.findMany({
      where: filtros,
      include: {
        usuario: { select: { id: true, nombre: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, total: fris.length, fris });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
});

// GET Ejecución
app.get('/api/fri/ejecucion', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token no proporcionado' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const filtros = {};
    if (decoded.rol !== 'ADMIN') filtros.usuarioId = decoded.id;

    const { fechaInicio, fechaFin, tituloMineroId, usuarioId, mineral, estado } = req.query;

    if (fechaInicio && fechaFin) {
      filtros.fechaCorte = { gte: new Date(fechaInicio), lte: new Date(fechaFin) };
    } else if (fechaInicio) {
      filtros.fechaCorte = { gte: new Date(fechaInicio) };
    } else if (fechaFin) {
      filtros.fechaCorte = { lte: new Date(fechaFin) };
    }

    if (tituloMineroId && tituloMineroId !== '') filtros.tituloMineroId = tituloMineroId;
    if (usuarioId && usuarioId !== '' && decoded.rol === 'ADMIN') filtros.usuarioId = usuarioId;
    if (mineral && mineral !== '') filtros.mineral = mineral;
    if (estado && estado !== '') filtros.estado = estado;

    const fris = await prisma.fRIEjecucion.findMany({
      where: filtros,
      include: {
        usuario: { select: { id: true, nombre: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, total: fris.length, fris });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
});

// GET Maquinaria
app.get('/api/fri/maquinaria', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token no proporcionado' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const filtros = {};
    if (decoded.rol !== 'ADMIN') filtros.usuarioId = decoded.id;

    const { fechaInicio, fechaFin, tituloMineroId, usuarioId, estado } = req.query;

    if (fechaInicio && fechaFin) {
      filtros.fechaCorte = { gte: new Date(fechaInicio), lte: new Date(fechaFin) };
    } else if (fechaInicio) {
      filtros.fechaCorte = { gte: new Date(fechaInicio) };
    } else if (fechaFin) {
      filtros.fechaCorte = { lte: new Date(fechaFin) };
    }

    if (tituloMineroId && tituloMineroId !== '') filtros.tituloMineroId = tituloMineroId;
    if (usuarioId && usuarioId !== '' && decoded.rol === 'ADMIN') filtros.usuarioId = usuarioId;
    if (estado && estado !== '') filtros.estado = estado;

    const fris = await prisma.fRIMaquinaria.findMany({
      where: filtros,
      include: {
        usuario: { select: { id: true, nombre: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, total: fris.length, fris });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
});

// GET Regalías
app.get('/api/fri/regalias', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token no proporcionado' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const filtros = {};
    if (decoded.rol !== 'ADMIN') filtros.usuarioId = decoded.id;

    const { fechaInicio, fechaFin, tituloMineroId, usuarioId, mineral, estado } = req.query;

    if (fechaInicio && fechaFin) {
      filtros.fechaCorte = { gte: new Date(fechaInicio), lte: new Date(fechaFin) };
    } else if (fechaInicio) {
      filtros.fechaCorte = { gte: new Date(fechaInicio) };
    } else if (fechaFin) {
      filtros.fechaCorte = { lte: new Date(fechaFin) };
    }

    if (tituloMineroId && tituloMineroId !== '') filtros.tituloMineroId = tituloMineroId;
    if (usuarioId && usuarioId !== '' && decoded.rol === 'ADMIN') filtros.usuarioId = usuarioId;
    if (mineral && mineral !== '') filtros.mineral = mineral;
    if (estado && estado !== '') filtros.estado = estado;

    const fris = await prisma.fRIRegalias.findMany({
      where: filtros,
      include: {
        usuario: { select: { id: true, nombre: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, total: fris.length, fris });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
});

app.get('/api/fri/produccion', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // CONSTRUIR FILTROS DINÁMICOS
    const filtros = {};

    // Si no es ADMIN, solo sus registros
    if (decoded.rol !== 'ADMIN') {
      filtros.usuarioId = decoded.id;
    }

    // Aplicar filtros de query params
    const { 
      fechaInicio, 
      fechaFin, 
      tituloMineroId, 
      usuarioId, 
      mineral, 
      estado 
    } = req.query;

    if (fechaInicio) {
      filtros.fechaCorte = { 
        gte: new Date(fechaInicio) 
      };
    }

    if (fechaFin) {
      filtros.fechaCorte = {
        ...filtros.fechaCorte,
        lte: new Date(fechaFin)
      };
    }

    if (tituloMineroId) {
      filtros.tituloMineroId = tituloMineroId;
    }

    if (usuarioId && decoded.rol === 'ADMIN') {
      filtros.usuarioId = usuarioId;
    }

    if (mineral) {
      filtros.mineral = mineral;
    }

    if (estado) {
      filtros.estado = estado;
    }

    console.log('🔍 Filtros aplicados:', filtros);

    const fris = await prisma.fRIProduccion.findMany({
      where: filtros,
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true
          }
        },
        tituloMinero: {
          select: {
            numeroTitulo: true,
            municipio: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      total: fris.length,
      fris
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener FRIs',
      error: error.message
    });
  }
});

// ==================== FRI INVENTARIOS ====================
app.post('/api/fri/inventarios', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { mineral, unidadMedida, inventarioInicialAcopio, inventarioFinalAcopio, ingresoAcopio, salidaAcopio, observaciones } = req.body;

    if (!mineral || !unidadMedida) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: decoded.id } });
    if (!usuario || !usuario.tituloMineroId) {
      return res.status(400).json({ success: false, message: 'Usuario debe estar asociado a un título minero' });
    }

    const nuevoFRI = await prisma.fRIInventarios.create({
      data: {
        fechaCorte: new Date(),
        mineral,
        unidadMedida,
        inventarioInicialAcopio: parseFloat(inventarioInicialAcopio) || 0,
        inventarioFinalAcopio: parseFloat(inventarioFinalAcopio) || 0,
        ingresoAcopio: parseFloat(ingresoAcopio) || 0,
        salidaAcopio: parseFloat(salidaAcopio) || 0,
        observaciones: observaciones || '',
        estado: 'BORRADOR',
        usuarioId: decoded.id,
        tituloMineroId: usuario.tituloMineroId
      },
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      }
    });

    res.status(201).json({ success: true, message: '✅ FRI Inventarios creado', fri: nuevoFRI });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear FRI', error: error.message });
  }
});

app.get('/api/fri/inventarios', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const filtros = decoded.rol !== 'ADMIN' ? { usuarioId: decoded.id } : {};
    const fris = await prisma.fRIInventarios.findMany({
      where: filtros,
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, total: fris.length, fris });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener FRIs', error: error.message });
  }
});

// ==================== FRI PARADAS ====================
app.post('/api/fri/paradas', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { tipoParada, fechaInicio, fechaFin, horasParadas, motivo, observaciones } = req.body;

    if (!tipoParada || !fechaInicio || !motivo) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: decoded.id } });
    if (!usuario || !usuario.tituloMineroId) {
      return res.status(400).json({ success: false, message: 'Usuario debe estar asociado a un título minero' });
    }

    const nuevoFRI = await prisma.fRIParadas.create({
      data: {
        fechaCorte: new Date(),
        tipoParada,
        fechaInicio: new Date(fechaInicio),
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        horasParadas: parseFloat(horasParadas) || 0,
        motivo,
        observaciones: observaciones || '',
        estado: 'BORRADOR',
        usuarioId: decoded.id,
        tituloMineroId: usuario.tituloMineroId
      },
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      }
    });

    res.status(201).json({ success: true, message: '✅ FRI Paradas creado', fri: nuevoFRI });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear FRI', error: error.message });
  }
});

app.get('/api/fri/paradas', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const filtros = decoded.rol !== 'ADMIN' ? { usuarioId: decoded.id } : {};
    const fris = await prisma.fRIParadas.findMany({
      where: filtros,
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, total: fris.length, fris });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener FRIs', error: error.message });
  }
});

// ==================== FRI EJECUCIÓN ====================
app.post('/api/fri/ejecucion', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { mineral, denominacionFrente, latitud, longitud, metodoExplotacion, avanceEjecutado, unidadMedidaAvance, volumenEjecutado, observaciones } = req.body;

    if (!mineral || !denominacionFrente || !metodoExplotacion) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: decoded.id } });
    if (!usuario || !usuario.tituloMineroId) {
      return res.status(400).json({ success: false, message: 'Usuario debe estar asociado a un título minero' });
    }

    const nuevoFRI = await prisma.fRIEjecucion.create({
      data: {
        fechaCorte: new Date(),
        mineral,
        denominacionFrente,
        latitud: parseFloat(latitud) || 0,
        longitud: parseFloat(longitud) || 0,
        metodoExplotacion,
        avanceEjecutado: parseFloat(avanceEjecutado) || 0,
        unidadMedidaAvance: unidadMedidaAvance || 'm',
        volumenEjecutado: parseFloat(volumenEjecutado) || 0,
        observaciones: observaciones || '',
        estado: 'BORRADOR',
        usuarioId: decoded.id,
        tituloMineroId: usuario.tituloMineroId
      },
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      }
    });

    res.status(201).json({ success: true, message: '✅ FRI Ejecución creado', fri: nuevoFRI });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear FRI', error: error.message });
  }
});

app.get('/api/fri/ejecucion', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const filtros = decoded.rol !== 'ADMIN' ? { usuarioId: decoded.id } : {};
    const fris = await prisma.fRIEjecucion.findMany({
      where: filtros,
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, total: fris.length, fris });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener FRIs', error: error.message });
  }
});

// ==================== FRI MAQUINARIA ====================
app.post('/api/fri/maquinaria', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { tipoMaquinaria, cantidad, horasOperacion, capacidadTransporte, unidadCapacidad, observaciones } = req.body;

    if (!tipoMaquinaria) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: decoded.id } });
    if (!usuario || !usuario.tituloMineroId) {
      return res.status(400).json({ success: false, message: 'Usuario debe estar asociado a un título minero' });
    }

    const nuevoFRI = await prisma.fRIMaquinaria.create({
      data: {
        fechaCorte: new Date(),
        tipoMaquinaria,
        cantidad: parseInt(cantidad) || 1,
        horasOperacion: parseFloat(horasOperacion) || 0,
        capacidadTransporte: capacidadTransporte ? parseFloat(capacidadTransporte) : null,
        unidadCapacidad: unidadCapacidad || null,
        observaciones: observaciones || '',
        estado: 'BORRADOR',
        usuarioId: decoded.id,
        tituloMineroId: usuario.tituloMineroId
      },
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      }
    });

    res.status(201).json({ success: true, message: '✅ FRI Maquinaria creado', fri: nuevoFRI });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear FRI', error: error.message });
  }
});

app.get('/api/fri/maquinaria', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const filtros = decoded.rol !== 'ADMIN' ? { usuarioId: decoded.id } : {};
    const fris = await prisma.fRIMaquinaria.findMany({
      where: filtros,
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, total: fris.length, fris });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener FRIs', error: error.message });
  }
});

// ==================== FRI REGALÍAS ====================
app.post('/api/fri/regalias', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { mineral, cantidadExtraida, unidadMedida, valorDeclaracion, valorContraprestaciones, resolucionUPME, observaciones } = req.body;

    if (!mineral) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: decoded.id } });
    if (!usuario || !usuario.tituloMineroId) {
      return res.status(400).json({ success: false, message: 'Usuario debe estar asociado a un título minero' });
    }

    const nuevoFRI = await prisma.fRIRegalias.create({
      data: {
        fechaCorte: new Date(),
        mineral,
        cantidadExtraida: parseFloat(cantidadExtraida) || 0,
        unidadMedida: unidadMedida || 'TONELADAS',
        valorDeclaracion: parseFloat(valorDeclaracion) || 0,
        valorContraprestaciones: valorContraprestaciones ? parseFloat(valorContraprestaciones) : null,
        resolucionUPME: resolucionUPME || null,
        observaciones: observaciones || '',
        estado: 'BORRADOR',
        usuarioId: decoded.id,
        tituloMineroId: usuario.tituloMineroId
      },
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      }
    });

    res.status(201).json({ success: true, message: '✅ FRI Regalías creado', fri: nuevoFRI });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear FRI', error: error.message });
  }
});

app.get('/api/fri/regalias', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const filtros = decoded.rol !== 'ADMIN' ? { usuarioId: decoded.id } : {};
    const fris = await prisma.fRIRegalias.findMany({
      where: filtros,
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        tituloMinero: { select: { id: true, numeroTitulo: true, municipio: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, total: fris.length, fris });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener FRIs', error: error.message });
  }
});

// ==================== ENDPOINT PARA LISTAR USUARIOS ====================
app.get('/api/usuarios', async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        tituloMinero: {
          select: {
            numeroTitulo: true,
            municipio: true
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    res.json({
      success: true,
      total: usuarios.length,
      usuarios
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios',
      error: error.message
    });
  }
});

// ==================== ENDPOINT ESTADÍSTICAS GENERALES ====================
app.get('/api/fri/estadisticas', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const filtro = decoded.rol !== 'ADMIN' ? { usuarioId: decoded.id } : {};

    const [
      totalTitulos,
      totalUsuarios,
      produccion,
      inventarios,
      paradas,
      ejecucion,
      maquinaria,
      regalias
    ] = await Promise.all([
      prisma.tituloMinero.count(),
      prisma.usuario.count(),
      prisma.fRIProduccion.count({ where: filtro }),
      prisma.fRIInventarios.count({ where: filtro }),
      prisma.fRIParadas.count({ where: filtro }),
      prisma.fRIEjecucion.count({ where: filtro }),
      prisma.fRIMaquinaria.count({ where: filtro }),
      prisma.fRIRegalias.count({ where: filtro })
    ]);

    const totalFRIs = produccion + inventarios + paradas + ejecucion + maquinaria + regalias;

    res.json({
      success: true,
      estadisticas: {
        sistema: {
          titulosMineros: totalTitulos,
          usuarios: totalUsuarios,
          totalFRIs
        },
        porTipo: {
          produccion,
          inventarios,
          paradas,
          ejecucion,
          maquinaria,
          regalias
        }
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas', error: error.message });
  }
});

// ==================== CAMBIAR ESTADO DE FORMULARIOS ====================

// Enviar todos los borradores de un usuario
app.post('/api/fri/enviar-borradores', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Actualizar todos los borradores del usuario a ENVIADO
    const [
      produccionActualizados,
      inventariosActualizados,
      paradasActualizadas,
      ejecucionActualizados,
      maquinariaActualizados,
      regaliasActualizados
    ] = await Promise.all([
      prisma.fRIProduccion.updateMany({
        where: { usuarioId: decoded.id, estado: 'BORRADOR' },
        data: { estado: 'ENVIADO', updatedAt: new Date() }
      }),
      prisma.fRIInventarios.updateMany({
        where: { usuarioId: decoded.id, estado: 'BORRADOR' },
        data: { estado: 'ENVIADO', updatedAt: new Date() }
      }),
      prisma.fRIParadas.updateMany({
        where: { usuarioId: decoded.id, estado: 'BORRADOR' },
        data: { estado: 'ENVIADO', updatedAt: new Date() }
      }),
      prisma.fRIEjecucion.updateMany({
        where: { usuarioId: decoded.id, estado: 'BORRADOR' },
        data: { estado: 'ENVIADO', updatedAt: new Date() }
      }),
      prisma.fRIMaquinaria.updateMany({
        where: { usuarioId: decoded.id, estado: 'BORRADOR' },
        data: { estado: 'ENVIADO', updatedAt: new Date() }
      }),
      prisma.fRIRegalias.updateMany({
        where: { usuarioId: decoded.id, estado: 'BORRADOR' },
        data: { estado: 'ENVIADO', updatedAt: new Date() }
      })
    ]);

    const totalActualizados = 
      produccionActualizados.count +
      inventariosActualizados.count +
      paradasActualizadas.count +
      ejecucionActualizados.count +
      maquinariaActualizados.count +
      regaliasActualizados.count;

    res.json({
      success: true,
      message: `✅ ${totalActualizados} formularios enviados correctamente`,
      detalles: {
        produccion: produccionActualizados.count,
        inventarios: inventariosActualizados.count,
        paradas: paradasActualizadas.count,
        ejecucion: ejecucionActualizados.count,
        maquinaria: maquinariaActualizados.count,
        regalias: regaliasActualizados.count
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al enviar borradores',
      error: error.message
    });
  }
});

// Cambiar estado de un FRI específico
app.put('/api/fri/:tipo/:id/estado', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const { tipo, id } = req.params;
    const { estado } = req.body;

    // Validar estado
    const estadosValidos = ['BORRADOR', 'ENVIADO', 'APROBADO', 'RECHAZADO'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido. Debe ser: BORRADOR, ENVIADO, APROBADO o RECHAZADO'
      });
    }

    // Mapear tipo a modelo
    const modelos = {
      'produccion': prisma.fRIProduccion,
      'inventarios': prisma.fRIInventarios,
      'paradas': prisma.fRIParadas,
      'ejecucion': prisma.fRIEjecucion,
      'maquinaria': prisma.fRIMaquinaria,
      'regalias': prisma.fRIRegalias
    };

    const modelo = modelos[tipo];
    if (!modelo) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de FRI inválido'
      });
    }

    // Verificar que el FRI existe y pertenece al usuario (o es ADMIN)
    const friExistente = await modelo.findUnique({
      where: { id }
    });

    if (!friExistente) {
      return res.status(404).json({
        success: false,
        message: 'FRI no encontrado'
      });
    }

    // Solo el dueño o ADMIN pueden cambiar el estado
    if (decoded.rol !== 'ADMIN' && friExistente.usuarioId !== decoded.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para cambiar el estado de este FRI'
      });
    }

    // Actualizar estado
    const friActualizado = await modelo.update({
      where: { id },
      data: { 
        estado,
        updatedAt: new Date()
      },
      include: {
        usuario: { select: { id: true, nombre: true } }
      }
    });

    res.json({
      success: true,
      message: `✅ Estado cambiado a ${estado}`,
      fri: friActualizado
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al cambiar estado',
      error: error.message
    });
  }
});

// Contar borradores pendientes de un usuario
app.get('/api/fri/borradores/count', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [
      produccion,
      inventarios,
      paradas,
      ejecucion,
      maquinaria,
      regalias
    ] = await Promise.all([
      prisma.fRIProduccion.count({
        where: { usuarioId: decoded.id, estado: 'BORRADOR' }
      }),
      prisma.fRIInventarios.count({
        where: { usuarioId: decoded.id, estado: 'BORRADOR' }
      }),
      prisma.fRIParadas.count({
        where: { usuarioId: decoded.id, estado: 'BORRADOR' }
      }),
      prisma.fRIEjecucion.count({
        where: { usuarioId: decoded.id, estado: 'BORRADOR' }
      }),
      prisma.fRIMaquinaria.count({
        where: { usuarioId: decoded.id, estado: 'BORRADOR' }
      }),
      prisma.fRIRegalias.count({
        where: { usuarioId: decoded.id, estado: 'BORRADOR' }
      })
    ]);

    const total = produccion + inventarios + paradas + ejecucion + maquinaria + regalias;

    res.json({
      success: true,
      total,
      detalles: {
        produccion,
        inventarios,
        paradas,
        ejecucion,
        maquinaria,
        regalias
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al contar borradores',
      error: error.message
    });
  }
});

// ==================== ENDPOINTS DE REPORTES ====================


// Generar reporte de producción en Excel
app.get('/api/reportes/produccion/excel', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Filtros
    const { fechaInicio, fechaFin, mineral, estado } = req.query;
    
    const filtros = {};
    if (fechaInicio) filtros.fechaCorte = { gte: new Date(fechaInicio) };
    if (fechaFin) {
      filtros.fechaCorte = { 
        ...filtros.fechaCorte, 
        lte: new Date(fechaFin) 
      };
    }
    if (mineral) filtros.mineral = mineral;
    if (estado) filtros.estado = estado;

    // Solo sus propios datos si no es ADMIN
    if (decoded.rol !== 'ADMIN') {
      filtros.usuarioId = decoded.id;
    }

    const datos = await prisma.fRIProduccion.findMany({
      where: filtros,
      include: {
        usuario: { select: { nombre: true } },
        tituloMinero: { select: { numeroTitulo: true, municipio: true } }
      },
      orderBy: { fechaCorte: 'desc' }
    });

    const workbook = await excelReports.generarReporteProduccion(datos, req.query);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=reporte_produccion_${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error al generar reporte:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar reporte',
      error: error.message
    });
  }
});

// Generar reporte consolidado
app.get('/api/reportes/consolidado/excel', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const filtro = decoded.rol !== 'ADMIN' ? { usuarioId: decoded.id } : {};

    const [produccion, inventarios, paradas, ejecucion, maquinaria, regalias] = await Promise.all([
      prisma.fRIProduccion.findMany({ where: filtro, include: { tituloMinero: true } }),
      prisma.fRIInventarios.findMany({ where: filtro, include: { tituloMinero: true } }),
      prisma.fRIParadas.findMany({ where: filtro, include: { tituloMinero: true } }),
      prisma.fRIEjecucion.findMany({ where: filtro, include: { tituloMinero: true } }),
      prisma.fRIMaquinaria.findMany({ where: filtro, include: { tituloMinero: true } }),
      prisma.fRIRegalias.findMany({ where: filtro, include: { tituloMinero: true } })
    ]);

    const workbook = await excelReports.generarReporteConsolidado({
      produccion,
      inventarios,
      paradas,
      ejecucion,
      maquinaria,
      regalias
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=reporte_consolidado_${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error al generar reporte:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar reporte consolidado',
      error: error.message
    });
  }
});

// Estadísticas avanzadas para dashboard
app.get('/api/dashboard/estadisticas-avanzadas', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const filtro = decoded.rol !== 'ADMIN' ? { usuarioId: decoded.id } : {};

    // Producción por mineral
    const produccionPorMineral = await prisma.fRIProduccion.groupBy({
      by: ['mineral'],
      where: filtro,
      _sum: {
        cantidadProduccion: true,
        horasOperativas: true
      },
      _count: {
        id: true
      }
    });

    // Producción por mes (últimos 6 meses)
    const fechaLimite = new Date();
    fechaLimite.setMonth(fechaLimite.getMonth() - 6);

    const produccionMensual = await prisma.fRIProduccion.groupBy({
      by: ['fechaCorte'],
      where: {
        ...filtro,
        fechaCorte: {
          gte: fechaLimite
        }
      },
      _sum: {
        cantidadProduccion: true
      }
    });

    // Estados de formularios
    const estadosProduccion = await prisma.fRIProduccion.groupBy({
      by: ['estado'],
      where: filtro,
      _count: {
        id: true
      }
    });

    // Top usuarios por producción (solo para ADMIN)
    let topUsuarios = [];
    if (decoded.rol === 'ADMIN') {
      topUsuarios = await prisma.fRIProduccion.groupBy({
        by: ['usuarioId'],
        _count: {
          id: true
        },
        _sum: {
          cantidadProduccion: true
        },
        orderBy: {
          _sum: {
            cantidadProduccion: 'desc'
          }
        },
        take: 5
      });

      // Obtener nombres de usuarios
      const usuariosIds = topUsuarios.map(u => u.usuarioId);
      const usuarios = await prisma.usuario.findMany({
        where: { id: { in: usuariosIds } },
        select: { id: true, nombre: true }
      });

      topUsuarios = topUsuarios.map(top => {
        const usuario = usuarios.find(u => u.id === top.usuarioId);
        return {
          usuario: usuario?.nombre || 'Desconocido',
          registros: top._count.id,
          produccionTotal: parseFloat(top._sum.cantidadProduccion || 0)
        };
      });
    }

    res.json({
      success: true,
      estadisticas: {
        produccionPorMineral: produccionPorMineral.map(p => ({
          mineral: p.mineral,
          cantidad: parseFloat(p._sum.cantidadProduccion || 0),
          horas: parseFloat(p._sum.horasOperativas || 0),
          registros: p._count.id
        })),
        produccionMensual: produccionMensual.map(p => ({
          fecha: p.fechaCorte,
          cantidad: parseFloat(p._sum.cantidadProduccion || 0)
        })),
        estadosFormularios: estadosProduccion.map(e => ({
          estado: e.estado,
          cantidad: e._count.id
        })),
        topUsuarios
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
});

// Listar títulos mineros
app.get('/api/titulos-mineros', async (req, res) => {
  try {
    const titulos = await prisma.tituloMinero.findMany({
      orderBy: { numeroTitulo: 'asc' }
    });

    res.json({
      success: true,
      total: titulos.length,
      titulos
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener títulos mineros',
      error: error.message
    });
  }
});

// ==================== ENDPOINT EXPORTACIÓN ANM ====================

// ==================== ENDPOINT EXPORTACIÓN ANM (CORREGIDO) ====================
// ============================================
// DESPUÉS (CORRECTO) ✅
// ============================================
// ==================== COPIAR Y PEGAR ESTE CÓDIGO EN server.js ====================
// Busca el endpoint: app.post('/api/reportes/exportar-anm'
// Reemplaza TODO el endpoint con este código
// ==================================================================================

app.post('/api/reportes/exportar-anm', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token no proporcionado' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ SOLUCIÓN: Valores por defecto para evitar undefined
    const { tipos = [], filtros = {} } = req.body || {};

    console.log('📤 Exportando:', { tipos, filtros });

    // ✅ Validar que al menos haya un tipo seleccionado
    if (tipos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe seleccionar al menos un tipo de formulario'
      });
    }

    // ✅ Construir filtros de forma segura
    const whereClauses = {};
    
    // Manejo seguro de fechas
    if (filtros && filtros.fechaInicio && filtros.fechaFin) {
      whereClauses.fechaCorte = {
        gte: new Date(filtros.fechaInicio),
        lte: new Date(filtros.fechaFin)
      };
    } else if (filtros && filtros.fechaInicio) {
      whereClauses.fechaCorte = { gte: new Date(filtros.fechaInicio) };
    } else if (filtros && filtros.fechaFin) {
      whereClauses.fechaCorte = { lte: new Date(filtros.fechaFin) };
    }

    // Otros filtros opcionales
    if (filtros && filtros.tituloMineroId && filtros.tituloMineroId !== '') {
      whereClauses.tituloMineroId = filtros.tituloMineroId;
    }

    if (filtros && filtros.mineral && filtros.mineral !== '') {
      whereClauses.mineral = filtros.mineral;
    }

    if (filtros && filtros.estado && filtros.estado !== '') {
      whereClauses.estado = filtros.estado;
    }

    // Filtro de usuario
    if (filtros && filtros.usuarioId && filtros.usuarioId !== '' && decoded.rol === 'ADMIN') {
      whereClauses.usuarioId = filtros.usuarioId;
    } else if (decoded.rol !== 'ADMIN') {
      // Si no es admin, solo ve sus datos
      whereClauses.usuarioId = decoded.id;
    }

    // Recopilar datos por tipo
    const datosPorTipo = {};
    
    for (const tipo of tipos) {
      let modelo;
      switch(tipo) {
        case 'produccion': modelo = prisma.fRIProduccion; break;
        case 'inventarios': modelo = prisma.fRIInventarios; break;
        case 'paradas': modelo = prisma.fRIParadas; break;
        case 'ejecucion': modelo = prisma.fRIEjecucion; break;
        case 'maquinaria': modelo = prisma.fRIMaquinaria; break;
        case 'regalias': modelo = prisma.fRIRegalias; break;
        default: 
          console.log(`⚠️ Tipo desconocido: ${tipo}`);
          continue;
      }

      const datos = await modelo.findMany({
        where: whereClauses,
        include: {
          usuario: { select: { nombre: true } },
          tituloMinero: { select: { numeroTitulo: true, municipio: true } }
        },
        orderBy: { fechaCorte: 'desc' }
      });

      if (datos.length > 0) {
        datosPorTipo[tipo] = datos;
        console.log(`✅ ${tipo}: ${datos.length} registros encontrados`);
      } else {
        console.log(`⚠️ ${tipo}: Sin registros`);
      }
    }

    // ✅ Validar que hay datos para exportar
    if (Object.keys(datosPorTipo).length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron datos con los filtros especificados'
      });
    }

    console.log(`📊 Total de tipos con datos: ${Object.keys(datosPorTipo).length}`);

    // Generar Excel
    const excelExporter = require('./services/simpleExporter');
    const workbook = await excelExporter.generarExcelConsolidado(datosPorTipo);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=FRI_ANM_${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('❌ Error al generar Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar Excel',
      error: error.message
    });
  }
});


// ==================== ENDPOINT PARA PDF ====================
// Si no tienes este endpoint, agrégalo después del de Excel
// Si ya lo tienes, reemplázalo con este código
// ===============================================================

app.post('/api/reportes/exportar-pdf', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token no proporcionado' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Valores por defecto
    const { tipos = [], filtros = {} } = req.body || {};

    console.log('📄 Exportando PDF:', { tipos, filtros });

    // Validar
    if (tipos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe seleccionar al menos un tipo de formulario'
      });
    }

    // Construir filtros (igual que Excel)
    const whereClauses = {};
    
    if (filtros && filtros.fechaInicio && filtros.fechaFin) {
      whereClauses.fechaCorte = {
        gte: new Date(filtros.fechaInicio),
        lte: new Date(filtros.fechaFin)
      };
    } else if (filtros && filtros.fechaInicio) {
      whereClauses.fechaCorte = { gte: new Date(filtros.fechaInicio) };
    } else if (filtros && filtros.fechaFin) {
      whereClauses.fechaCorte = { lte: new Date(filtros.fechaFin) };
    }

    if (filtros && filtros.tituloMineroId && filtros.tituloMineroId !== '') {
      whereClauses.tituloMineroId = filtros.tituloMineroId;
    }

    if (filtros && filtros.mineral && filtros.mineral !== '') {
      whereClauses.mineral = filtros.mineral;
    }

    if (filtros && filtros.estado && filtros.estado !== '') {
      whereClauses.estado = filtros.estado;
    }

    if (filtros && filtros.usuarioId && filtros.usuarioId !== '' && decoded.rol === 'ADMIN') {
      whereClauses.usuarioId = filtros.usuarioId;
    } else if (decoded.rol !== 'ADMIN') {
      whereClauses.usuarioId = decoded.id;
    }

    // Recopilar datos
    const datosPorTipo = {};
    
    for (const tipo of tipos) {
      let modelo;
      switch(tipo) {
        case 'produccion': modelo = prisma.fRIProduccion; break;
        case 'inventarios': modelo = prisma.fRIInventarios; break;
        case 'paradas': modelo = prisma.fRIParadas; break;
        case 'ejecucion': modelo = prisma.fRIEjecucion; break;
        case 'maquinaria': modelo = prisma.fRIMaquinaria; break;
        case 'regalias': modelo = prisma.fRIRegalias; break;
        default: continue;
      }

      const datos = await modelo.findMany({
        where: whereClauses,
        include: {
          usuario: { select: { nombre: true } },
          tituloMinero: { select: { numeroTitulo: true, municipio: true } }
        },
        orderBy: { fechaCorte: 'desc' }
      });

      if (datos.length > 0) {
        datosPorTipo[tipo] = datos;
      }
    }

    if (Object.keys(datosPorTipo).length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron datos con los filtros especificados'
      });
    }

    // Generar PDF
    const pdfExporter = require('./services/pdfExporter');
    const pdfBuffer = await pdfExporter.generarPDFConsolidado(datosPorTipo);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=FRI_ANM_${Date.now()}.pdf`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('❌ Error al generar PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar PDF',
      error: error.message
    });
  }
});

// Funciones auxiliares para crear hojas según formato ANM
async function crearHojaProduccionANM(workbook, datos) {
  const worksheet = workbook.addWorksheet('FRI PRODUCCIÓN');

  // Encabezado principal
  worksheet.mergeCells('A1:H1');
  const headerCell = worksheet.getCell('A1');
  headerCell.value = 'FORMULARIO DE REPORTE DE INFORMACIÓN (FRI) - PRODUCCIÓN MENSUAL';
  headerCell.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  headerCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F4E78' }
  };
  headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 25;

  // Información del título minero (del primer registro)
  const primerDato = datos[0];
  worksheet.mergeCells('A2:D2');
  worksheet.getCell('A2').value = `TÍTULO MINERO: ${primerDato.tituloMinero?.numeroTitulo || 'N/A'}`;
  worksheet.getCell('A2').font = { bold: true };

  worksheet.mergeCells('E2:H2');
  worksheet.getCell('E2').value = `MUNICIPIO: ${primerDato.tituloMinero?.municipio || 'N/A'}`;
  worksheet.getCell('E2').font = { bold: true };

  // Espacio
  worksheet.getRow(3).height = 5;

  // Encabezados de columnas
  const headers = [
    'Fecha Corte',
    'Mineral',
    'Horas Operativas',
    'Cantidad Producida',
    'Unidad',
    'Material Entra Planta',
    'Material Sale Planta',
    'Estado'
  ];

  const headerRow = worksheet.getRow(4);
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  headerRow.height = 20;

  // Datos
  let rowNum = 5;
  datos.forEach(dato => {
    const row = worksheet.getRow(rowNum);
    
    row.getCell(1).value = new Date(dato.fechaCorte).toLocaleDateString('es-CO');
    row.getCell(2).value = dato.mineral;
    row.getCell(3).value = parseFloat(dato.horasOperativas);
    row.getCell(4).value = parseFloat(dato.cantidadProduccion);
    row.getCell(5).value = dato.unidadMedida;
    row.getCell(6).value = dato.materialEntraPlanta ? parseFloat(dato.materialEntraPlanta) : '';
    row.getCell(7).value = dato.materialSalePlanta ? parseFloat(dato.materialSalePlanta) : '';
    row.getCell(8).value = dato.estado;

    // Aplicar bordes y formato
    for (let i = 1; i <= 8; i++) {
      const cell = row.getCell(i);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    rowNum++;
  });

  // Ajustar anchos de columna
  worksheet.columns = [
    { width: 12 },
    { width: 15 },
    { width: 15 },
    { width: 18 },
    { width: 12 },
    { width: 20 },
    { width: 20 },
    { width: 12 }
  ];

  // Totales
  const totalRow = worksheet.getRow(rowNum);
  totalRow.getCell(1).value = 'TOTALES';
  totalRow.getCell(1).font = { bold: true };
  totalRow.getCell(3).value = datos.reduce((sum, d) => sum + parseFloat(d.horasOperativas), 0);
  totalRow.getCell(4).value = datos.reduce((sum, d) => sum + parseFloat(d.cantidadProduccion), 0);
  
  for (let i = 1; i <= 8; i++) {
    totalRow.getCell(i).font = { bold: true };
    totalRow.getCell(i).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' }
    };
  }
}

async function crearHojaInventariosANM(workbook, datos) {
  const worksheet = workbook.addWorksheet('FRI INVENTARIOS');

  // Similar estructura a Producción
  worksheet.mergeCells('A1:G1');
  const headerCell = worksheet.getCell('A1');
  headerCell.value = 'FORMULARIO DE REPORTE DE INFORMACIÓN (FRI) - INVENTARIOS MENSUAL';
  headerCell.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  headerCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F4E78' }
  };
  headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 25;

  const primerDato = datos[0];
  worksheet.mergeCells('A2:D2');
  worksheet.getCell('A2').value = `TÍTULO MINERO: ${primerDato.tituloMinero?.numeroTitulo || 'N/A'}`;
  worksheet.getCell('A2').font = { bold: true };

  worksheet.mergeCells('E2:G2');
  worksheet.getCell('E2').value = `MUNICIPIO: ${primerDato.tituloMinero?.municipio || 'N/A'}`;
  worksheet.getCell('E2').font = { bold: true };

  worksheet.getRow(3).height = 5;

  const headers = [
    'Fecha Corte',
    'Mineral',
    'Unidad',
    'Inv. Inicial Acopio',
    'Ingreso Acopio',
    'Salida Acopio',
    'Inv. Final Acopio'
  ];

  const headerRow = worksheet.getRow(4);
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  headerRow.height = 30;

  let rowNum = 5;
  datos.forEach(dato => {
    const row = worksheet.getRow(rowNum);
    
    row.getCell(1).value = new Date(dato.fechaCorte).toLocaleDateString('es-CO');
    row.getCell(2).value = dato.mineral;
    row.getCell(3).value = dato.unidadMedida;
    row.getCell(4).value = parseFloat(dato.inventarioInicialAcopio);
    row.getCell(5).value = parseFloat(dato.ingresoAcopio);
    row.getCell(6).value = parseFloat(dato.salidaAcopio);
    row.getCell(7).value = parseFloat(dato.inventarioFinalAcopio);

    for (let i = 1; i <= 7; i++) {
      const cell = row.getCell(i);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    rowNum++;
  });

  worksheet.columns = [
    { width: 12 },
    { width: 15 },
    { width: 12 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 }
  ];
}

async function crearHojaParadasANM(workbook, datos) {
  const worksheet = workbook.addWorksheet('FRI PARADAS');

  worksheet.mergeCells('A1:G1');
  const headerCell = worksheet.getCell('A1');
  headerCell.value = 'FORMULARIO DE REPORTE DE INFORMACIÓN (FRI) - PARADAS DE PRODUCCIÓN';
  headerCell.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  headerCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F4E78' }
  };
  headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 25;

  const primerDato = datos[0];
  worksheet.mergeCells('A2:D2');
  worksheet.getCell('A2').value = `TÍTULO MINERO: ${primerDato.tituloMinero?.numeroTitulo || 'N/A'}`;
  worksheet.getCell('A2').font = { bold: true };

  worksheet.getRow(3).height = 5;

  const headers = [
    'Fecha Corte',
    'Tipo Parada',
    'Fecha Inicio',
    'Fecha Fin',
    'Horas Paradas',
    'Motivo',
    'Estado'
  ];

  const headerRow = worksheet.getRow(4);
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  let rowNum = 5;
  datos.forEach(dato => {
    const row = worksheet.getRow(rowNum);
    
    row.getCell(1).value = new Date(dato.fechaCorte).toLocaleDateString('es-CO');
    row.getCell(2).value = dato.tipoParada;
    row.getCell(3).value = new Date(dato.fechaInicio).toLocaleString('es-CO');
    row.getCell(4).value = dato.fechaFin ? new Date(dato.fechaFin).toLocaleString('es-CO') : 'En curso';
    row.getCell(5).value = parseFloat(dato.horasParadas);
    row.getCell(6).value = dato.motivo;
    row.getCell(7).value = dato.estado;

    for (let i = 1; i <= 7; i++) {
      const cell = row.getCell(i);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    rowNum++;
  });

  worksheet.columns = [
    { width: 12 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 15 },
    { width: 40 },
    { width: 12 }
  ];
}

async function crearHojaEjecucionANM(workbook, datos) {
  const worksheet = workbook.addWorksheet('FRI EJECUCIÓN');
  // Implementar estructura similar...
}

async function crearHojaMaquinariaANM(workbook, datos) {
  const worksheet = workbook.addWorksheet('FRI MAQUINARIA');
  // Implementar estructura similar...
}

async function crearHojaRegaliasANM(workbook, datos) {
  const worksheet = workbook.addWorksheet('FRI REGALÍAS');
  // Implementar estructura similar...
}


app.post('/api/reportes/exportar-pdf', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token no proporcionado' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { tipos, filtros } = req.body;

    // Construir filtros (mismo código que antes)
    const whereClauses = {};
    if (filtros.fechaInicio) whereClauses.fechaCorte = { gte: new Date(filtros.fechaInicio) };
    if (filtros.fechaFin) whereClauses.fechaCorte = { ...whereClauses.fechaCorte, lte: new Date(filtros.fechaFin) };
    if (filtros.tituloMineroId) whereClauses.tituloMineroId = filtros.tituloMineroId;
    if (filtros.mineral) whereClauses.mineral = filtros.mineral;
    if (filtros.estado) whereClauses.estado = filtros.estado;
    if (decoded.rol !== 'ADMIN') whereClauses.usuarioId = decoded.id;

    // Recopilar datos
    const datosPorTipo = {};
    
    for (const tipo of tipos) {
      let modelo;
      switch(tipo) {
        case 'produccion': modelo = prisma.fRIProduccion; break;
        case 'inventarios': modelo = prisma.fRIInventarios; break;
        case 'paradas': modelo = prisma.fRIParadas; break;
        case 'ejecucion': modelo = prisma.fRIEjecucion; break;
        case 'maquinaria': modelo = prisma.fRIMaquinaria; break;
        case 'regalias': modelo = prisma.fRIRegalias; break;
        default: continue;
      }

      const datos = await modelo.findMany({
        where: whereClauses,
        include: {
          usuario: { select: { nombre: true } },
          tituloMinero: { select: { numeroTitulo: true, municipio: true } }
        },
        orderBy: { fechaCorte: 'desc' }
      });

      if (datos.length > 0) datosPorTipo[tipo] = datos;
    }

    // Generar PDF
    const pdfBuffer = await pdfExporter.generarPDFConsolidado(datosPorTipo);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=FRI_ANM_${Date.now()}.pdf`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error al generar PDF:', error);
    res.status(500).json({ success: false, message: 'Error al generar PDF', error: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Prueba la API en: http://localhost:${PORT}/api/health`);
  console.log(`🗄️  Prueba la BD en: http://localhost:${PORT}/api/test-db`);
});