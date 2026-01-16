const service = require('../services/service');
const { AppError } = require('../utils/errors');

/**
 * Get all services
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getAll = async (req, res, next) => {
  try {
    const { type, isActive, populateSpeciality } = req.query;
    
    const filter = {};
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (populateSpeciality === 'true') filter.populateSpeciality = true;
    
    const services = await service.find({ filter }, req.user);
    if (req.user.role == "SUPER_ADMIN") {
      res.json(services);
      return;
    }
    // Get user's language preference (default to 'fr' if not specified)
    const userLanguage = req.user?.language || 'fr';
    
    // Transform multi-language fields based on user's language
    const transformedServices = services.map(service => ({
      ...service,
      name: service.name?.[userLanguage] || service.name?.fr || service.name,
      description: service.description?.[userLanguage] || service.description?.fr || service.description,
      category: service.category?.[userLanguage] || service.category?.fr || service.category
    }));
    
    res.status(200).json({
      success: true,
      data: transformedServices
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get service by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { populateSpeciality } = req.query;
    
    const result = await service.findById(id, {
      populateSpeciality: populateSpeciality === 'true',
      userId: req.user?._id,
      user: req.user
    });
    if (req.user.role == "SUPER_ADMIN") {
      res.json(result);
      return;
    }
    // Get user's language preference (default to 'fr' if not specified)
    const userLanguage = req.user?.language || 'fr';
    
    // Transform multi-language fields based on user's language
    const transformedService = {
      ...service,
      name: service.name?.[userLanguage] || service.name?.fr || service.name,
      description: service.description?.[userLanguage] || service.description?.fr || service.description,
      category: service.category?.[userLanguage] || service.category?.fr || service.category
    };
    
    res.status(200).json({
      success: true,
      data: transformedService
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new service
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const create = async (req, res, next) => {
  try {
    const result = await service.create(req.body, req.user);
    
    res.status(201).json({
      success: true,
      data: result,
      message: 'Service created successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a service
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await service.updateById(id, req.body, req.user?._id);
    
    res.status(200).json({
      success: true,
      data: result,
      message: 'Service updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a service (soft delete)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await service.deleteById(id);
    
    res.status(200).json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};