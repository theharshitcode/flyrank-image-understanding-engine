const express = require('express');
const helmet = require('helmet');
const cors = require('cors'); const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const healthRoutes = require('./routes/healthRoutes');
const imageRoutes = require('./routes/imageRoutes');
const postRoutes = require('./routes/postRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const adminRoutes = require('./routes/adminRoutes');
const app = express(); app.use(helmet());
app.use(cors()); app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));
app.use('/api/', rateLimit({
    windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false
}
)
);
app.get('/', (_req, res) => res.json({
    name: 'FlyRank AI Image Matching Engine',
    version: '1.0.0', docs: '/docs'
}
));
app.use('/health', healthRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use((req, res) => res.status(404).json({
    error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`
    }
}));
app.use((err, _req, res, _next) => {
    const status = err.statusCode || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({
        error: { code: err.code || 'INTERNAL_ERROR', message: status === 500 ? 'Internal server error' : err.message }
    });
});
module.exports = app;
