#!/bin/bash

# Define base paths
MODEL_DIR="src/models"
REPO_DIR="src/repositories"
SERVICE_DIR="src/services"
MIDDLEWARE_DIR="src/middleware"
INTERFACE_DIR="src/interfaces"
ROUTE_DIR="src/routes"

# Location Model
echo "Creating Location model..."
cat <<EOT > $MODEL_DIR/location.ts
import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    latitude: { type: String },
    longitude: { type: String },
    map: { type: String },
    address: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }
});

export default mongoose.model('Location', locationSchema);
EOT

# Location Repository
echo "Creating Location repository..."
cat <<EOT > $REPO_DIR/locationRepository.ts
import Location from '../models/location';

class LocationRepository {
    async findAll() {
        return Location.find({ isDeleted: false });
    }

    async findById(id) {
        return Location.findById(id);
    }

    async create(data) {
        const location = new Location(data);
        return location.save();
    }

    async update(id, data) {
        return Location.findByIdAndUpdate(id, data, { new: true });
    }

    async delete(id) {
        return Location.findByIdAndDelete(id);
    }
}

export default new LocationRepository();
EOT

# Location Service
echo "Creating Location service..."
cat <<EOT > $SERVICE_DIR/locationService.ts
import locationRepository from '../repositories/locationRepository';

class LocationService {
    getAll() {
        return locationRepository.findAll();
    }

    getOne(id) {
        return locationRepository.findById(id);
    }

    create(data) {
        return locationRepository.create(data);
    }

    update(id, data) {
        return locationRepository.update(id, data);
    }

    delete(id) {
        return locationRepository.delete(id);
    }
}

export default new LocationService();
EOT

# Location Middleware
echo "Creating Location middleware..."
cat <<EOT > $MIDDLEWARE_DIR/locationMiddleware.ts
import { Request, Response, NextFunction } from 'express';

export function validateLocation(req: Request, res: Response, next: NextFunction) {
    const { name, address } = req.body;
    if (!name || !address) {
        res.status(400).json({ message: 'Validation Error: Missing required fields: name or address.' });
        return;
    }
    next();
}
EOT

# Location Routes
echo "Creating Location routes..."
cat <<EOT > $ROUTE_DIR/locationRoutes.ts
import express from 'express';
import locationService from '../services/locationService';
import { validateLocation } from '../middleware/locationMiddleware';

const router = express.Router();

router.get('/', async (req, res) => {
    const locations = await locationService.getAll();
    res.json(locations);
});

router.get('/:id', async (req, res) => {
    const location = await locationService.getOne(req.params.id);
    res.json(location);
});

router.post('/', validateLocation, async (req, res) => {
    const location = await locationService.create(req.body);
    res.status(201).json(location);
});

router.put('/:id', validateLocation, async (req, res) => {
    const location = await locationService.update(req.params.id, req.body);
    res.json(location);
});

router.delete('/:id', async (req, res) => {
    await locationService.delete(req.params.id);
    res.status(204).end();
});

export default router;
EOT

# Location Interface (TypeScript)
echo "Creating TypeScript interface for Location..."
cat <<EOT > $INTERFACE_DIR/locationInterface.ts
export interface ILocation {
    _id?: string;
    name: string;
    description?: string;
    latitude?: string;
    longitude?: string;
    map?: string;
    address: string;
    isActive: boolean;
    isDeleted: boolean;
}
EOT

echo "All Location components have been generated successfully."
