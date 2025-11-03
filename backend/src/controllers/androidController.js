// backend/src/controllers/androidController.js
// Controlador para la aplicación Android de registro de producción

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================
// 1. OBTENER PUNTOS DE REFERENCIA POR TÍTULO MINERO
// ============================================
const getPuntosReferencia = async (req, res) => {
  try {
    const { tituloMineroId } = req.params;

    const puntos = await prisma.puntoReferencia.findMany({
      where: {
        tituloMineroId: tituloMineroId,
        activo: true
      },
      orderBy: {
        orden: 'asc'
      }
    });

    res.json({
      success: true,
      data: puntos
    });
  } catch (error) {
    console.error('Error al obtener puntos de referencia:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener puntos de referencia',
      error: error.message
    });
  }
};

// ============================================
// 2. INICIAR SESIÓN DE REGISTRO
// ============================================
const iniciarSesionRegistro = async (req, res) => {
  try {
    const { usuarioId, tituloMineroId, tipoMaquina, capacidadMaxM3 } = req.body;

    // Validar que el usuario existe
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { tituloMinero: true }
    });

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Obtener los puntos de referencia
    const puntos = await prisma.puntoReferencia.findMany({
      where: {
        tituloMineroId: tituloMineroId,
        activo: true
      },
      orderBy: { orden: 'asc' }
    });

    if (puntos.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren al menos 2 puntos de referencia (Recolección y Acopio)'
      });
    }

    // Crear sesión de registro
    const sesion = {
      usuarioId,
      tituloMineroId,
      tipoMaquina,
      capacidadMaxM3,
      fechaInicio: new Date(),
      puntos: puntos,
      numeroCiclosCompletados: 0
    };

    res.json({
      success: true,
      message: 'Sesión de registro iniciada',
      data: sesion
    });
  } catch (error) {
    console.error('Error al iniciar sesión de registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión de registro',
      error: error.message
    });
  }
};

// ============================================
// 3. REGISTRAR UN CICLO COMPLETADO
// ============================================
const registrarCiclo = async (req, res) => {
  try {
    const {
      usuarioId,
      tituloMineroId,
      tipoMaquina,
      capacidadMaxM3,
      numeroCiclo,
      horaInicioCiclo,
      horaFinCiclo,
      latitudInicio,
      longitudInicio,
      latitudFin,
      longitudFin,
      puntoRecoleccion,
      puntoAcopio,
      distanciaRecorrida,
      observaciones
    } = req.body;

    // Calcular duración en minutos
    const inicio = new Date(horaInicioCiclo);
    const fin = new Date(horaFinCiclo);
    const duracionMinutos = (fin - inicio) / (1000 * 60);

    // Crear el registro del ciclo
    const ciclo = await prisma.registroCicloProduccion.create({
      data: {
        usuarioId,
        tituloMineroId,
        tipoMaquina,
        capacidadMaxM3: parseFloat(capacidadMaxM3),
        numeroCiclo: parseInt(numeroCiclo),
        horaInicioCiclo: new Date(horaInicioCiclo),
        horaFinCiclo: new Date(horaFinCiclo),
        duracionMinutos: parseFloat(duracionMinutos.toFixed(2)),
        latitudInicio: parseFloat(latitudInicio),
        longitudInicio: parseFloat(longitudInicio),
        latitudFin: parseFloat(latitudFin),
        longitudFin: parseFloat(longitudFin),
        puntoRecoleccion,
        puntoAcopio,
        distanciaRecorrida: distanciaRecorrida ? parseFloat(distanciaRecorrida) : null,
        estadoCiclo: 'COMPLETADO',
        observaciones: observaciones || null
      }
    });

    res.json({
      success: true,
      message: 'Ciclo registrado exitosamente',
      data: ciclo
    });
  } catch (error) {
    console.error('Error al registrar ciclo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar ciclo',
      error: error.message
    });
  }
};

