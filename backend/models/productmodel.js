const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PRODUCT_NAME_MAX_LENGTH = 15;

const productSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: [PRODUCT_NAME_MAX_LENGTH, `Product name must be ${PRODUCT_NAME_MAX_LENGTH} characters or less.`]
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    expirationDate: {
        type: Date,
        required: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

// Index for faster queries
productSchema.index({ userId: 1, expirationDate: 1 });
productSchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model('Product', productSchema);
