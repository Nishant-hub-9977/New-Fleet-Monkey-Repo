const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const https = require('https');
const cluster = require('cluster');
const os = require('os');
const { securityHeaders } = require('./middleware/security');
const { requestLogger, performanceMonitor, errorMonitor } = require('./middleware/monitoring');
const { logger } = require('./utils/logger');

// Load environment variables based on NODE_ENV
const environment = process.env.NODE_ENV || 'development';
const envPath = path.resolve(__dirname, `../deployment/config/${environment}/.env`);

// Check if environment-specific config exists, otherwise use default .env
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

// Initialize Express app
const app = express();

// Get port from environment variables
const PORT = process.env.PORT || 5000;
const HOST = process.env.SERVER_HOST || '0.0.0.0';

// Cluster mode for production
if (process.env.CLUSTER_MODE === 'true' && cluster.isMaster && environment === 'production') {
  const numWorkers = process.env.WORKERS === 'auto' ? os.cpus().length : Number(process.env.WORKERS) || 2;
  
  logger.info(`Setting up cluster with ${numWorkers} workers`);
  
  // Fork workers
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }
  
  // Handle worker exit and restart
  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}. Restarting...`);
    cluster.fork();
  });
} else {
  // Apply security headers middleware
  app.use(securityHeaders);
  
  // Apply monitoring middleware
  app.use(requestLogger);
  app.use(performanceMonitor);
  
  // Middleware
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  
  // API Routes
  app.use('/api/auth', require('./routes/auth.routes'));
  app.use('/api/rfq', require('./routes/rfq.routes'));
  app.use('/api/orders', require('./routes/order.routes'));
  app.use('/api/tracking', require('./routes/tracking.routes'));
  app.use('/api/google', require('./routes/googleApi.routes'));
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      environment,
      timestamp: new Date().toISOString()
    });
  });
  
  // Mock data for the prototype
  app.get('/api/orders/mock', (req, res) => {
    res.json([
      {
        id: 'ORD-2025-1234',
        status: 'in-transit',
        customer: {
          name: 'Acme Corporation',
          contact: 'John Smith',
          email: 'john@acmecorp.com',
          phone: '(555) 123-4567',
        },
        shipment: {
          trackingNumber: 'FDX123456789',
          service: 'Express',
          created: 'Apr 03, 2025',
          estimatedDelivery: 'Apr 07, 2025',
        },
        origin: {
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
        },
        destination: {
          address: '456 Market St',
          city: 'Los Angeles',
          state: 'CA',
          zip: '90001',
        },
        progress: {
          steps: [
            { id: 1, label: 'Order Created', completed: true },
            { id: 2, label: 'Picked Up', completed: true },
            { id: 3, label: 'In Transit', completed: true, current: true },
            { id: 4, label: 'Out for Delivery', completed: false },
            { id: 5, label: 'Delivered', completed: false },
          ],
          progressPercentage: 60,
        },
        trackingHistory: [
          { date: 'Apr 03, 2025 - 09:15 AM', event: 'Order created', location: 'New York, NY', completed: true },
          { date: 'Apr 03, 2025 - 02:45 PM', event: 'Picked up', location: 'New York, NY', completed: true },
          { date: 'Apr 03, 2025 - 06:30 PM', event: 'Arrived at FedEx facility', location: 'Newark, NJ', completed: true },
          { date: 'Apr 04, 2025 - 08:45 AM', event: 'Departed FedEx facility', location: 'Newark, NJ', completed: true },
          { date: 'Apr 05, 2025 - 10:20 AM', event: 'In transit', location: 'Denver, CO', completed: false },
          { date: 'Apr 07, 2025 - (Estimated)', event: 'Delivery expected', location: 'Los Angeles, CA', completed: false },
        ],
        rfqProcess: [
          { date: 'Mar 28, 2025', title: 'RFQ Received', description: 'Customer submitted RFQ via web portal' },
          { date: 'Mar 29, 2025', title: 'RFQ Validated', description: 'All required information verified' },
          { date: 'Mar 30, 2025', title: 'Quotation Generated', description: 'System generated quote based on shipment details' },
          { date: 'Mar 31, 2025', title: 'Quotation Approved', description: 'Quote approved by logistics manager' },
          { date: 'Apr 01, 2025', title: 'Quotation Sent', description: 'Quote sent to customer via email' },
          { date: 'Apr 02, 2025', title: 'Quotation Accepted', description: 'Customer accepted quote via web portal' },
          { date: 'Apr 03, 2025', title: 'Order Created', description: 'RFQ converted to order ORD-2025-1234' },
        ],
      },
      {
        id: 'ORD-2025-1233',
        status: 'delivered',
        customer: {
          name: 'TechGiant Inc',
          contact: 'Sarah Johnson',
          email: 'sarah@techgiant.com',
          phone: '(555) 987-6543',
        },
        shipment: {
          trackingNumber: 'FDX987654321',
          service: 'Standard',
          created: 'Mar 28, 2025',
          estimatedDelivery: 'Apr 02, 2025',
        },
        origin: {
          address: '789 Tech Blvd',
          city: 'Seattle',
          state: 'WA',
          zip: '98101',
        },
        destination: {
          address: '321 Innovation St',
          city: 'Austin',
          state: 'TX',
          zip: '78701',
        },
        progress: {
          steps: [
            { id: 1, label: 'Order Created', completed: true },
            { id: 2, label: 'Picked Up', completed: true },
            { id: 3, label: 'In Transit', completed: true },
            { id: 4, label: 'Out for Delivery', completed: true },
            { id: 5, label: 'Delivered', completed: true },
          ],
          progressPercentage: 100,
        },
      },
      {
        id: 'ORD-2025-1232',
        status: 'pending',
        customer: {
          name: 'Global Logistics',
          contact: 'Michael Brown',
          email: 'michael@globallogistics.com',
          phone: '(555) 456-7890',
        },
        shipment: {
          trackingNumber: 'FDX456789123',
          service: 'Economy',
          created: 'Apr 04, 2025',
          estimatedDelivery: 'Apr 10, 2025',
        },
        origin: {
          address: '567 Logistics Way',
          city: 'Chicago',
          state: 'IL',
          zip: '60601',
        },
        destination: {
          address: '890 Harbor Dr',
          city: 'Miami',
          state: 'FL',
          zip: '33101',
        },
        progress: {
          steps: [
            { id: 1, label: 'Order Created', completed: true },
            { id: 2, label: 'Picked Up', completed: false, current: true },
            { id: 3, label: 'In Transit', completed: false },
            { id: 4, label: 'Out for Delivery', completed: false },
            { id: 5, label: 'Delivered', completed: false },
          ],
          progressPercentage: 20,
        },
      },
      {
        id: 'ORD-2025-1231',
        status: 'delivered',
        customer: {
          name: 'Retail Solutions',
          contact: 'Emily Davis',
          email: 'emily@retailsolutions.com',
          phone: '(555) 234-5678',
        },
        shipment: {
          trackingNumber: 'FDX234567891',
          service: 'Priority',
          created: 'Mar 25, 2025',
          estimatedDelivery: 'Mar 30, 2025',
        },
        origin: {
          address: '432 Mountain Rd',
          city: 'Denver',
          state: 'CO',
          zip: '80201',
        },
        destination: {
          address: '765 Atlantic Ave',
          city: 'Boston',
          state: 'MA',
          zip: '02101',
        },
        progress: {
          steps: [
            { id: 1, label: 'Order Created', completed: true },
            { id: 2, label: 'Picked Up', completed: true },
            { id: 3, label: 'In Transit', completed: true },
            { id: 4, label: 'Out for Delivery', completed: true },
            { id: 5, label: 'Delivered', completed: true },
          ],
          progressPercentage: 100,
        },
      }
    ]);
  });
  
  // Serve static assets in production
  if (environment === 'production' || environment === 'staging') {
    // Set static folder
    app.use(express.static(path.join(__dirname, '../frontend/build')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, '../frontend/build', 'index.html'));
    });
  }
  
  // Error monitoring middleware
  app.use(errorMonitor);
  
  // Error handling middleware
  app.use((err, req, res, next) => {
    const logLevel = process.env.LOG_LEVEL || 'error';
    if (logLevel === 'debug' || logLevel === 'info' || logLevel === 'error') {
      logger.error(`Error handling request: ${err.message}`);
    }
    
    res.status(500).json({
      success: false,
      error: environment === 'production' ? 'Server Error' : err.message || 'Server Error',
    });
  });
  
  // Check for SSL certificates for HTTPS
  const sslEnabled = process.env.SSL_ENABLED === 'true';
  const sslKey = process.env.SSL_KEY_PATH;
  const sslCert = process.env.SSL_CERT_PATH;
  
  if (sslEnabled && sslKey && sslCert && fs.existsSync(sslKey) && fs.existsSync(sslCert)) {
    // HTTPS server
    const httpsOptions = {
      key: fs.readFileSync(sslKey),
      cert: fs.readFileSync(sslCert)
    };
    
    https.createServer(httpsOptions, app).listen(PORT, HOST, () => {
      logger.info(`HTTPS Server running on ${HOST}:${PORT}`);
      logger.info(`Environment: ${environment}`);
      logger.info(`Worker process: ${process.pid}`);
    });
  } else {
    // HTTP server (for development or when SSL is not configured)
    app.listen(PORT, HOST, () => {
      logger.info(`HTTP Server running on ${HOST}:${PORT}`);
      logger.info(`Environment: ${environment}`);
      logger.info(`Worker process: ${process.pid}`);
      
      if (environment === 'production') {
        logger.warn('WARNING: Running in production without SSL. This is not recommended for production use.');
      }
    });
  }
}

module.exports = app;