// ============================================
// 4. OBTENER REGISTROS DE CICLOS DEL DÍA
// ============================================
const getCiclosDelDia = async (req, res) => {
  try {
    const { usuarioId, tituloMineroId } = req.params;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const ciclos = await prisma.registroCicloProduccion.findMany({
      where: {
        usuarioId,
        tituloMineroId,
        fecha: {
          gte: hoy
        }
      },
      orderBy: {
        numeroCiclo: 'asc'
      }
    });

    res.json({
      success: true,
      totalCiclos: ciclos.length,
      data: ciclos
    });
  } catch (error) {
    console.error('Error al obtener ciclos del día:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ciclos del día',
      error: error.message
    });
  }
};

// ============================================
// 5. OBTENER ESTADÍSTICAS DE PRODUCCIÓN
// ============================================
const getEstadisticasProduccion = async (req, res) => {
  try {
    const { usuarioId, tituloMineroId } = req.params;
    const { fechaInicio, fechaFin } = req.query;

    const whereClause = {
      usuarioId,
      tituloMineroId
    };

    if (fechaInicio && fechaFin) {
      whereClause.fecha = {
        gte: new Date(fechaInicio),
        lte: new Date(fechaFin)
      };
    }

    const ciclos = await prisma.registroCicloProduccion.findMany({
      where: whereClause
    });

    // Calcular estadísticas
    const totalCiclos = ciclos.length;
    const tiempoTotalMinutos = ciclos.reduce((sum, c) => sum + parseFloat(c.duracionMinutos), 0);
    const distanciaTotal = ciclos.reduce((sum, c) => sum + (parseFloat(c.distanciaRecorrida) || 0), 0);
    const promedioTiempoCiclo = totalCiclos > 0 ? tiempoTotalMinutos / totalCiclos : 0;

    res.json({
      success: true,
      data: {
        totalCiclos,
        tiempoTotalMinutos: tiempoTotalMinutos.toFixed(2),
        tiempoTotalHoras: (tiempoTotalMinutos / 60).toFixed(2),
        distanciaTotal: distanciaTotal.toFixed(2),
        promedioTiempoCiclo: promedioTiempoCiclo.toFixed(2),
        ciclos: ciclos
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};

// ============================================
// 6. REGISTRAR MÚLTIPLES CICLOS (Batch)
// ============================================
const registrarCiclosBatch = async (req, res) => {
  try {
    const { ciclos } = req.body;

    if (!Array.isArray(ciclos) || ciclos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de ciclos'
      });
    }

    // Procesar cada ciclo
    const ciclosCreados = await prisma.$transaction(
      ciclos.map(ciclo => {
        const inicio = new Date(ciclo.horaInicioCiclo);
        const fin = new Date(ciclo.horaFinCiclo);
        const duracionMinutos = (fin - inicio) / (1000 * 60);

        return prisma.registroCicloProduccion.create({
          data: {
            usuarioId: ciclo.usuarioId,
            tituloMineroId: ciclo.tituloMineroId,
            tipoMaquina: ciclo.tipoMaquina,
            capacidadMaxM3: parseFloat(ciclo.capacidadMaxM3),
            numeroCiclo: parseInt(ciclo.numeroCiclo),
            horaInicioCiclo: new Date(ciclo.horaInicioCiclo),
            horaFinCiclo: new Date(ciclo.horaFinCiclo),
            duracionMinutos: parseFloat(duracionMinutos.toFixed(2)),
            latitudInicio: parseFloat(ciclo.latitudInicio),
            longitudInicio: parseFloat(ciclo.longitudInicio),
            latitudFin: parseFloat(ciclo.latitudFin),
            longitudFin: parseFloat(ciclo.longitudFin),
            puntoRecoleccion: ciclo.puntoRecoleccion,
            puntoAcopio: ciclo.puntoAcopio,
            distanciaRecorrida: ciclo.distanciaRecorrida ? parseFloat(ciclo.distanciaRecorrida) : null,
            estadoCiclo: 'COMPLETADO',
            observaciones: ciclo.observaciones || null
          }
        });
      })
    );

    res.json({
      success: true,
      message: `${ciclosCreados.length} ciclos registrados exitosamente`,
      data: ciclosCreados
    });
  } catch (error) {
    console.error('Error al registrar ciclos batch:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar ciclos batch',
      error: error.message
    });
  }
};

module.exports = {
  getPuntosReferencia,
  iniciarSesionRegistro,
  registrarCiclo,
  getCiclosDelDia,
  getEstadisticasProduccion,
  registrarCiclosBatch
};